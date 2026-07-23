import { getVercelOidcToken } from "@vercel/functions/oidc";
import { ExternalAccountClient, GoogleAuth } from "google-auth-library";
import { GOOGLE_STANDARD_VOICE_CONTRACT } from "./contract";
import { TtsProviderError, type TtsProvider } from "./provider";
import {
  TTS_GOOGLE_PROJECT_ID,
  type TtsVercelWifIdentity,
} from "./runtime-config";

const GOOGLE_TTS_SYNTHESIZE_URL =
  "https://texttospeech.googleapis.com/v1/text:synthesize";
const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

type ProviderFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

type GoogleTtsResponse = Readonly<{
  audioContent?: unknown;
}>;

function validBase64(value: string) {
  return value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/u.test(value);
}

function createAdcAccessTokenResolver() {
  const auth = new GoogleAuth({
    projectId: TTS_GOOGLE_PROJECT_ID,
    scopes: [CLOUD_PLATFORM_SCOPE],
  });
  return async () => {
    const token = await auth.getAccessToken();
    if (!token) throw new TtsProviderError("credentials_unavailable");
    return token;
  };
}

type ExternalAccessTokenClient = Readonly<{
  getAccessToken: () => Promise<Readonly<{ token?: string | null }>>;
}>;

type ExternalAccountOptions = Parameters<typeof ExternalAccountClient.fromJSON>[0];

function credentialExchangeCategory(error: unknown) {
  if (error instanceof TtsProviderError) return error.category;
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    typeof error.response.status === "number"
  ) {
    if (
      "data" in error.response &&
      typeof error.response.data === "object" &&
      error.response.data !== null
    ) {
      const data = error.response.data;
      const description =
        "error_description" in data && typeof data.error_description === "string"
          ? data.error_description.toLowerCase()
          : "";
      if (description.includes("attribute condition")) {
        return "wif_attribute_condition_rejected";
      }
      if (description.includes("audience")) return "wif_audience_rejected";
      if (description.includes("issuer")) return "wif_issuer_rejected";
      const code =
        "error" in data && typeof data.error === "string" ? data.error : "";
      if (
        [
          "access_denied",
          "invalid_grant",
          "invalid_request",
          "invalid_target",
          "unauthorized_client",
        ].includes(code)
      ) {
        return `wif_exchange_${code}`;
      }
    }
    return `wif_exchange_http_${error.response.status}`;
  }
  return "wif_exchange_failed";
}

export function createVercelWifAccessTokenResolver(
  identity: TtsVercelWifIdentity,
  dependencies: Readonly<{
    getOidcToken?: (options: { audience: string }) => Promise<string>;
    createExternalClient?: (
      options: ExternalAccountOptions,
    ) => ExternalAccessTokenClient | null;
  }> = {},
) {
  const stsAudience = identity.audience.replace(
    "https://iam.googleapis.com/",
    "//iam.googleapis.com/",
  );
  const getOidcToken = dependencies.getOidcToken ?? getVercelOidcToken;
  const createExternalClient =
    dependencies.createExternalClient ??
    ((options: ExternalAccountOptions) => ExternalAccountClient.fromJSON(options));
  let client: ExternalAccessTokenClient | null | undefined;
  return async () => {
    if (client === undefined) {
      client = createExternalClient({
        type: "external_account",
        audience: stsAudience,
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        token_url: "https://sts.googleapis.com/v1/token",
        service_account_impersonation_url:
          "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
          `${identity.serviceAccountEmail}:generateAccessToken`,
        scopes: [CLOUD_PLATFORM_SCOPE],
        subject_token_supplier: {
          getSubjectToken: async () => {
            try {
              return await getOidcToken({ audience: identity.audience });
            } catch {
              throw new TtsProviderError("vercel_oidc_unavailable");
            }
          },
        },
      });
    }
    if (!client) throw new TtsProviderError("credentials_unavailable");
    let response: Awaited<ReturnType<ExternalAccessTokenClient["getAccessToken"]>>;
    try {
      response = await client.getAccessToken();
    } catch (error) {
      throw new TtsProviderError(credentialExchangeCategory(error));
    }
    if (!response.token) throw new TtsProviderError("credentials_unavailable");
    return response.token;
  };
}

export function createGoogleCloudTtsProvider(
  dependencies: Readonly<{
    resolveAuthorization?: () => Promise<string>;
    fetchFn?: ProviderFetch;
  }> = {},
): TtsProvider {
  const resolveAuthorization =
    dependencies.resolveAuthorization ?? createAdcAccessTokenResolver();
  const fetchFn = dependencies.fetchFn ?? fetch;

  return {
    source: "google-cloud-standard",
    voice: GOOGLE_STANDARD_VOICE_CONTRACT,
    async synthesize({ normalizedText, signal }) {
      let accessToken: string;
      try {
        accessToken = await resolveAuthorization();
      } catch (error) {
        if (error instanceof TtsProviderError) throw error;
        throw new TtsProviderError("credentials_unavailable");
      }

      let response: Response;
      try {
        response = await fetchFn(GOOGLE_TTS_SYNTHESIZE_URL, {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
            "x-goog-user-project": TTS_GOOGLE_PROJECT_ID,
          },
          body: JSON.stringify({
            input: { text: normalizedText },
            voice: {
              languageCode: GOOGLE_STANDARD_VOICE_CONTRACT.languageCode,
              name: GOOGLE_STANDARD_VOICE_CONTRACT.voiceName,
            },
            audioConfig: {
              audioEncoding: GOOGLE_STANDARD_VOICE_CONTRACT.audioEncoding,
              speakingRate: GOOGLE_STANDARD_VOICE_CONTRACT.speakingRate,
              pitch: GOOGLE_STANDARD_VOICE_CONTRACT.pitch,
            },
          }),
          signal,
        });
      } catch {
        if (signal.aborted && signal.reason instanceof Error) throw signal.reason;
        throw new TtsProviderError("provider_network_failed");
      }

      if (!response.ok) {
        throw new TtsProviderError(`provider_http_${response.status}`);
      }

      let body: GoogleTtsResponse;
      try {
        body = (await response.json()) as GoogleTtsResponse;
      } catch {
        throw new TtsProviderError("provider_response_invalid");
      }
      if (typeof body.audioContent !== "string" || !validBase64(body.audioContent)) {
        throw new TtsProviderError("provider_audio_invalid");
      }

      return {
        audio: Uint8Array.from(Buffer.from(body.audioContent, "base64")),
        contentType: "audio/mpeg",
        providerRequestId:
          response.headers.get("x-request-id") ??
          response.headers.get("x-guploader-uploadid"),
      };
    },
  };
}
