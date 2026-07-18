// Next.js canonicalizes the local production server origin to localhost even
// when the listener is bound to 127.0.0.1. The route itself still accepts only
// loopback hostnames.
const BASE_URL = "http://localhost:3001";
const DISCLOSURE_VERSION = "ai-disclosure-v3";
const ADAPT_ITEM_ID = "00000000-0000-4000-8000-000000007c02";
const MITIGATE_ITEM_ID = "00000000-0000-4000-8000-000000007c03";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the local provider proof`);
  return value;
}

const BASIC_AUTHORIZATION = `Basic ${Buffer.from(
  `${requiredEnv("MIMI_BASIC_AUTH_USER")}:${requiredEnv("MIMI_BASIC_AUTH_PASSWORD")}`,
).toString("base64")}`;

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} did not return a JSON object`);
  }
  for (const key of expected) {
    if (!(key in value)) throw new Error(`${label} is missing ${key}`);
  }
}

async function post(path, body, cookie = "") {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: BASIC_AUTHORIZATION,
      origin: BASE_URL,
      "sec-fetch-site": "same-origin",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  const setCookie = response.headers.get("set-cookie");
  return {
    status: response.status,
    payload,
    cookie: setCookie ? setCookie.split(";", 1)[0] : cookie,
  };
}

async function confirm(vocabularyEntryId, cookie = "") {
  const result = await post(
    "/api/ai/disclosure",
    {
      vocabularyEntryId,
      disclosureVersion: DISCLOSURE_VERSION,
      confirmed: true,
    },
    cookie,
  );
  if (result.status !== 200 || result.payload?.status !== "confirmed" || !result.cookie) {
    throw new Error(
      `The current in-product AI disclosure was not confirmed: status=${result.status}, reason=${result.payload?.reason ?? "unreadable"}, cookie=${Boolean(result.cookie)}`,
    );
  }
  return result.cookie;
}

function assertSuccessfulResult(result, expectedStatus, label) {
  if (result.status !== 200 || result.payload?.ok !== true) {
    throw new Error(`${label} failed with ${result.payload?.reason ?? result.status}`);
  }
  if (result.payload.status !== expectedStatus) {
    throw new Error(`${label} expected ${expectedStatus}, received ${result.payload.status}`);
  }
  exactKeys(result.payload.stored, ["resourceId", "value", "lineage"], label);
  if (result.payload.stored.lineage?.modelLabel !== "Gemini 3.1 Flash-Lite") {
    throw new Error(`${label} returned unexpected model lineage`);
  }
}

async function runProof() {
  if (!process.argv.includes("--i-confirm-two-provider-attempts")) {
    throw new Error("Provider proof requires --i-confirm-two-provider-attempts");
  }

  let cookie = await confirm(ADAPT_ITEM_ID);
  const enrichmentBody = {
    vocabularyEntryId: ADAPT_ITEM_ID,
    feature: "enrichment_v1",
    disclosureVersion: DISCLOSURE_VERSION,
    idempotencyKey: "v2-7b2-enrichment-provider-1",
  };
  const enrichment = await post("/api/ai/enrichment", enrichmentBody, cookie);
  assertSuccessfulResult(enrichment, "generated", "enrichment provider proof");

  const enrichmentReplay = await post("/api/ai/enrichment", enrichmentBody, cookie);
  assertSuccessfulResult(enrichmentReplay, "replay", "enrichment Idempotency replay");
  const enrichmentCache = await post(
    "/api/ai/enrichment",
    { ...enrichmentBody, idempotencyKey: "v2-7b2-enrichment-cache-1" },
    cookie,
  );
  assertSuccessfulResult(enrichmentCache, "cached", "enrichment Cache proof");

  const contextBody = {
    vocabularyEntryId: ADAPT_ITEM_ID,
    exampleIndex: 0,
    selectedStart: 4,
    selectedEnd: 11,
    feature: "context_explain_v1",
    disclosureVersion: DISCLOSURE_VERSION,
    idempotencyKey: "v2-7b2-context-provider-1",
  };
  const context = await post("/api/ai/context-explain", contextBody, cookie);
  assertSuccessfulResult(context, "generated", "context provider proof");

  const contextReplay = await post("/api/ai/context-explain", contextBody, cookie);
  assertSuccessfulResult(contextReplay, "replay", "context Idempotency replay");
  const contextCache = await post(
    "/api/ai/context-explain",
    { ...contextBody, idempotencyKey: "v2-7b2-context-cache-1" },
    cookie,
  );
  assertSuccessfulResult(contextCache, "cached", "context Cache proof");

  cookie = await confirm(MITIGATE_ITEM_ID, cookie);
  const capProbe = await post(
    "/api/ai/enrichment",
    {
      vocabularyEntryId: MITIGATE_ITEM_ID,
      feature: "enrichment_v1",
      disclosureVersion: DISCLOSURE_VERSION,
      idempotencyKey: "v2-7b2-third-attempt-cap-probe",
    },
    cookie,
  );
  if (
    capProbe.status !== 503 ||
    capProbe.payload?.reason !== "stage7b2_smoke_attempt_limit"
  ) {
    throw new Error("The third provider-attempt probe did not stop at the database cap");
  }

  console.log(JSON.stringify({
    ok: true,
    providerAttemptsExpected: 2,
    enrichment: {
      generated: enrichment.payload.status,
      replay: enrichmentReplay.payload.status,
      cache: enrichmentCache.payload.status,
    },
    context: {
      generated: context.payload.status,
      replay: contextReplay.payload.status,
      cache: contextCache.payload.status,
    },
    thirdAttempt: capProbe.payload.reason,
  }, null, 2));
}

async function runDisclosureProbe() {
  const cookie = await confirm(ADAPT_ITEM_ID);
  console.log(JSON.stringify({
    ok: true,
    disclosureVersion: DISCLOSURE_VERSION,
    sessionCookieIssued: Boolean(cookie),
    providerAttemptsExpected: 0,
  }, null, 2));
}

async function runKillSwitchProbe() {
  if (!process.argv.includes("--i-confirm-kill-switch-probe")) {
    throw new Error("Kill Switch proof requires --i-confirm-kill-switch-probe");
  }
  const cookie = await confirm(MITIGATE_ITEM_ID);
  const result = await post(
    "/api/ai/enrichment",
    {
      vocabularyEntryId: MITIGATE_ITEM_ID,
      feature: "enrichment_v1",
      disclosureVersion: DISCLOSURE_VERSION,
      idempotencyKey: "v2-7b2-kill-switch-probe",
    },
    cookie,
  );
  if (result.status !== 503 || result.payload?.reason !== "kill_switch") {
    throw new Error("The live Kill Switch did not stop the request before provider accounting");
  }
  console.log(JSON.stringify({ ok: true, reason: "kill_switch" }, null, 2));
}

const command = process.argv[2];
if (command === "disclosure") {
  await runDisclosureProbe();
} else if (command === "proof") {
  await runProof();
} else if (command === "kill-switch") {
  await runKillSwitchProbe();
} else {
  throw new Error("Usage: v2-stage7b2-provider-smoke.mjs disclosure|proof|kill-switch");
}
