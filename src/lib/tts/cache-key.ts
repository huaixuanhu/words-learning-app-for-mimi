import { createHash } from "node:crypto";
import type { TtsVoiceContract } from "./contract";

function separated(parts: readonly (string | number)[]) {
  return parts.map((part) => `${String(part).length}:${String(part)}`).join("|");
}

export function sha256Text(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function buildTtsCacheKey(
  normalizedText: string,
  voice: TtsVoiceContract,
) {
  return sha256Text(
    separated([
      normalizedText,
      voice.voiceName,
      voice.languageCode,
      voice.speakingRate,
      voice.pitch,
      voice.audioEncoding,
      voice.adapterContractVersion,
    ]),
  );
}
