import { readFile } from "node:fs/promises";
import { join } from "node:path";
import enrichmentResponseJsonSchema from "./gemini-response-schema-v2.json";
import contextResponseJsonSchema from "./context-response-schema-v1.json";
import type { GeminiProviderMaterials } from "./gemini-provider-adapter";

async function readMaterial(fileName: string) {
  const value = await readFile(
    join(process.cwd(), "src", "lib", "ai-enrichment", fileName),
    "utf8",
  );
  if (!value.trim()) {
    throw new Error(`AI provider material is empty: ${fileName}`);
  }
  return value;
}

export async function loadEnrichmentProviderMaterials(): Promise<GeminiProviderMaterials> {
  return {
    systemPrompt: await readMaterial("prompt-v2.txt"),
    responseJsonSchema: enrichmentResponseJsonSchema,
  };
}

export async function loadContextProviderMaterials(): Promise<GeminiProviderMaterials> {
  return {
    systemPrompt: await readMaterial("context-prompt-v1.txt"),
    responseJsonSchema: contextResponseJsonSchema,
  };
}

