import { spawnSync } from "node:child_process";

import {
  sha256,
  V21ProductionGuardError,
} from "./v2-1-production-contract.mjs";
import {
  V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256,
} from "./v2-stage8-3-contract.mjs";

const API_BASE = "https://console.neon.tech/api/v2";
const API_KEY_SERVICE = "mimi-v2-8-3-neon-api-key";
const PROJECT_ID_SERVICE = "mimi-v2-8-3-neon-project-id";
const DATABASE_NAME = "neondb";
const ROLE_NAME = "neondb_owner";
const REGION_ID = "aws-ap-southeast-2";

function reject(message, code) {
  throw new V21ProductionGuardError(message, code);
}

function keychainValue(service) {
  const result = spawnSync(
    "/usr/bin/security",
    ["find-generic-password", "-s", service, "-w"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  const value = result.stdout?.trim() || "";
  if (result.error || result.status !== 0 || !value) {
    reject(
      "The approved Neon Keychain value is unavailable",
      "V2_1_NEON_KEYCHAIN_VALUE_UNAVAILABLE",
    );
  }
  return value;
}

function keychainApiKey() {
  const value = keychainValue(API_KEY_SERVICE);
  if (!/^napi_[A-Za-z0-9_-]+$/u.test(value)) {
    reject(
      "The Neon API credential has an invalid shape",
      "V2_1_NEON_API_KEY_INVALID",
    );
  }
  return value;
}

function keychainProjectId() {
  const value = keychainValue(PROJECT_ID_SERVICE);
  if (
    !/^[a-z0-9-]{1,60}$/u.test(value) ||
    sha256(value) !== V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256
  ) {
    reject(
      "The Keychain Neon project id does not match the source-pinned target",
      "V2_1_NEON_PROJECT_MISMATCH",
    );
  }
  return value;
}

async function fetchJson(apiKey, path) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    reject(
      "Neon control-plane verification is unavailable",
      "V2_1_NEON_CONTROL_PLANE_UNAVAILABLE",
    );
  }
  if (!response.ok) {
    reject(
      `Neon control-plane verification was rejected with HTTP ${response.status}`,
      "V2_1_NEON_CONTROL_PLANE_REJECTED",
    );
  }
  try {
    return await response.json();
  } catch {
    reject(
      "Neon returned invalid JSON",
      "V2_1_NEON_CONTROL_PLANE_INVALID",
    );
  }
}

function only(values, message, code) {
  if (values.length !== 1) reject(message, code);
  return values[0];
}

export function selectTargetMetadata({
  projects,
  branches,
  endpoints,
  target,
  approvedProjectSha256 =
    V2_STAGE8_3_APPROVED_PRODUCTION_PROJECT_ID_SHA256,
}) {
  const project = only(
    projects.filter((candidate) => sha256(candidate.id || "") === approvedProjectSha256),
    "The pinned Production Neon project was not resolved exactly once",
    "V2_1_NEON_PROJECT_MISMATCH",
  );
  const main = only(
    branches.filter(
      (branch) =>
        branch.project_id === project.id &&
        branch.name === "main" &&
        (branch.parent_id ?? null) === null &&
        branch.current_state === "ready",
    ),
    "The ready root main branch was not resolved exactly once",
    "V2_1_NEON_MAIN_BRANCH_MISMATCH",
  );
  const branch =
    target === "production-main"
      ? main
      : only(
          branches.filter(
            (candidate) =>
              candidate.project_id === project.id &&
              candidate.name === "staging" &&
              candidate.parent_id === main.id &&
              candidate.current_state === "ready",
          ),
          "The ready staging child branch was not resolved exactly once",
          "V2_1_NEON_STAGING_BRANCH_MISMATCH",
        );
  const endpoint = only(
    endpoints.filter(
      (candidate) =>
        candidate.project_id === project.id &&
        candidate.branch_id === branch.id &&
        candidate.type === "read_write" &&
        candidate.region_id === REGION_ID,
    ),
    "The expected Sydney read-write endpoint was not resolved exactly once",
    "V2_1_NEON_ENDPOINT_MISMATCH",
  );
  return {
    branch,
    endpoint,
    main,
    project,
    safeIdentity: {
      branchIdSha256: sha256(branch.id),
      branchName: branch.name,
      controlPlaneConfirmed: true,
      controlPlaneEvidenceSha256: sha256(
        JSON.stringify({
          branchIdSha256: sha256(branch.id),
          branchName: branch.name,
          endpointIdSha256: sha256(endpoint.id),
          projectIdSha256: sha256(project.id),
          regionId: endpoint.region_id,
          target,
        }),
      ),
      databaseMatched: true,
      endpointIdSha256: sha256(endpoint.id),
      endpointMatched: true,
      identityDigest: sha256(
        [
          target,
          sha256(branch.id),
          sha256(endpoint.id),
          sha256(project.id),
          REGION_ID,
          DATABASE_NAME,
          ROLE_NAME,
        ].join("\0"),
      ),
      projectIdSha256: sha256(project.id),
      regionId: endpoint.region_id,
      roleMatched: true,
      target,
    },
  };
}

export function validateConnectionUri(uri, metadata) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    reject("The Neon connection URI is invalid", "V2_1_NEON_CONNECTION_INVALID");
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !parsed.hostname.endsWith(".neon.tech") ||
    parsed.hostname.includes("-pooler.") ||
    !parsed.hostname.startsWith(metadata.endpoint.id) ||
    decodeURIComponent(parsed.username) !== ROLE_NAME ||
    decodeURIComponent(parsed.pathname.slice(1)) !== DATABASE_NAME ||
    !parsed.password
  ) {
    reject(
      "The Neon connection URI does not match the guarded target",
      "V2_1_NEON_CONNECTION_MISMATCH",
    );
  }
  return parsed;
}

export async function retrieveGuardedTarget(target) {
  const apiKey = keychainApiKey();
  const projectId = keychainProjectId();
  const [projectPayload, branchPayload, endpointPayload] = await Promise.all([
    fetchJson(apiKey, `/projects/${encodeURIComponent(projectId)}`),
    fetchJson(
      apiKey,
      `/projects/${encodeURIComponent(projectId)}/branches?limit=10000`,
    ),
    fetchJson(apiKey, `/projects/${encodeURIComponent(projectId)}/endpoints`),
  ]);
  const projects =
    projectPayload?.project && typeof projectPayload.project === "object"
      ? [projectPayload.project]
      : [];
  const metadata = selectTargetMetadata({
    projects,
    branches: Array.isArray(branchPayload?.branches) ? branchPayload.branches : [],
    endpoints: Array.isArray(endpointPayload?.endpoints)
      ? endpointPayload.endpoints
      : [],
    target,
  });
  const query = new URLSearchParams({
    branch_id: metadata.branch.id,
    endpoint_id: metadata.endpoint.id,
    database_name: DATABASE_NAME,
    role_name: ROLE_NAME,
    pooled: "false",
  });
  const connectionPayload = await fetchJson(
    apiKey,
    `/projects/${encodeURIComponent(metadata.project.id)}/connection_uri?${query}`,
  );
  const parsed = validateConnectionUri(connectionPayload?.uri, metadata);
  return {
    connectionString: parsed.toString(),
    expectedDatabase: DATABASE_NAME,
    expectedRole: ROLE_NAME,
    metadata,
    safeIdentity: metadata.safeIdentity,
  };
}
