import { describe, expect, it, vi } from "vitest";
import { speakEnglishText, type SpeechUtteranceAdapter } from "./speech-synthesis";

describe("browser English speech", () => {
  it("returns a calm unsupported state outside a browser", () => {
    expect(speakEnglishText("adapt")).toEqual({
      status: "unsupported",
      spokenText: "adapt",
    });
  });

  it("cancels the earlier queue and speaks one configured utterance", () => {
    const cancel = vi.fn();
    const speak = vi.fn();
    const utterance: SpeechUtteranceAdapter = {
      text: "",
      lang: "",
      rate: 1,
      pitch: 0,
    };

    expect(
      speakEnglishText("  adapt  ", {
        synthesis: { cancel, speak },
        createUtterance: (text) => ({ ...utterance, text }),
      }),
    ).toEqual({ status: "spoken", spokenText: "adapt" });
    expect(cancel).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledWith({
      text: "adapt",
      lang: "en-US",
      rate: 0.9,
      pitch: 1,
    });
  });
});
