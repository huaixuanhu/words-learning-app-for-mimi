import { GoogleAuth } from "google-auth-library";
import { GOOGLE_STANDARD_VOICE_CONTRACT } from "./contract";
import { TtsProviderError, type TtsProvider } from "./provider";
import { TTS_GOOGLE_PROJECT_ID } from "./runtime-config";

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
