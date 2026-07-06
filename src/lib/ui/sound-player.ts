const BUTTON_SOUND_URL = "/sounds/mimi-soft-click.m4a";
const BUTTON_FALLBACK_SOUND_URL = "/sounds/mimi-soft-click.ogg";
const REVIEW_COMPLETE_SOUND_URL = "/sounds/mimi-review-complete.m4a";

const BUTTON_VOLUME = 0.162;
const REVIEW_COMPLETE_VOLUME = 0.32;
const PLAY_TIMEOUT_MS = 500;
const SYNTH_CLICK_DURATION = 0.18;

type AudioContextConstructor = typeof AudioContext;

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: AudioContextConstructor;
};

let sharedAudioContext: AudioContext | null = null;

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext ?? null;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Sound playback timed out.")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function playGeneratedSoftClick(audioContext: AudioContext) {
  const now = audioContext.currentTime;
  const sampleRate = audioContext.sampleRate;
  const frameCount = Math.max(1, Math.floor(sampleRate * SYNTH_CLICK_DURATION));
  const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    const decay = 1 - index / frameCount;
    const lowNoise = (Math.random() * 2 - 1) * decay * decay * 0.32;
    channel[index] = lowNoise;
  }

  const noiseSource = audioContext.createBufferSource();
  const noiseFilter = audioContext.createBiquadFilter();
  const noiseGain = audioContext.createGain();
  const tone = audioContext.createOscillator();
  const toneGain = audioContext.createGain();

  noiseSource.buffer = buffer;
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 320;
  noiseFilter.Q.value = 0.22;
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(BUTTON_VOLUME * 0.5, now + 0.018);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);

  tone.type = "sine";
  tone.frequency.setValueAtTime(118, now);
  tone.frequency.exponentialRampToValueAtTime(68, now + 0.12);
  toneGain.gain.setValueAtTime(0.0001, now);
  toneGain.gain.exponentialRampToValueAtTime(BUTTON_VOLUME * 0.9, now + 0.012);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioContext.destination);
  tone.connect(toneGain);
  toneGain.connect(audioContext.destination);

  noiseSource.addEventListener(
    "ended",
    () => {
      noiseSource.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
      tone.disconnect();
      toneGain.disconnect();
    },
    { once: true },
  );

  noiseSource.start(now);
  tone.start(now);
  tone.stop(now + 0.15);
}

async function playAudioFile(url: string, volume: number) {
  if (typeof Audio === "undefined") {
    throw new Error("Audio playback is unavailable.");
  }

  const audio = new Audio(url);

  audio.volume = volume;
  audio.preload = "auto";
  await withTimeout(audio.play(), PLAY_TIMEOUT_MS);

  return audio;
}

async function playButtonFallbackAudio() {
  try {
    return await playAudioFile(BUTTON_SOUND_URL, BUTTON_VOLUME);
  } catch {
    return playAudioFile(BUTTON_FALLBACK_SOUND_URL, BUTTON_VOLUME);
  }
}

export function playSoftButtonClick() {
  try {
    const AudioContextCtor = getAudioContextConstructor();

    if (!AudioContextCtor) {
      void playButtonFallbackAudio();
      return;
    }

    const audioContext = sharedAudioContext ?? new AudioContextCtor();
    sharedAudioContext = audioContext;

    if (audioContext.state === "suspended") {
      void withTimeout(audioContext.resume(), PLAY_TIMEOUT_MS).catch(() => {
        void playButtonFallbackAudio();
      });
    }

    playGeneratedSoftClick(audioContext);
  } catch {
    void playButtonFallbackAudio().catch(() => {
      // UI audio is decorative; blocked playback should never break app actions.
    });
  }
}

export async function playReviewCompleteSound() {
  return playAudioFile(REVIEW_COMPLETE_SOUND_URL, REVIEW_COMPLETE_VOLUME);
}

export { BUTTON_VOLUME, REVIEW_COMPLETE_VOLUME, REVIEW_COMPLETE_SOUND_URL };
