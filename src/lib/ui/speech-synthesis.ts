export type SpeechUtteranceAdapter = {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
};

export type SpeechSynthesisAdapter = {
  cancel: () => void;
  speak: (utterance: SpeechUtteranceAdapter) => void;
};

type SpeechDependencies = Readonly<{
  synthesis?: SpeechSynthesisAdapter | null;
  createUtterance?: (text: string) => SpeechUtteranceAdapter;
}>;

function getBrowserDependencies(): Required<SpeechDependencies> | null {
  if (
    typeof window === "undefined" ||
    typeof window.speechSynthesis === "undefined" ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    return null;
  }

  return {
    synthesis: {
      cancel: () => window.speechSynthesis.cancel(),
      speak: (utterance) =>
        window.speechSynthesis.speak(utterance as SpeechSynthesisUtterance),
    },
    createUtterance: (text) =>
      new SpeechSynthesisUtterance(text) as SpeechUtteranceAdapter,
  };
}

export function speakEnglishText(text: string, dependencies: SpeechDependencies = {}) {
  const spokenText = text.trim();

  if (!spokenText) {
    return { status: "empty" as const, spokenText: "" };
  }

  const browserDependencies = getBrowserDependencies();
  const synthesis = dependencies.synthesis ?? browserDependencies?.synthesis ?? null;
  const createUtterance = dependencies.createUtterance ?? browserDependencies?.createUtterance;

  if (!synthesis || !createUtterance) {
    return { status: "unsupported" as const, spokenText };
  }

  const utterance = createUtterance(spokenText);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  synthesis.cancel();
  synthesis.speak(utterance);

  return { status: "spoken" as const, spokenText };
}
