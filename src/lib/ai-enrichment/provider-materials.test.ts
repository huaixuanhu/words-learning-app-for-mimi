import { describe, expect, it } from "vitest";
import {
  loadContextProviderMaterials,
  loadEnrichmentProviderMaterials,
} from "./provider-materials";

describe("V2 Stage 7A pinned AI provider materials", () => {
  it("loads the accepted enrichment Prompt v2 and strict schema lazily", async () => {
    const materials = await loadEnrichmentProviderMaterials();
    expect(materials.systemPrompt).toContain("compact editable vocabulary-enrichment draft");
    expect(materials.responseJsonSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
    });
  });

  it("pins the exact context fields without tools or free-form client prompts", async () => {
    const materials = await loadContextProviderMaterials();
    expect(materials.systemPrompt).toContain("one exact English word");
    expect(materials.responseJsonSchema).toMatchObject({
      required: [
        "suggestedHeadword",
        "meaningInContextZh",
        "grammarRoleZh",
        "contextExplanationZh",
        "phraseInContext",
      ],
    });
  });
});
