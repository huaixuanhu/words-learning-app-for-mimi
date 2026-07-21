import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const CONFIRMATION = "--i-confirm-50-provider-attempts";
const BASE_URL = "http://127.0.0.1:3000";
const ROUTE_URL = `${BASE_URL}/api/tts`;
const EXPECTED_VOICE = "google-en-au-standard-c-v1";
const EXPECTED_SOURCE = "google-cloud-standard";
const CONCURRENCY = 2;
const CACHE_RETEST_COUNT = 5;
const LIST_PRICE_PER_CHARACTER_USD = 4 / 1_000_000;

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const corpusPath = path.join(
  scriptDirectory,
  "fixtures",
  "v2-stage8-2-3-tts-corpus.json",
);

function unicodeLength(value) {
  return Array.from(value).length;
}

export function assertCorpus(corpus) {
  if (corpus?.artifactKind !== "v2-8-2-3-tts-human-corpus-v1") {
    throw new Error("Unexpected TTS corpus contract.");
  }
  if (corpus.voiceContractId !== EXPECTED_VOICE || !Array.isArray(corpus.entries)) {
    throw new Error("TTS corpus voice contract is not pinned.");
  }
  const expectedGroups = new Map([
    ["Common and PTE words", 20],
    ["Long or uncommon words", 10],
    ["Phrases and fixed collocations", 10],
    ["Sound and confusable pairs", 5],
    ["Short preview sentences", 5],
  ]);
  if (corpus.entries.length !== 50) throw new Error("TTS corpus must contain 50 entries.");
  const ids = new Set();
  const texts = new Set();
  const counts = new Map();
  for (const entry of corpus.entries) {
    if (!entry?.id || !entry?.group || !entry?.text || !entry?.focus) {
      throw new Error("TTS corpus entry is incomplete.");
    }
    if (ids.has(entry.id) || texts.has(entry.text)) {
      throw new Error("TTS corpus ids and texts must be unique.");
    }
    if (unicodeLength(entry.text) > 240) throw new Error("TTS corpus text is too long.");
    ids.add(entry.id);
    texts.add(entry.text);
    counts.set(entry.group, (counts.get(entry.group) ?? 0) + 1);
  }
  for (const [group, count] of expectedGroups) {
    if (counts.get(group) !== count) throw new Error(`Unexpected count for ${group}.`);
  }
}

function safeFileName(index, entry) {
  return `${String(index + 1).padStart(2, "0")}-${entry.id}.mp3`;
}

