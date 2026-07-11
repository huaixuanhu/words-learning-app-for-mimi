import { describe, expect, it } from "vitest";
import { requireProductionBasicAuth } from "./production-basic-auth";

const validAuthorization = `Basic ${Buffer.from("mimi:correct horse battery staple").toString("base64")}`;

function request(authorization?: string) {
  return new Request("https://mimi.example", {
    headers: authorization ? { authorization } : undefined,
  });
}

const productionEnv = {
  VERCEL_ENV: "production",
  MIMI_BASIC_AUTH_USER: "mimi",
  MIMI_BASIC_AUTH_PASSWORD: "correct horse battery staple",
};

describe("Production Basic Auth", () => {
  it("is disabled outside Vercel Production", () => {
    expect(
      requireProductionBasicAuth(request(), {
        ...productionEnv,
        VERCEL_ENV: "preview",
      }),
    ).toBeNull();
  });

  it("fails closed when Production credentials are missing", () => {
    const response = requireProductionBasicAuth(request(), {
      VERCEL_ENV: "production",
    });

    expect(response?.status).toBe(503);
    expect(response?.headers.get("cache-control")).toBe("no-store");
  });

  it("challenges missing or invalid credentials", () => {
    const missingResponse = requireProductionBasicAuth(request(), productionEnv);
    const invalidResponse = requireProductionBasicAuth(
      request(`Basic ${Buffer.from("mimi:wrong").toString("base64")}`),
      productionEnv,
    );

    expect(missingResponse?.status).toBe(401);
    expect(invalidResponse?.status).toBe(401);
    expect(missingResponse?.headers.get("www-authenticate")).toContain("Mimi Vocabulary");
  });

  it("accepts the exact configured credentials", () => {
    expect(requireProductionBasicAuth(request(validAuthorization), productionEnv)).toBeNull();
  });
});
