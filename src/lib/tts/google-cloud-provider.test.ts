import { describe, expect, it, vi } from "vitest";
import { GOOGLE_STANDARD_VOICE_CONTRACT } from "./contract";
import {
  createGoogleCloudTtsProvider,
  createVercelWifAccessTokenResolver,
} from "./google-cloud-provider";
import { TTS_GOOGLE_PROJECT_ID } from "./runtime-config";

describe("Google Cloud Standard TTS provider", () => {
  it("sends only the normalized text and the pinned Standard-C voice contract", async () => {
    const audio = Buffer.from("test-mp3").toString("base64");
    const calls: Array<Readonly<{ input: string | URL; init?: RequestInit }>> = [];
    const fetchFn = async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ audioContent: audio }), {
        status: 200,
        headers: { "x-request-id": "provider-request" },
      });
    };
    const provider = createGoogleCloudTtsProvider({
      resolveAuthorization: async () => "short-lived-token",
      fetchFn,
    });

    const result = await provider.synthesize({
      normalizedText: "mitigate",
      signal: new AbortController().signal,
    });

    expect(provider.voice).toBe(GOOGLE_STANDARD_VOICE_CONTRACT);
    expect(result.audio).toEqual(Uint8Array.from(Buffer.from("test-mp3")));
    expect(result.providerRequestId).toBe("provider-request");
    expect(calls).toHaveLength(1);
    const { input: url, init } = calls[0];
    expect(url).toBe("https://texttospeech.googleapis.com/v1/text:synthesize");
    expect(init?.headers).toEqual({
      authorization: "Bearer short-lived-token",
      "content-type": "application/json",
      "x-goog-user-project": TTS_GOOGLE_PROJECT_ID,
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      input: { text: "mitigate" },
      voice: { languageCode: "en-AU", name: "en-AU-Standard-C" },
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.9, pitch: 0 },
    });
  });

  it("does not surface provider bodies, access tokens or study text", async () => {
    const provider = createGoogleCloudTtsProvider({
      resolveAuthorization: async () => "secret-token",
      fetchFn: async () =>
        new Response("provider says mitigate secret-token", { status: 403 }),
    });

    await expect(
      provider.synthesize({
        normalizedText: "mitigate",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      category: "provider_http_403",
      message: "Voice unavailable · Try again",
    });
  });

  it("exchanges the exact Vercel Preview audience for a short-lived service-account token", async () => {
    const identity = {
      audience:
        "https://iam.googleapis.com/projects/123456789012/locations/global/" +
        "workloadIdentityPools/mimi-vercel-preview/providers/mimi-v2-preview",
      projectNumber: "123456789012",
      serviceAccountEmail:
        "mimi-tts-preview@for-tts-502913.iam.gserviceaccount.com",
      workloadIdentityPoolId: "mimi-vercel-preview",
      workloadIdentityProviderId: "mimi-v2-preview",
    };
    const getOidcToken = vi.fn(async () => "short-lived-vercel-oidc");
    let externalOptions: Record<string, unknown> | undefined;
    const getAccessToken = vi.fn(async () => ({ token: "short-lived-google-token" }));
    const resolver = createVercelWifAccessTokenResolver(identity, {
      getOidcToken,
      createExternalClient: (options) => {
        externalOptions = options as unknown as Record<string, unknown>;
        return { getAccessToken };
      },
    });

    await expect(resolver()).resolves.toBe("short-lived-google-token");
    expect(getAccessToken).toHaveBeenCalledOnce();
    expect(externalOptions).toMatchObject({
      type: "external_account",
      audience: identity.audience,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    expect(externalOptions?.service_account_impersonation_url).toBe(
      "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
        "mimi-tts-preview@for-tts-502913.iam.gserviceaccount.com:generateAccessToken",
    );
    const supplier = externalOptions?.subject_token_supplier as {
      getSubjectToken: () => Promise<string>;
    };
    await expect(supplier.getSubjectToken()).resolves.toBe("short-lived-vercel-oidc");
    expect(getOidcToken).toHaveBeenCalledWith({ audience: identity.audience });
  });

  it("records a bounded category when Vercel cannot issue the OIDC token", async () => {
    const identity = {
      audience:
        "https://iam.googleapis.com/projects/123456789012/locations/global/" +
        "workloadIdentityPools/mimi-vercel-preview/providers/mimi-v2-preview",
      projectNumber: "123456789012",
      serviceAccountEmail:
        "mimi-tts-preview@for-tts-502913.iam.gserviceaccount.com",
      workloadIdentityPoolId: "mimi-vercel-preview",
      workloadIdentityProviderId: "mimi-v2-preview",
    };
    const resolver = createVercelWifAccessTokenResolver(identity, {
      getOidcToken: async () => {
        throw new Error("secret-bearing provider detail");
      },
      createExternalClient: (options) => {
        const supplier = (options as unknown as Record<string, unknown>)
          .subject_token_supplier as { getSubjectToken: () => Promise<string> };
        return { getAccessToken: async () => ({ token: await supplier.getSubjectToken() }) };
      },
    });

    await expect(resolver()).rejects.toMatchObject({
      category: "vercel_oidc_unavailable",
      message: "Voice unavailable · Try again",
    });
  });

  it("records only the credential-exchange HTTP status", async () => {
    const identity = {
      audience:
        "https://iam.googleapis.com/projects/123456789012/locations/global/" +
        "workloadIdentityPools/mimi-vercel-preview/providers/mimi-v2-preview",
      projectNumber: "123456789012",
      serviceAccountEmail:
        "mimi-tts-preview@for-tts-502913.iam.gserviceaccount.com",
      workloadIdentityPoolId: "mimi-vercel-preview",
      workloadIdentityProviderId: "mimi-v2-preview",
    };
    const resolver = createVercelWifAccessTokenResolver(identity, {
      createExternalClient: () => ({
        getAccessToken: async () => {
          throw { response: { status: 403, data: "secret response" } };
        },
      }),
    });

    await expect(resolver()).rejects.toMatchObject({
      category: "wif_exchange_http_403",
      message: "Voice unavailable · Try again",
    });
  });

  it("maps only approved WIF failure reasons without retaining the response", async () => {
    const identity = {
      audience:
        "https://iam.googleapis.com/projects/123456789012/locations/global/" +
        "workloadIdentityPools/mimi-vercel-preview/providers/mimi-v2-preview",
      projectNumber: "123456789012",
      serviceAccountEmail:
        "mimi-tts-preview@for-tts-502913.iam.gserviceaccount.com",
      workloadIdentityPoolId: "mimi-vercel-preview",
      workloadIdentityProviderId: "mimi-v2-preview",
    };
    const resolver = createVercelWifAccessTokenResolver(identity, {
      createExternalClient: () => ({
        getAccessToken: async () => {
          throw {
            response: {
              status: 400,
              data: {
                error: "invalid_grant",
                error_description:
                  "The given credential is rejected by the attribute condition. secret",
              },
            },
          };
        },
      }),
    });

    await expect(resolver()).rejects.toMatchObject({
      category: "wif_attribute_condition_rejected",
      message: "Voice unavailable · Try again",
    });
  });
});