async function requestAudio(entry, purpose = "settings-preview") {
  const startedAt = performance.now();
  const response = await fetch(ROUTE_URL, {
    method: "POST",
    headers: {
      origin: BASE_URL,
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      version: "tts-request-v1",
      requestId: randomUUID(),
      text: entry.text,
      purpose,
    }),
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  if (!response.ok) {
    throw new Error(`TTS route rejected ${entry.id} with HTTP ${response.status}.`);
  }
  if (response.headers.get("content-type") !== "audio/mpeg") {
    throw new Error(`TTS route returned an invalid content type for ${entry.id}.`);
  }
  const voiceContractId = response.headers.get("x-mimi-tts-voice-contract");
  const source = response.headers.get("x-mimi-tts-source");
  if (voiceContractId !== EXPECTED_VOICE || source !== EXPECTED_SOURCE) {
    throw new Error(`TTS route returned an unexpected provider contract for ${entry.id}.`);
  }
  const audio = new Uint8Array(await response.arrayBuffer());
  if (!audio.byteLength) throw new Error(`TTS route returned empty audio for ${entry.id}.`);
  return {
    audio,
    latencyMs,
    cacheStatus: response.headers.get("x-mimi-tts-cache") ?? "unknown",
    voiceContractId,
    source,
  };
}

async function mapWithConcurrency(entries, concurrency, callback) {
  const results = new Array(entries.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < entries.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(entries[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

export function htmlDocument(manifest) {
  const serialized = JSON.stringify(manifest).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mimi Standard-C Listening Check</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; background: #f4f1e9; color: #173429; }
    body { margin: 0; padding: 24px; }
    main { max-width: 920px; margin: 0 auto; }
    h1 { margin-bottom: 8px; }
    .intro { color: #50665d; line-height: 1.6; }
    .toolbar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 12px; margin: 20px 0; border: 1px solid #c9c5b8; border-radius: 14px; background: rgba(255, 253, 247, .96); }
    button { min-height: 42px; padding: 0 16px; border: 1px solid #698073; border-radius: 10px; background: #e8efe7; color: #173429; font-weight: 700; cursor: pointer; }
    section { margin: 28px 0; }
    article { display: grid; gap: 10px; padding: 16px; margin: 10px 0; border: 1px solid #d6d0c2; border-radius: 14px; background: #fffdf7; }
    .word { font-family: ui-serif, Georgia, serif; font-size: 1.35rem; font-weight: 700; }
    .focus { color: #65756e; font-size: .9rem; }
    audio { width: 100%; }
    fieldset { display: flex; flex-wrap: wrap; gap: 12px; border: 0; padding: 0; }
    label { display: inline-flex; gap: 6px; align-items: center; }
    textarea { box-sizing: border-box; width: 100%; min-height: 54px; padding: 9px; border: 1px solid #c9c5b8; border-radius: 8px; font: inherit; }
    @media (max-width: 520px) { body { padding: 14px; } article { padding: 13px; } }
  </style>
</head>
<body>
<main>
  <h1>Standard-C listening check</h1>
  <p class="intro">50 fixed samples · en-AU-Standard-C · 0.9 speed · original pitch. Mark what you hear; progress stays only in this browser. Export the result when finished.</p>
  <div class="toolbar"><strong id="progress">0 / 50 rated</strong><button id="export" type="button">Export results</button></div>
  <div id="corpus"></div>
</main>
<script id="manifest" type="application/json">${serialized}</script>
<script>
  const manifest = JSON.parse(document.getElementById("manifest").textContent);
  const storageKey = "mimi-standard-c-listening-v1";
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  const root = document.getElementById("corpus");
  const progress = document.getElementById("progress");
  const groups = new Map();
  for (const entry of manifest.entries) {
    if (!groups.has(entry.group)) groups.set(entry.group, []);
    groups.get(entry.group).push(entry);
  }
  function persist() {
    localStorage.setItem(storageKey, JSON.stringify(saved));
    const rated = Object.values(saved).filter((value) => value.rating).length;
    progress.textContent = rated + " / " + manifest.entries.length + " rated";
  }
  for (const [groupName, entries] of groups) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = groupName;
    section.appendChild(heading);
    for (const entry of entries) {
      const article = document.createElement("article");
      const word = document.createElement("div"); word.className = "word"; word.textContent = entry.text;
      const focus = document.createElement("div"); focus.className = "focus"; focus.textContent = entry.focus;
      const audio = document.createElement("audio"); audio.controls = true; audio.preload = "none"; audio.src = entry.fileName;
      const choices = document.createElement("fieldset");
      for (const rating of ["Good", "Review", "Bad"]) {
        const label = document.createElement("label");
        const input = document.createElement("input"); input.type = "radio"; input.name = entry.id; input.value = rating;
        input.checked = saved[entry.id]?.rating === rating;
        input.addEventListener("change", () => { saved[entry.id] = { ...(saved[entry.id] || {}), rating }; persist(); });
        label.append(input, rating); choices.appendChild(label);
      }
      const notes = document.createElement("textarea"); notes.placeholder = "Optional note"; notes.value = saved[entry.id]?.notes || "";
      notes.addEventListener("input", () => { saved[entry.id] = { ...(saved[entry.id] || {}), notes: notes.value }; persist(); });
      article.append(word, focus, audio, choices, notes); section.appendChild(article);
    }
    root.appendChild(section);
  }
  document.getElementById("export").addEventListener("click", () => {
    const output = { artifactKind: "v2-8-2-3-tts-human-result-v1", exportedAt: new Date().toISOString(), voiceContractId: manifest.voiceContractId, ratings: saved };
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "mimi-standard-c-listening-results.json"; link.click(); URL.revokeObjectURL(url);
  });
  persist();
</script>
</body>
</html>`;
}

async function main() {
  if (!process.argv.includes(CONFIRMATION)) {
    throw new Error(`Refusing paid-provider corpus run without ${CONFIRMATION}.`);
  }
  const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
  assertCorpus(corpus);
  const outputDirectory = path.join(
    "/tmp",
    `mimi-tts-corpus-en-au-standard-c-${new Date().toISOString().replaceAll(/[:.]/gu, "-")}`,
  );
  await mkdir(outputDirectory, { recursive: true });

  const entries = await mapWithConcurrency(
    corpus.entries,
    CONCURRENCY,
    async (entry, index) => {
      const result = await requestAudio(entry);
      const fileName = safeFileName(index, entry);
      await writeFile(path.join(outputDirectory, fileName), result.audio);
      return {
        ...entry,
        fileName,
        characterCount: unicodeLength(entry.text),
        audioBytes: result.audio.byteLength,
        latencyMs: result.latencyMs,
        cacheStatus: result.cacheStatus,
      };
    },
  );

  const cacheRetests = [];
  for (const entry of corpus.entries.slice(0, CACHE_RETEST_COUNT)) {
    const result = await requestAudio(entry, "recognition");
    if (result.cacheStatus !== "hit") {
      throw new Error(`Expected a server Cache hit for ${entry.id}.`);
    }
    cacheRetests.push({ id: entry.id, cacheStatus: result.cacheStatus, latencyMs: result.latencyMs });
  }

  const characterCount = entries.reduce((total, entry) => total + entry.characterCount, 0);
  const manifest = {
    artifactKind: corpus.artifactKind,
    generatedAt: new Date().toISOString(),
    source: EXPECTED_SOURCE,
    voiceContractId: EXPECTED_VOICE,
    providerAttempts: entries.filter((entry) => entry.cacheStatus !== "hit").length,
    characterCount,
    estimatedListPriceUsd: Number((characterCount * LIST_PRICE_PER_CHARACTER_USD).toFixed(6)),
    cacheRetests,
    entries,
  };
  await writeFile(
    path.join(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writeFile(path.join(outputDirectory, "index.html"), htmlDocument(manifest));

  process.stdout.write(`${JSON.stringify({
    ok: true,
    outputDirectory,
    entryCount: entries.length,
    providerAttempts: manifest.providerAttempts,
    characterCount,
    estimatedListPriceUsd: manifest.estimatedListPriceUsd,
    cacheRetests: cacheRetests.length,
    latencyMs: {
      min: Math.min(...entries.map((entry) => entry.latencyMs)),
      max: Math.max(...entries.map((entry) => entry.latencyMs)),
      average: Math.round(entries.reduce((total, entry) => total + entry.latencyMs, 0) / entries.length),
    },
  }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await main();
}
