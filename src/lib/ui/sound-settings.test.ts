import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOUND_SETTINGS,
  normalizeSoundSettings,
  parseSoundSettings,
  serializeSoundSettings,
} from "./sound-settings";

describe("sound settings", () => {
  it("defaults both sound categories to on", () => {
    expect(parseSoundSettings(null)).toEqual(DEFAULT_SOUND_SETTINGS);
    expect(normalizeSoundSettings(undefined)).toEqual(DEFAULT_SOUND_SETTINGS);
  });

  it("keeps valid boolean preferences", () => {
    expect(normalizeSoundSettings({ button: false, reviewComplete: true })).toEqual({
      button: false,
      reviewComplete: true,
    });
  });

  it("repairs malformed stored values field by field", () => {
    expect(normalizeSoundSettings({ button: "off", reviewComplete: false })).toEqual({
      button: true,
      reviewComplete: false,
    });
    expect(parseSoundSettings("not-json")).toEqual(DEFAULT_SOUND_SETTINGS);
  });

  it("serializes normalized settings", () => {
    expect(JSON.parse(serializeSoundSettings({ button: false, reviewComplete: true }))).toEqual({
      button: false,
      reviewComplete: true,
    });
  });
});
