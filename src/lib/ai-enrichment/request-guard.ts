export const AI_ROUTE_MAX_BODY_BYTES = 4_096;

export class AiRouteRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AiRouteRequestError";
    this.code = code;
    this.status = status;
  }
}

function contentTypeIsJson(value: string | null) {
  return value?.split(";", 1)[0]?.trim().toLocaleLowerCase("en-US") === "application/json";
}

export async function parseStrictSameOriginJson(
  request: Request,
  maximumBodyBytes = AI_ROUTE_MAX_BODY_BYTES,
) {
  if (!contentTypeIsJson(request.headers.get("content-type"))) {
    throw new AiRouteRequestError(
      "json_content_type_required",
      "AI requests require JSON content.",
      415,
    );
  }

  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (!origin || origin !== requestOrigin) {
    throw new AiRouteRequestError(
      "same_origin_required",
      "AI requests must come from this app.",
      403,
    );
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    throw new AiRouteRequestError(
      "same_origin_required",
      "AI requests must come from this app.",
      403,
    );
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      throw new AiRouteRequestError("invalid_content_length", "The request size is invalid.");
    }
    if (parsedLength > maximumBodyBytes) {
      throw new AiRouteRequestError("body_too_large", "The AI request is too large.", 413);
    }
  }

  if (!request.body) {
    throw new AiRouteRequestError("body_required", "The AI request is empty.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    totalBytes += chunk.value.byteLength;
    if (totalBytes > maximumBodyBytes) {
      await reader.cancel();
      throw new AiRouteRequestError("body_too_large", "The AI request is too large.", 413);
    }
    chunks.push(chunk.value);
  }
  if (totalBytes === 0) {
    throw new AiRouteRequestError("body_required", "The AI request is empty.");
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new AiRouteRequestError("invalid_utf8", "The AI request text is invalid.");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AiRouteRequestError("invalid_json", "The AI request is not valid JSON.");
  }
}
