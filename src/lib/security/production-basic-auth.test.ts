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
  MIMI_PRODUCTION_CUTOVER_MODE: "live",
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

  it("blocks matched app and API requests during the bounded maintenance window", async () => {
    const response = requireProductionBasicAuth(request(validAuthorization), {
      ...productionEnv,
      MIMI_PRODUCTION_CUTOVER_MODE: "maintenance",
    });

    expect(response?.status).toBe(503);
    expect(response?.headers.get("retry-after")).toBe("60");
    expect(response?.headers.get("cache-control")).toBe("no-store");
    await expect(response?.text()).resolves.toBe(
      "A short update is in progress. Please try again soon.",
    );
  });

  it("ignores the cutover mode outside Vercel Production", () => {
    expect(
      requireProductionBasicAuth(request(), {
        ...productionEnv,
        VERCEL_ENV: "preview",
        MIMI_PRODUCTION_CUTOVER_MODE: "maintenance",
      }),
    ).toBeNull();
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

  it("keeps authentication ahead of maintenance and unknown cutover modes", () => {
    const maintenance = {
      ...productionEnv,
      MIMI_PRODUCTION_CUTOVER_MODE: "maintenance",
    };
    expect(requireProductionBasicAuth(request(), maintenance)?.status).toBe(401);
    expect(
      requireProductionBasicAuth(request(validAuthorization), {
        ...productionEnv,
        MIMI_PRODUCTION_CUTOVER_MODE: "unknown",
      })?.status,
    ).toBe(503);
    expect(
      requireProductionBasicAuth(request(validAuthorization), {
        ...productionEnv,
        MIMI_PRODUCTION_CUTOVER_MODE: undefined,
      })?.status,
    ).toBe(503);
  });

  it("accepts the exact configured credentials", () => {
    expect(requireProductionBasicAuth(request(validAuthorization), productionEnv)).toBeNull();
  });
});
