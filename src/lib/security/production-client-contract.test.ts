import { describe, expect, it } from "vitest";
import { requireV2ProductionClientContract } from "./production-client-contract";
import {
  V2_CLIENT_CONTRACT_HEADER,
  V2_CLIENT_CONTRACT_VERSION,
} from "./v2-client-contract";

const production = {
  VERCEL_ENV: "production",
  MIMI_PRODUCTION_CUTOVER_MODE: "live",
} as const;

function request(method: string, version?: string) {
  return new Request("https://mimi.example/api/storage/data", {
    method,
    headers: version
      ? { [V2_CLIENT_CONTRACT_HEADER]: version }
      : undefined,
  });
}

describe("V2 Production client contract", () => {
  it("allows reads without treating the version marker as authentication", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(
        requireV2ProductionClientContract(request(method), production),
      ).toBeNull();
    }
  });

  it("rejects missing and stale mutation clients in Production", async () => {
    for (const version of [undefined, "v1-schema5", "v2-schema5"]) {
      const response = requireV2ProductionClientContract(
        request("POST", version),
        production,
      );

      expect(response?.status).toBe(409);
      expect(response?.headers.get("cache-control")).toBe("no-store");
      await expect(response?.json()).resolves.toMatchObject({
        reason: "client-upgrade-required",
      });
    }
  });

  it("allows only the exact V2 Schema 6 mutation marker", () => {
    expect(
      requireV2ProductionClientContract(
        request("POST", V2_CLIENT_CONTRACT_VERSION),
        production,
      ),
    ).toBeNull();
  });

  it("keeps every mutation closed before the explicit live mode", async () => {
    for (const mode of [undefined, "maintenance", "schema6-readiness", "unknown"]) {
      const response = requireV2ProductionClientContract(
        request("POST", V2_CLIENT_CONTRACT_VERSION),
        {
          VERCEL_ENV: "production",
          MIMI_PRODUCTION_CUTOVER_MODE: mode,
        },
      );

      expect(response?.status).toBe(503);
      expect(response?.headers.get("retry-after")).toBe("60");
      await expect(response?.json()).resolves.toMatchObject({
        reason: "write-window-active",
      });
    }
  });

  it("does not impose the Production cutover marker on Preview or local writes", () => {
    expect(
      requireV2ProductionClientContract(request("POST"), {
        VERCEL_ENV: "preview",
      }),
    ).toBeNull();
    expect(requireV2ProductionClientContract(request("POST"), {})).toBeNull();
  });
});
