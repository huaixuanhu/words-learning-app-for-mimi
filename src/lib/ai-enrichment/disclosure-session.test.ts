import { describe, expect, it } from "vitest";
import {
  AI_DISCLOSURE_SESSION_COOKIE,
  aiDisclosureSessionCookie,
  createAiDisclosureSessionToken,
  hashAiDisclosureSessionToken,
  readAiDisclosureSessionToken,
} from "./disclosure-session";

describe("V2-7B-1 disclosure session", () => {
  it("keeps the random raw token in an HttpOnly Strict session cookie", () => {
    const token = createAiDisclosureSessionToken();
    const cookie = aiDisclosureSessionCookie(token, true);

    expect(token).toHaveLength(43);
    expect(cookie).toContain(`${AI_DISCLOSURE_SESSION_COOKIE}=${token}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Secure");
    expect(cookie).not.toContain("Max-Age");
    expect(readAiDisclosureSessionToken(`theme=dark; ${cookie}`)).toBe(token);
  });

  it("rejects tampered tokens and stores only a stable digest", () => {
    const token = createAiDisclosureSessionToken();
    expect(hashAiDisclosureSessionToken(token)).toHaveLength(64);
    expect(hashAiDisclosureSessionToken(token)).not.toContain(token);
    expect(readAiDisclosureSessionToken(`${AI_DISCLOSURE_SESSION_COOKIE}=tampered`))
      .toBeNull();
  });
});
