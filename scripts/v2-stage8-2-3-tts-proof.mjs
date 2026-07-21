import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const PROJECT_ID = "for-tts-502913";
const CONFIRMATION = "--i-confirm-for-tts-502913-candidate-synthesis";
const OUTPUT_ROOT = "/tmp/mimi-tts-proof-en-au";
const VOICES = [
  "en-AU-Standard-A",
  "en-AU-Standard-B",
  "en-AU-Standard-C",
  "en-AU-Standard-D",
];
const SAMPLE_TEXT =
  "Mitigate. Nevertheless. Government subsidy. The new policy may mitigate the risk.";
const LIST_PRICE_USD_PER_CHARACTER = 4 / 1_000_000;

function fail(message) {
  throw Object.assign(new Error(message), { safeToReport: true });
}

function assertContract() {
  if (process.argv.length !== 3 || process.argv[2] !== CONFIRMATION) {
    fail(`This proof requires exactly ${CONFIRMATION}`);
  }
  if (process.env.MIMI_TTS_GCP_PROJECT !== PROJECT_ID) {
    fail(`MIMI_TTS_GCP_PROJECT must be ${PROJECT_ID}`);
  }
  const gcloud = process.env.GCLOUD_BIN;
  if (!gcloud || !resolve(gcloud).endsWith("/google-cloud-sdk/bin/gcloud")) {
    fail("GCLOUD_BIN must point to the installed official Google Cloud CLI");
  }
  return gcloud;
}

function accessToken(gcloud) {
  const token = execFileSync(gcloud, ["auth", "print-access-token"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (!token) fail("A short-lived Google Cloud access token is unavailable");
  return token;
}

async function googleJson(path, token, init = {}) {
  const response = await fetch(`https://texttospeech.googleapis.com/v1/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
      "x-goog-user-project": PROJECT_ID,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json();
  if (!response.ok) {
    fail(`Google Cloud TTS rejected the proof with HTTP ${response.status}`);
  }
  return body;
}

async function main() {
  const gcloud = assertContract();
  const token = accessToken(gcloud);
  const voiceList = await googleJson("voices?languageCode=en-AU", token);
  const available = new Set((voiceList.voices ?? []).map((voice) => voice.name));
  for (const voice of VOICES) {
    if (!available.has(voice)) fail(`${voice} is not in the current voices:list response`);
  }

  await mkdir(OUTPUT_ROOT, { recursive: true, mode: 0o700 });
  const results = [];
  for (const voice of VOICES) {
    const response = await googleJson("text:synthesize", token, {
      method: "POST",
      body: JSON.stringify({
        input: { text: SAMPLE_TEXT },
        voice: { languageCode: "en-AU", name: voice },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 0.9,
          pitch: 0,
        },
      }),
    });
    if (typeof response.audioContent !== "string" || !response.audioContent) {
      fail(`${voice} returned no audio`);
    }
    const bytes = Buffer.from(response.audioContent, "base64");
    if (!bytes.byteLength || bytes.byteLength > 512 * 1024) {
      fail(`${voice} returned an invalid audio size`);
    }
    const path = `${OUTPUT_ROOT}/${voice}.mp3`;
    await writeFile(path, bytes, { mode: 0o600 });
    results.push({ voice, path, audioBytes: bytes.byteLength });
  }
  const characterCount = Array.from(SAMPLE_TEXT).length;
  const evidence = {
    evidenceVersion: "tts-standard-candidate-proof-v1",
    projectId: PROJECT_ID,
    provider: "google-cloud-text-to-speech",
    voiceFamily: "Standard",
    languageCode: "en-AU",
    speakingRate: 0.9,
    pitch: 0,
    audioEncoding: "MP3",
    attempts: results.length,
    charactersPerAttempt: characterCount,
    totalCharacters: characterCount * results.length,
    estimatedListPriceUsd:
      characterCount * results.length * LIST_PRICE_USD_PER_CHARACTER,
    results,
    createdAt: new Date().toISOString(),
  };
  await writeFile(
    `${OUTPUT_ROOT}/evidence.json`,
    `${JSON.stringify(evidence, null, 2)}\n`,
    { mode: 0o600 },
  );
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      message: error?.safeToReport ? error.message : "TTS proof failed",
    }),
  );
  process.exitCode = 1;
});

