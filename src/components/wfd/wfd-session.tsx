"use client";

import { useState } from "react";
import { ArrowRight, Check, Eye, Headphones, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { gradeWfd } from "@/lib/wfd/grading";
import type { WfdAttempt, WfdGrade, WfdSentence } from "@/lib/wfd/types";
import { useWfdAudio } from "./use-wfd-audio";
import { WfdScene } from "./wfd-scene";

export type WfdMode = "learn" | "dictation";

export function WfdSession({ sentence, mode, exposed, onExpose, onAttempt, onNext, nextAvailable }: {
  sentence: WfdSentence; mode: WfdMode; exposed: boolean;
  onExpose: () => void; onAttempt: (attempt: WfdAttempt) => boolean;
  onNext: () => void; nextAvailable: boolean;
}) {
  const audio = useWfdAudio();
  const [stage, setStage] = useState<"understand" | "recall">("understand");
  const [showTranslation, setShowTranslation] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [activeChunk, setActiveChunk] = useState(-1);
  const [animate, setAnimate] = useState(true);
  const [answer, setAnswer] = useState("");
  const [playCount, setPlayCount] = useState(0);
  const [completedPlays, setCompletedPlays] = useState(0);
  const [grade, setGrade] = useState<WfdGrade | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [initialExposed] = useState(exposed);
  const isLearning = mode === "learn";
  const needsVerification = sentence.tags.includes("Needs verification");
  const showAnswer = (isLearning && stage === "understand") || hintShown || !!grade;
  const assisted = isLearning || initialExposed || hintShown || playCount > 1;
  const starts: number[] = [];
  let cursor = 0;
  sentence.chunks.forEach(chunk => {
    const found = sentence.text.indexOf(chunk.text, cursor);
    starts.push(found >= 0 ? found : cursor);
    cursor = (found >= 0 ? found : cursor) + chunk.text.length;
  });

  function playSentence() {
    if (grade) {
      audio.play(sentence.text);
      return;
    }
    setActiveChunk(-1);
    const queued = audio.play(sentence.text, {
      onBoundary: index => {
        const found = starts.reduce((last, start, position) => start <= index ? position : last, -1);
        setActiveChunk(Math.max(0, found));
      },
      onEnd: () => { setCompletedPlays(count => count + 1); setActiveChunk(-1); },
    });
    if (queued) setPlayCount(count => count + 1);
  }

  function checkAnswer() {
    if (grade || audio.isPlaying || needsVerification || (!isLearning && completedPlays === 0)) return;
    try {
      const result = gradeWfd(sentence.text, answer);
      const attempt: WfdAttempt = {
        id: crypto.randomUUID(), sentenceId: sentence.id, answer,
        submittedAt: new Date().toISOString(), mode: isLearning ? "recall" : "dictation",
        assisted, playCount, correct: result.correct, accuracy: result.accuracy,
      };
      setSaved(onAttempt(attempt));
      setGrade(result);
      onExpose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); }
  }

  return (
    <section className="wfd-session mimi-panel" aria-label={isLearning ? "Learn with pictures" : "Dictation practice"}>
      <header className="wfd-session-heading">
        <div><span className="wfd-eyebrow">{isLearning ? "MAKE A MEMORY" : "LISTEN · RECALL · WRITE"}</span>
          <h2 className="mimi-display-title">{isLearning ? (stage === "recall" ? "Let the picture remind you." : "Give this sentence a scene.") : "One sentence. One careful listen."}</h2>
        </div>
        <span className="wfd-source-pill">{sentence.source.kind === "demo" ? "Original example" : sentence.source.kind === "prediction" ? "Prediction practice" : "Your sentence"}</span>
      </header>
      {needsVerification && <p className="wfd-notice" role="status">原来源措辞或答案版本需要核实。这道题暂不计入听写批改，避免把存疑文本背成标准答案。</p>}

      {isLearning ? <>
        <div className="wfd-learning-steps" aria-label="Learning steps">
          <button aria-pressed={stage === "understand"} onClick={() => { audio.stop(); setStage("understand"); onExpose(); }}>01 Understand</button>
          <ArrowRight size={14} aria-hidden="true" />
          <button aria-pressed={stage === "recall"} onClick={() => { audio.stop(); setStage("recall"); setHintShown(false); setGrade(null); setAnswer(""); }}>02 Picture recall</button>
          <ArrowRight size={14} aria-hidden="true" /><span>03 Audio-only review</span>
        </div>
        <WfdScene sentence={sentence} activeChunk={activeChunk} animate={animate} onReplay={playSentence} />
      </> : !showAnswer ? <div className="wfd-listening-space">
        <span className={`wfd-listening-orb ${audio.isPlaying ? "is-playing" : ""}`}><Headphones size={40} strokeWidth={1.3} aria-hidden="true" /></span>
        <p>{audio.isPlaying ? "Listen to the whole sentence…" : completedPlays ? "Now write what you heard." : "Take a breath. Then press play."}</p>
        <small>图片与文字已隐藏。重听会标为辅助练习。</small>
      </div> : null}

      <div className="wfd-audio-row">
        <button className="wfd-primary" disabled={!audio.available} onClick={audio.isPlaying ? audio.stop : playSentence}>
          {audio.isPlaying ? <Square size={16} aria-hidden="true" /> : <Play size={17} fill="currentColor" aria-hidden="true" />}
          {audio.isPlaying ? "Stop audio" : playCount ? "Listen again" : "Listen"}
        </button>
        <span className="wfd-audio-description">{audio.voiceLabel || "Device voice"}<small>{playCount ? `${playCount} play${playCount === 1 ? "" : "s"} · ${completedPlays} complete` : "English audio · on this device"}</small></span>
        {isLearning && <label className="wfd-motion-toggle"><input type="checkbox" checked={animate} onChange={event => setAnimate(event.target.checked)} /> Animate cues</label>}
      </div>
      {audio.error && <p className="wfd-notice" role="alert">{audio.error}</p>}

      {showAnswer && <div className="wfd-answer-reveal">
        <p className="wfd-sentence" lang="en">{sentence.chunks.map((chunk, index) => <span key={index} className={activeChunk === index ? "is-active" : ""}>{chunk.text}{" "}</span>)}</p>
        <button className="wfd-text-button" aria-expanded={showTranslation} onClick={() => setShowTranslation(value => !value)}>{showTranslation ? "Hide Chinese" : "Show Chinese meaning"}</button>
        {showTranslation && <p className="wfd-translation" lang="zh-Hans">{sentence.translationZh || "这道题的中文释义尚未整理。"}</p>}
        {isLearning && stage === "understand" && <div className="wfd-phrase-grid">
          {sentence.chunks.map((chunk, index) => <button key={index} className={activeChunk === index ? "is-active" : ""} disabled={!audio.available} onClick={() => {
            setActiveChunk(index); audio.play(chunk.text, { onEnd: () => setActiveChunk(-1) });
          }}>
            <span className="wfd-phrase-top"><span>{String(index + 1).padStart(2, "0")}</span><Volume2 size={14} aria-hidden="true" /></span>
            <strong lang="en">{chunk.text}</strong><small lang="zh-Hans">{chunk.cueZh || "Phrase cue not yet added"}</small>
          </button>)}
        </div>}
      </div>}

      {isLearning && stage === "understand" && !grade ? <div className="wfd-session-footer">
        <p>Remember the scene, then try the exact words.<small>画面帮助记住句意；冠词、介词、词尾仍要听清并回忆。</small></p>
        <button className="wfd-primary" onClick={() => { audio.stop(); setStage("recall"); setHintShown(false); }}>Hide words & recall <ArrowRight size={16} aria-hidden="true" /></button>
      </div> : <div className="wfd-writing-area">
        <label htmlFor="wfd-answer">{isLearning ? "Recall the complete sentence" : "Write the complete sentence"}</label>
        <textarea id="wfd-answer" lang="en" spellCheck={false} autoCorrect="off" autoCapitalize="off" autoComplete="off" placeholder="Type the sentence here…" maxLength={5000} value={answer} disabled={!!grade} onChange={event => setAnswer(event.target.value)} />
        {!grade && <div className="wfd-writing-actions">
          <button className="wfd-text-button" onClick={() => { setHintShown(true); onExpose(); }}><Eye size={15} aria-hidden="true" /> Show a hint</button>
          <button className="wfd-primary" onClick={checkAnswer} disabled={needsVerification || !answer.trim() || audio.isPlaying || (!isLearning && completedPlays === 0)}>Check my sentence <Check size={16} aria-hidden="true" /></button>
        </div>}
        {error && <p role="alert" className="wfd-notice">{error}</p>}
        {grade && <div className="wfd-result" aria-live="polite">
          <div className="wfd-result-heading"><h3>{grade.correct ? "Every word is in place." : "Here’s what to notice."}</h3><strong>{Math.round(grade.accuracy * 100)}%</strong></div>
          <p>{assisted ? "Assisted practice" : "Independent dictation"} · {grade.correctCount}/{grade.expectedCount} target words matched{saved ? " · Saved on this device" : " · Not saved — see the storage message"}</p>
          <div className="wfd-token-diff" aria-label="Word by word correction">{grade.tokens.map((token, index) => <span key={index} className={`wfd-token-${token.kind}`}>
            {token.kind === "changed" ? <><del>{token.actual}</del><strong>{token.expected}</strong></> : token.kind === "extra" ? <del>{token.actual}</del> : token.expected}
            {token.kind !== "correct" && <small>{token.kind === "changed" ? "replace" : token.kind}</small>}
          </span>)}</div>
          <p className="wfd-score-note">Local word-order feedback, not an official PTE score. Case and punctuation are ignored.</p>
          <div className="wfd-writing-actions"><button className="wfd-text-button" onClick={() => { setGrade(null); setStage("understand"); setHintShown(true); setAnswer(""); }}><RotateCcw size={15} aria-hidden="true" /> Practise this again</button>
            <button className="wfd-primary" disabled={!nextAvailable} onClick={onNext}>Next sentence <ArrowRight size={16} aria-hidden="true" /></button></div>
        </div>}
      </div>}
      <footer className="wfd-provenance">{sentence.id} · {sentence.source.name} · {sentence.source.edition}
        {sentence.source.kind === "prediction" && <span>预测练习题，不能保证在考试中出现。</span>}
      </footer>
    </section>
  );
}
