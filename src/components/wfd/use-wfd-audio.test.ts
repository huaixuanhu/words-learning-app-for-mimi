import { describe, expect, it, vi } from "vitest";
import { createWfdAudioPlayback, selectWfdLocalVoice } from "./use-wfd-audio";

const voice = (lang: string, localService = true): SpeechSynthesisVoice => ({
  lang, localService, name: `${lang} voice`, default: false, voiceURI: `${lang}-${localService}`,
});

function audioFixture() {
  const synthesis = { speak: vi.fn(), cancel: vi.fn() };
  const onState = vi.fn();
  const utterances: SpeechSynthesisUtterance[] = [];
  const playback = createWfdAudioPlayback(synthesis, (text) => {
    const utterance = { text } as SpeechSynthesisUtterance;
    utterances.push(utterance);
    return utterance;
  }, onState);
  return { synthesis, onState, utterances, playback };
}

describe("WFD explicit local device speech", () => {
  it("prefers Australian, then British, then US local English without a cloud fallback", () => {
    const voices = [voice("en-US"), voice("en-AU", false), voice("zh-CN"), voice("en-GB")];
    expect(selectWfdLocalVoice(voices)?.lang).toBe("en-GB");
    expect(selectWfdLocalVoice([...voices, voice("en-AU")])?.lang).toBe("en-AU");
    expect(selectWfdLocalVoice([voice("zh-CN"), voice("en-US", false)])).toBeNull();
    const { playback, synthesis } = audioFixture();
    expect(playback.play("A full sentence.", voice("en-AU", false))).toBe(false);
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it("speaks the exact target and exposes real boundaries and natural completion only", () => {
    const { playback, utterances, synthesis } = audioFixture();
    const onBoundary = vi.fn();
    const onEnd = vi.fn();
    const sentence = "The lecture begins tomorrow.";
    expect(playback.play(sentence, voice("en-AU"), { onBoundary, onEnd })).toBe(true);
    const utterance = utterances[0];
    expect(synthesis.speak).toHaveBeenCalledWith(utterance);
    expect(utterance.text).toBe(sentence);
    expect(utterance.rate).toBe(1);
    expect(onBoundary).not.toHaveBeenCalled();
    utterance.onboundary?.call(utterance, { charIndex: 4 } as SpeechSynthesisEvent);
    expect(onBoundary).toHaveBeenCalledWith(4);
    expect(onEnd).not.toHaveBeenCalled();
    utterance.onend?.call(utterance, {} as SpeechSynthesisEvent);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(utterance.onboundary).toBeNull();
  });

  it("canceling or replacing speech cannot mark an incomplete listen as finished", () => {
    const { playback, utterances } = audioFixture();
    const firstEnd = vi.fn();
    playback.play("First sentence.", voice("en-US"), { onEnd: firstEnd });
    const staleEnd = utterances[0].onend;
    playback.play("Second sentence.", voice("en-US"));
    staleEnd?.call(utterances[0], {} as SpeechSynthesisEvent);
    expect(firstEnd).not.toHaveBeenCalled();
    const secondEnd = utterances[1].onend;
    playback.stop();
    secondEnd?.call(utterances[1], {} as SpeechSynthesisEvent);
    expect(utterances.every((utterance) => utterance.onend === null)).toBe(true);
  });

  it("playback errors remain visible and never complete an attempt", () => {
    const { playback, utterances, onState } = audioFixture();
    const onEnd = vi.fn();
    playback.play("A full sentence.", voice("en-US"), { onEnd });
    const utterance = utterances[0];
    utterance.onerror?.call(utterance, { error: "not-allowed" } as SpeechSynthesisErrorEvent);
    expect(onEnd).not.toHaveBeenCalled();
    expect(onState).toHaveBeenLastCalledWith({ isPlaying: false, error: expect.stringContaining("Tap Play") });
    expect(utterance.onend).toBeNull();
  });
});
