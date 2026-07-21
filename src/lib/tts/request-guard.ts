import { TTS_MAX_REQUEST_BYTES, TtsContractError } from "./contract";

function isJson(value: string | null) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function hostHeaderOrigin(request: Request) {
  const host = request.headers.get("host");
  if (!host || !/^[A-Za-z0-9.:[\]-]+(?::\d+)?$/u.test(host)) return null;
  try {
    return new URL(`${new URL(request.url).protocol}//${host}`).origin;
  } catch {
    return null;
  }
}

export async function parseStrictTtsJson(request: Request) {
  if (!isJson(request.headers.get("content-type"))) {
    throw new TtsContractError(
      "json_content_type_required",
      "Voice requests require JSON content.",
      415,
    );
  }
  const requestOrigin = new URL(request.url).origin;
  const publicRequestOrigin = hostHeaderOrigin(request);
  const origin = request.headers.get("origin");
  if (!origin || (origin !== requestOrigin && origin !== publicRequestOrigin)) {
    throw new TtsContractError(
      "same_origin_required",
      "Voice requests must come from this app.",
      403,
    );
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    throw new TtsContractError(
      "same_origin_required",
      "Voice requests must come from this app.",
      403,
    );
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new TtsContractError("content_length_invalid", "This voice request is invalid.");
    }
    if (length > TTS_MAX_REQUEST_BYTES) {
      throw new TtsContractError("body_too_large", "This voice request is too large.", 413);
    }
  }
  if (!request.body) {
    throw new TtsContractError("body_required", "This voice request is empty.");
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.byteLength) {
    throw new TtsContractError("body_required", "This voice request is empty.");
  }
  if (bytes.byteLength > TTS_MAX_REQUEST_BYTES) {
    throw new TtsContractError("body_too_large", "This voice request is too large.", 413);
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new TtsContractError("invalid_utf8", "This voice request is invalid.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new TtsContractError("invalid_json", "This voice request is not valid JSON.");
  }
}
