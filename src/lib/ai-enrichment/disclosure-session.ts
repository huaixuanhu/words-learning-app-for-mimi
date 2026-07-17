import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const AI_DISCLOSURE_SESSION_COOKIE = "mimi_ai_disclosure_session_v1";
const AI_DISCLOSURE_SESSION_BYTES = 32;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

export function createAiDisclosureSessionToken() {
  return randomBytes(AI_DISCLOSURE_SESSION_BYTES).toString("base64url");
}

export function isValidAiDisclosureSessionToken(value: string | null | undefined) {
  return typeof value === "string" && SESSION_TOKEN_PATTERN.test(value);
}

export function hashAiDisclosureSessionToken(token: string) {
  if (!isValidAiDisclosureSessionToken(token)) {
    throw new Error("AI disclosure session token is invalid");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function readAiDisclosureSessionToken(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const name = pair.slice(0, separator).trim();
    if (name !== AI_DISCLOSURE_SESSION_COOKIE) continue;
    const token = pair.slice(separator + 1).trim();
    return isValidAiDisclosureSessionToken(token) ? token : null;
  }
  return null;
}

export function aiDisclosureSessionCookie(token: string, secure: boolean) {
  if (!isValidAiDisclosureSessionToken(token)) {
    throw new Error("AI disclosure session token is invalid");
  }
  return [
    `${AI_DISCLOSURE_SESSION_COOKIE}=${token}`,
    "Path=/api/ai",
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : null,
  ].filter(Boolean).join("; ");
}

export function aiDisclosureSessionHashesEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
