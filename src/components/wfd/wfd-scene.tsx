"use client";

import Image from "next/image";
import { ArrowRight, BookOpen, Layers3 } from "lucide-react";
import type { WfdSentence } from "@/lib/wfd/types";

export function WfdScene({ sentence, activeChunk, animate, onReplay }: {
  sentence: WfdSentence; activeChunk: number; animate: boolean; onReplay: () => void;
}) {
  const hasCues = sentence.chunks.some(chunk => chunk.visualLabel || chunk.cueZh);
  return (
    <div className={`wfd-scene ${animate ? "wfd-scene-animated" : ""}`}>
      {sentence.image ? (
        <button className="wfd-scene-art mimi-focus-ring" onClick={onReplay} aria-label="Play sentence with picture">
          <Image src={sentence.image} alt={sentence.translationZh || "Sentence illustration"} width={1536} height={1024} priority sizes="(max-width: 700px) 95vw, 700px" />
          <span className="wfd-art-label"><BookOpen size={14} aria-hidden="true" /> Listen to this scene</span>
        </button>
      ) : (
        <div className="wfd-scene-placeholder">
          <Layers3 size={32} strokeWidth={1.2} aria-hidden="true" />
          <p>{hasCues ? "Follow the meaning, one phrase at a time." : "This sentence is ready for listening practice."}</p>
          {!hasCues && <small>图片与中文提示尚未整理。</small>}
        </div>
      )}
      {hasCues && <ol className="wfd-storyboard" aria-label="Meaning sequence">
        {sentence.chunks.map((chunk, index) => (
          <li key={index} className={activeChunk === index ? "is-active" : ""}>
            <span className="wfd-scene-number">{String(index + 1).padStart(2, "0")}</span>
            <span lang="zh-Hans">{chunk.visualLabel || chunk.cueZh}</span>
            {index < sentence.chunks.length - 1 && <ArrowRight className="wfd-sequence-arrow" size={14} aria-hidden="true" />}
          </li>
        ))}
      </ol>}
    </div>
  );
}
