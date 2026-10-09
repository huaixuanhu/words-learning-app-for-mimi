"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, BookImage, Check, ChevronRight, Download, Headphones, Search, Upload, X } from "lucide-react";
import { useVocabularyData } from "@/components/vocabulary/use-vocabulary-data";
import { getSelectedPerson } from "@/lib/people/repository";
import { WFD_DEMOS } from "@/lib/wfd/demo";
import { mergeWfdSentences, parseWfdSentenceImport } from "@/lib/wfd/import";
import { isIndependentWfdAttempt, isWfdDue, markWfdLearned, scheduleWfdAttempt } from "@/lib/wfd/scheduling";
import { exportWfdBackup, parseWfdBackup, readWfdData, restoreWfdBackup, wfdStorageKey, writeWfdData } from "@/lib/wfd/storage";
import type { WfdAttempt, WfdData, WfdSentence } from "@/lib/wfd/types";
import { WfdSession, type WfdMode } from "./wfd-session";

function message(error: unknown) { return error instanceof Error ? error.message : "Please try again."; }
function downloadJson(contents: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function WfdWorkspace() {
  const vocabulary = useVocabularyData();
  const person = getSelectedPerson(vocabulary.data);
  if (!vocabulary.isLoaded) return <p>Opening your learning space…</p>;
  return <PersonWfdWorkspace key={person.id} personId={person.id} personName={person.displayName} />;
}

function PersonWfdWorkspace({ personId, personName }: { personId: string; personName: string }) {
  const [data, setData] = useState<WfdData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<WfdMode>("learn");
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("illustrated");
  const [search, setSearch] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [exposedIds, setExposedIds] = useState<Set<string>>(() => new Set());
  const [sessionRevision, setSessionRevision] = useState(0);
  const [clock, setClock] = useState("");

  useEffect(() => {
    let alive = true;
    const read = () => {
      try { const next = readWfdData(personId); if (alive) { setData(next); setError(""); } }
      catch (cause) { if (alive) { setData(null); setError(message(cause)); setBankOpen(true); } }
    };
    queueMicrotask(read);
    const onStorage = (event: StorageEvent) => {
      if (event.key === wfdStorageKey(personId) || event.key === null) {
        read(); setSessionRevision(value => value + 1); setNotice("WFD data changed in another tab. This practice has been restarted.");
      }
    };
    window.addEventListener("storage", onStorage);
    const timer = window.setInterval(() => setClock(new Date().toISOString()), 30_000);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("storage", onStorage); };
  }, [personId]);

  const sentences = data?.sentences.length ? data.sentences : WFD_DEMOS;
  const due = sentences.filter(sentence => isWfdDue(data?.progress[sentence.id], clock || undefined));
  const sentenceIds = new Set(sentences.map(sentence => sentence.id));
  const independent = data?.attempts.filter(attempt => sentenceIds.has(attempt.sentenceId) && isIndependentWfdAttempt(attempt)) ?? [];
  const correct = independent.filter(attempt => attempt.correct).length;
  const filtered = sentences.filter(sentence => {
    const matchesSearch = !search || `${sentence.id} ${sentence.text} ${sentence.translationZh}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (filter === "all" || (filter === "illustrated" && !!sentence.image) ||
      (filter === "new" && sentence.tags.includes("新题")) || (filter === "due" && isWfdDue(data?.progress[sentence.id], clock || undefined)));
  });
  const selected = sentences.find(sentence => sentence.id === selectedId) ?? filtered[0];
  const selectedIndex = selected ? filtered.indexOf(selected) : -1;
  const expose = useCallback((id: string) => {
    setExposedIds(previous => previous.has(id) ? previous : new Set([...previous, id]));
  }, []);
  const selectedSentenceId = selected?.id;
  useEffect(() => {
    let active = true;
    if (mode === "learn" && selectedSentenceId) queueMicrotask(() => { if (active) expose(selectedSentenceId); });
    return () => { active = false; };
  }, [mode, selectedSentenceId, expose]);

  function save(next: WfdData): boolean {
    try { writeWfdData(next, data?.updatedAt); setData(next); setError(""); return true; }
    catch (cause) { setError(message(cause)); return false; }
  }
  function record(attempt: WfdAttempt): boolean {
    if (!data) return false;
    setSelectedId(attempt.sentenceId);
    const now = attempt.submittedAt;
    return save({ ...data, attempts: [...data.attempts, attempt],
      progress: { ...data.progress, [attempt.sentenceId]: scheduleWfdAttempt(data.progress[attempt.sentenceId], attempt) }, updatedAt: now });
  }
  function choose(nextMode: WfdMode) {
    if (selected && mode === "learn") {
      expose(selected.id);
      if (data) save({ ...data, progress: { ...data.progress, [selected.id]: markWfdLearned(data.progress[selected.id]) }, updatedAt: new Date().toISOString() });
    }
    setMode(nextMode); setSessionRevision(value => value + 1);
  }

  return <div className="wfd-workspace">
    <div className="wfd-intro-row"><p>A little scene. A lasting sentence.<span>先用画面与声音理解，再靠自己完整写出。</span></p>
      <button className="wfd-top-action" onClick={() => setBankOpen(value => !value)} aria-expanded={bankOpen}><Upload size={16} aria-hidden="true" /> Your sentence bank</button></div>
    <div className="wfd-overview">
      <div><span>YOUR COLLECTION</span><strong>{sentences.length}<small>sentences</small></strong></div>
      <div><span>READY TO REVISIT</span><strong>{due.length}<small>due for review</small></strong></div>
      <div><span>INDEPENDENT RECALL</span><strong>{independent.length ? `${Math.round(correct / independent.length * 100)}%` : "—"}<small>{independent.length ? `${correct} / ${independent.length} exact sentences` : "Your first listen is a beginning"}</small></strong></div>
    </div>

    {error && <div className="wfd-notice" role="alert">{error} <button onClick={() => window.location.reload()}>Reload safely</button></div>}
    {notice && <div className="wfd-notice wfd-notice-success" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={16} /></button></div>}
    {bankOpen && <WfdBankPanel data={data} personId={personId} onSave={save} onRestore={next => { setData(next); setError(""); setSessionRevision(value => value + 1); }} onImported={count => { setFilter("all"); setNotice(`${count} sentences imported. Your existing WFD history has been kept.`); setBankOpen(false); }} onError={setError} />}

    <nav className="wfd-mode-nav" aria-label="WFD learning mode">
      <button className={mode === "learn" ? "is-active" : ""} aria-pressed={mode === "learn"} onClick={() => choose("learn")}><BookImage size={20} aria-hidden="true" /><span>Learn with pictures<small>学习记忆</small></span><ArrowUpRight size={17} aria-hidden="true" /></button>
      <button className={mode === "dictation" ? "is-active" : ""} aria-pressed={mode === "dictation"} onClick={() => choose("dictation")}><Headphones size={20} aria-hidden="true" /><span>Listen & write<small>听写复习</small></span><ArrowUpRight size={17} aria-hidden="true" /></button>
    </nav>

    {data && <div className="wfd-study-layout">
      <aside className="wfd-bank mimi-panel" aria-label="Sentence collection">
        <div className="wfd-bank-heading"><h2>Your sentences</h2><span>{filtered.length}</span></div>
        <label className="wfd-search"><Search size={15} aria-hidden="true" /><input aria-label="Search sentences" placeholder={mode === "dictation" ? "Find a question ID" : "Find a sentence…"} value={search} onChange={event => { setSearch(event.target.value); setSelectedId(""); }} /></label>
        <label className="wfd-filter"><span>Show</span><select aria-label="Sentence filter" value={filter} onChange={event => { setFilter(event.target.value); setSelectedId(""); }}><option value="illustrated">With pictures</option><option value="due">Due for review</option><option value="new">New predictions</option><option value="all">All sentences</option></select></label>
        <div className="wfd-bank-list">{filtered.map((sentence, index) => <button key={sentence.id} aria-current={sentence.id === selected?.id ? "true" : undefined} onClick={() => {
          if (selected && mode === "learn") expose(selected.id);
          setSelectedId(sentence.id); setSessionRevision(value => value + 1);
        }}><span className="wfd-bank-index">{String(index + 1).padStart(2, "0")}</span><span className="wfd-bank-item-copy"><strong>{mode === "learn" && sentence.chunks[0].visualLabel ? sentence.chunks[0].visualLabel : `Sentence ${sentence.id.replace(/^firefly-/, "#")}`}</strong><small>{sentence.tags.includes("新题") ? "New · " : ""}{sentence.image ? "Picture story" : sentence.source.kind === "demo" ? "Original practice" : "Audio practice"}{isWfdDue(data.progress[sentence.id], clock || undefined) ? " · Due" : ""}</small></span><ChevronRight size={14} aria-hidden="true" /></button>)}</div>
        {!filtered.length && <p className="wfd-empty">No sentences in this view. Choose “All sentences” to keep learning.</p>}
        <p className="wfd-bank-footnote">{data.sentences.length ? `${data.sentences.filter(sentence => sentence.image).length} illustrated · ${data.sentences[0].source.edition}` : "6 original examples. Import your personal WFD bank above."}</p>
      </aside>
      {selected ? <WfdSession key={`${selected.id}:${mode}:${sessionRevision}`} sentence={selected} mode={mode} exposed={exposedIds.has(selected.id)} onExpose={() => expose(selected.id)} onAttempt={record} nextAvailable={selectedIndex + 1 < filtered.length} onNext={() => {
        expose(selected.id); setSelectedId(filtered[selectedIndex + 1].id); setSessionRevision(value => value + 1);
      }} /> : <section className="mimi-panel wfd-empty-state"><Check size={36} strokeWidth={1.3} /><h2>A little room to breathe.</h2><p>{filter === "due" ? "Nothing is due right now. You can study a new sentence or return later." : "Try another view, or import your sentence bank."}</p><button className="wfd-primary" onClick={() => setFilter("all")}>Browse all sentences</button></section>}
    </div>}
    <footer className="wfd-workspace-footer"><span>{personName}’s WFD space · saved in this browser</span><span>单独的 WFD 备份 · 不自动同步到其他设备</span></footer>
  </div>;
}

function WfdBankPanel({ data, personId, onSave, onRestore, onImported, onError }: {
  data: WfdData | null; personId: string; onSave: (data: WfdData) => boolean;
  onRestore: (data: WfdData) => void; onImported: (count: number) => void; onError: (message: string) => void;
}) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<WfdSentence[] | null>(null);
  const [backup, setBackup] = useState<WfdData | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  function inspect(text: string) {
    setRaw(text); setPreview(null); setBackup(null); setConfirm(false);
    try {
      const value = JSON.parse(text) as { version?: number; personId?: string };
      if (value && value.version !== undefined && value.personId) setBackup(parseWfdBackup(text, personId));
      else setPreview(parseWfdSentenceImport(text));
      onError("");
    } catch (cause) { onError(message(cause)); }
  }
  return <section className="wfd-bank-panel mimi-panel" aria-label="Manage WFD bank">
    <div className="wfd-bank-panel-title"><h2>Your own collection</h2><span>Import · export · restore</span></div>
    <p>题库和听写记录仅保存在当前浏览器，请定期导出。WFD 备份与原网站词汇备份分开；导入题库会保留现有记录。</p>
    <div className="wfd-bank-tools"><label className="wfd-secondary"><Upload size={16} aria-hidden="true" /> Open JSON file<input type="file" accept=".json,application/json" aria-label="Open WFD JSON file" onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return;
      if (file.size > 25_000_000) { onError("Maximum file size is 25 MB."); return; }
      try { inspect(await file.text()); } catch (cause) { onError(message(cause)); }
      event.target.value = "";
    }} /></label><button className="wfd-secondary" disabled={!data} onClick={() => { if (data) downloadJson(exportWfdBackup(data), `mimi-wfd-${personId}-${new Date().toISOString().slice(0,10)}.json`); }}><Download size={16} aria-hidden="true" /> Export WFD backup</button>
      <button className="wfd-text-button" disabled={!data?.sentences.length} onClick={() => { if (data) downloadJson(JSON.stringify({ sentences: data.sentences }, null, 2), "mimi-wfd-sentence-bank.json"); }}>Export sentences only</button></div>
    <details><summary>Paste sentence JSON</summary><label htmlFor="wfd-import-json">Sentence bank or WFD backup JSON</label><textarea id="wfd-import-json" value={raw} onChange={event => { setRaw(event.target.value); setPreview(null); setBackup(null); setConfirm(false); }} placeholder='{"sentences": […]}' /><button className="wfd-secondary" disabled={!raw.trim()} onClick={() => inspect(raw)}>Preview import</button></details>
    {preview && <div className="wfd-import-preview"><strong>{preview.length} sentences ready to import</strong><p>{preview[0].source.name} · {preview[0].source.edition}</p><p lang="en">{preview[0].text}</p><p>{preview.filter(sentence => sentence.image).length} illustrated · {preview.filter(sentence => !sentence.translationZh).length} awaiting translation</p><button className="wfd-primary" disabled={!data} onClick={() => {
      if (!data) return; try { const next = mergeWfdSentences(data.sentences, preview); if (onSave({ ...data, sentences: next, updatedAt: new Date().toISOString() })) onImported(preview.length); }
      catch (cause) { onError(message(cause)); }
    }}>Import these sentences</button></div>}
    {backup && <div className="wfd-import-preview"><strong>Restore {backup.sentences.length} sentences and {backup.attempts.length} attempts</strong><p>这将替换当前学习者的 WFD 数据。恢复前会保留本机原始副本；其他人的记录及词汇数据不变。建议先导出当前备份。</p><label><input type="checkbox" checked={confirm} onChange={event => setConfirm(event.target.checked)} /> 我确认用此备份替换当前 WFD 数据</label><button className="wfd-primary" disabled={!confirm} onClick={() => {
      try { const result = restoreWfdBackup(personId, raw); onRestore(result.data); setRecoveryKey(result.recoveryStorageKey); setBackup(null); setRaw(""); } catch (cause) { onError(message(cause)); }
    }}>Restore WFD backup</button></div>}
    {recoveryKey && <p role="status">WFD 备份已恢复。<button className="wfd-text-button" onClick={() => {
      try { const previous = window.localStorage.getItem(recoveryKey); if (previous) downloadJson(previous, "mimi-wfd-before-restore.json"); }
      catch (cause) { onError(message(cause)); }
    }}>下载恢复前的原始副本</button></p>}
  </section>;
}
