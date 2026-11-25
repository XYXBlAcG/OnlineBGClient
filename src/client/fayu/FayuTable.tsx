import { useEffect, useMemo, useRef, useState } from "react";
import type { GameSnapshot } from "../OriginalGame";
import type { Action } from "../../domain/types";
import type { FayuState, FayuSentence } from "../../domain/fayu/types";
import { fayuLimits } from "../../domain/fayu/types";
import { fayuTemplateById, type FayuSlotKind } from "../../domain/fayu/templates";
import { pickFayuSentence } from "../../domain/fayu/generator";
import { fayuPoolComplete } from "../../domain/fayu/words";
import { useTurnClock } from "../use-turn-clock";
import { Button } from "../ui/Controls";
import { CanvasEdits } from "./canvas-edits";
import { FayuCanvas } from "./FayuCanvas";
import { DrawingPreview } from "./DrawingPreview";
import { setClozeSlot, type ClozeDraft } from "./cloze-draft";
import { FayuDrawing } from "./FayuDrawing";
import { FayuLibraryPanel } from "./FayuLibraryPanel";
import { fayuCombinedPool, loadFayuLibrary, saveFayuLibrary, subscribeFayuLibrary, type FayuLibrary } from "./library";
import "./fayu.css";

type View = FayuState["view"];
const labels = "ABCDEFGH";
const slotNames: Record<FayuSlotKind, string> = {
  agent: "谁",
  patient: "对象",
  thing: "东西",
  place: "地点",
  adv: "怎样地",
  adj: "什么样的",
  verb: "动作",
  verb2: "另一个动作",
  proper: "角色",
};

function templateLabel(templateId: string) {
  const template = fayuTemplateById.get(templateId);
  if (!template) return templateId;
  return template.pattern.replace(/\{[^}]+\}/g, "＿＿");
}

function SentenceChips({ sentence }: { sentence: FayuSentence }) {
  return (
    <div className="fayu-sentence">
      {sentence.words.map((word, index) => <span key={`${word}-${index}`}>{word}</span>)}
    </div>
  );
}

function ClozeGuess({
  drawing, challenge, actor, pending, replay, view, act, draft, onDraft,
}: {
  drawing: number;
  challenge: NonNullable<View["challenges"][number]>;
  actor: number;
  pending: boolean;
  replay: boolean;
  view: View;
  act: (action: Action) => void;
  draft?: ClozeDraft;
  onDraft: (draft: ClozeDraft) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const guess = view.guesses[actor]?.[drawing];
  const done = !!guess?.correct || (guess?.attempts ?? 0) >= fayuLimits.maxAttempts;
  const locked = done || pending || replay;
  const templateId = (done ? guess?.templateId : draft?.templateId) ?? challenge.templateChoices[0];
  const template = fayuTemplateById.get(templateId ?? "");
  if (!template || !templateId) return null;
  const assignments = template.slots.map((_, index) =>
    (done ? guess?.words[index] : draft?.assignments[index]) ?? null,
  );
  const place = (slot: number, value: string | null) => {
    if (locked || (value !== null && !challenge.wordBank.includes(value))) return;
    onDraft(setClozeSlot({ templateId, assignments }, slot, value));
    setSelected(null);
  };
  const used = new Set(assignments.filter(Boolean));
  const ready = assignments.every((word) => word !== null);
  return (
    <div className="fayu-cloze">
      <div className="fayu-template-choices" aria-label="句式">
        {challenge.templateChoices.map((choice) => (
          <button key={choice} type="button" aria-pressed={templateId === choice} data-active={templateId === choice} disabled={locked} onClick={() => {
            if (choice !== templateId) onDraft({ templateId: choice, assignments: [] });
            setSelected(null);
          }}>
            {templateLabel(choice)}
          </button>
        ))}
      </div>
      <div className="fayu-cloze-line" aria-label="填空句式">
        {template.pattern.split(/(\{[^}]+\})/g).filter(Boolean).map((token, index) => {
          if (!token.startsWith("{")) return <span key={index}>{token}</span>;
          const slot = template.slots.findIndex((item) => `{${item.key}}` === token);
          if (slot < 0) return null;
          const label = slotNames[template.slots[slot]!.kind];
          const word = assignments[slot] ?? null;
          return (
            <button
              key={index}
              type="button"
              className="fayu-blank"
              aria-label={word ? `${label}，${word}` : label}
              data-filled={word !== null}
              data-target={selected !== null && !locked}
              disabled={locked}
              onClick={() => place(slot, selected)}
              onDragOver={(event) => { if (!locked) event.preventDefault(); }}
              onDrop={(event) => {
                event.preventDefault();
                const value = event.dataTransfer.getData("text/fayu-word");
                if (value) place(slot, value);
              }}
            >{word ?? label}</button>
          );
        })}
      </div>
      <div className="fayu-word-bank" aria-label="词块">
        {challenge.wordBank.map((word) => (
          <button
            key={word}
            type="button"
            draggable={!locked}
            data-used={used.has(word)}
            data-selected={selected === word}
            aria-pressed={selected === word}
            disabled={locked}
            onDragStart={(event) => event.dataTransfer.setData("text/fayu-word", word)}
            onClick={() => setSelected(selected === word ? null : word)}
          >{word}</button>
        ))}
      </div>
      <div className="fayu-cloze-footer">
        <small role="status">{guess?.correct ? "猜中了" : done ? "次数已用完" : guess ? `还没猜中，剩 ${fayuLimits.maxAttempts - guess.attempts} 次` : `可猜 ${fayuLimits.maxAttempts} 次`}</small>
        <Button type="button" disabled={locked || !ready} onClick={() => {
          if (ready) act({ type: "draw-cloze", round: view.round, drawing, templateId, words: assignments as string[] });
        }}>检查</Button>
      </div>
    </div>
  );
}

export function FayuTable({
  view,
  snapshot,
  act,
  control,
  pending,
  replay,
}: {
  view: View;
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  control?: (action: Action) => void;
  pending: boolean;
  replay: boolean;
}) {
  const [library, setLibrary] = useState<FayuLibrary>(() => loadFayuLibrary());
  useEffect(() => subscribeFayuLibrary(() => setLibrary(loadFayuLibrary())), []);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [draft, setDraft] = useState<FayuSentence | null>(null);
  const [rerolls, setRerolls] = useState(0);
  const actor = snapshot.actor;
  const canvasId = `${snapshot.room}:${view.round}`;
  const seatKey = snapshot.seats[actor]?.id ?? String(actor);
  const canvases = useRef({ id: canvasId, edits: new Map<string, CanvasEdits>() });
  if (canvases.current.id !== canvasId)
    canvases.current = { id: canvasId, edits: new Map() };
  let edits = canvases.current.edits.get(seatKey);
  if (!edits) {
    edits = new CanvasEdits();
    canvases.current.edits.set(seatKey, edits);
  }

  const ownPrompt = view.prompts[actor];
  const submitted = view.submitted.includes(actor);
  const time = useTurnClock(snapshot.turnDeadline, snapshot.serverTime, !!snapshot.paused);
  const pool = useMemo(() => fayuCombinedPool(library), [library]);
  const ready = fayuPoolComplete(pool);
  useEffect(() => {
    if (replay || view.phase !== "prompting" || submitted) return;
    setDraft(ready ? pickFayuSentence(pool, Math.random) : null);
    setRerolls(0);
  }, [replay, view.phase, view.round, submitted, ready, pool]);
  const changeLibrary = (next: FayuLibrary) => {
    setLibrary(next);
    saveFayuLibrary(next);
  };
  const drawings = view.canvases.map((canvas, index) => ({ canvas, index })).filter((item) => item.index !== actor);
  const [clozeDrafts, setClozeDrafts] = useState<Record<string, ClozeDraft>>({});
  useEffect(() => setClozeDrafts({}), [view.round]);
  const [selectedDrawing, setSelectedDrawing] = useState<number | null>(null);
  const activeDrawing = selectedDrawing !== null && selectedDrawing !== actor && view.challenges[selectedDrawing] ? selectedDrawing : drawings.find((item) => view.challenges[item.index])?.index ?? null;
  const seatName = (index: number) => snapshot.seats[index]?.name || `玩家 ${index + 1}`;
  const scores = view.scores.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score);
  const stage = view.phase === "prompting"
    ? "出题"
    : view.phase === "drawing"
      ? "同时作画"
      : view.phase === "guessing"
        ? "猜句"
        : view.phase === "results"
          ? "本轮结果"
          : "结束";
  return (
    <section className="fayu-table" aria-label="法语">
      <header className="fayu-head">
        <div>
          <small>第 {view.round + 1} 轮</small>
          <h2>{stage}</h2>
        </div>
        <div className="fayu-tags">
          {time !== null && view.phase !== "results" && view.phase !== "finished" && <span className="fayu-clock">{time} 秒</span>}
          <button type="button" className="fayu-library-open" onClick={() => setLibraryOpen(true)}>
            我的词库
            <small>{pool.words.length} 词</small>
          </button>
        </div>
      </header>

      {view.phase === "prompting" && (
        <div className="fayu-prompt-stage">
          {submitted ? <p>已提交，等其他人。</p> : !ready || !draft ? <p>请在词库启用更多可搭配的词。</p> : (
            <>
              <div className="fayu-prompt-card">
                <strong>{draft.text}</strong>
                <SentenceChips sentence={draft} />
              </div>
              <div className="fayu-actions">
                <Button type="button" disabled={pending || replay || rerolls >= 2} onClick={() => { const next = pickFayuSentence(pool, Math.random); if (next) { setDraft(next); setRerolls(rerolls + 1); } }}>换一句 {2 - rerolls}</Button>
                <Button type="button" disabled={pending || replay} onClick={() => act({ type: "draw-prompt", round: view.round, templateId: draft.templateId, words: draft.words })}>就画这个</Button>
              </div>
            </>
          )}
          <div className="fayu-waiting">
            {view.submitted.map((index) => <span key={index}>{seatName(index)}</span>)}
          </div>
        </div>
      )}

      {view.phase === "drawing" && (
        <div className="fayu-drawing-stage">
          <div className="fayu-drawing-info">
            <strong>{ownPrompt?.text ?? ""}</strong>
            <span>{view.finished.length} / {view.players} 已完成</span>
          </div>
          <FayuCanvas
            key={`${canvasId}:${seatKey}`}
            history={view.history}
            edits={edits}
            strokes={view.canvases[actor] ?? []}
            fills={view.fills[actor] ?? []}
            enabled={!replay && !snapshot.paused && !view.finished.includes(actor)}
            pending={pending}
            round={view.round}
            act={act}
            limits={fayuLimits}
            showTools={!replay && !view.finished.includes(actor)}
            finish={!replay && !view.finished.includes(actor) ? {
              action: { type: "draw-finish", round: view.round },
              label: "画完了",
            } : undefined}
          />
        </div>
      )}

      {view.phase === "guessing" && activeDrawing !== null && (
        <div className="fayu-guess-stage">
          <div className="fayu-gallery">
            {drawings.map((item) => (
              <button key={item.index} type="button" className="fayu-thumb" data-active={activeDrawing === item.index} onClick={() => setSelectedDrawing(item.index)}>
                <FayuDrawing strokes={item.canvas} fills={view.fills[item.index] ?? []} />
                <span>{labels[item.index]}{view.guesses[actor]?.[item.index]?.correct ? " ✓" : ""}</span>
              </button>
            ))}
          </div>
          <div className="fayu-guess-panel">
            <DrawingPreview strokes={view.canvases[activeDrawing] ?? []} fills={view.fills[activeDrawing] ?? []} />
            {view.players > 2 && (
              <div className="fayu-vote-row">
                <Button
                  type="button"
                  disabled={pending || replay || view.votes[actor] !== undefined}
                  onClick={() => act({ type: "draw-vote", round: view.round, drawing: activeDrawing })}
                >
                  {view.votes[actor] === undefined
                    ? `投票 · ${labels[activeDrawing]} 作者 +1`
                    : `已投 ${labels[view.votes[actor]!]}`}
                </Button>
              </div>
            )}
            {view.challenges[activeDrawing] && (
              <ClozeGuess
                key={`${view.round}:${actor}:${activeDrawing}`}
                drawing={activeDrawing}
                challenge={view.challenges[activeDrawing]!}
                draft={clozeDrafts[`${actor}:${activeDrawing}`]}
                onDraft={(draft) => setClozeDrafts((current) => ({ ...current, [`${actor}:${activeDrawing}`]: draft }))}
                actor={actor}
                pending={pending}
                replay={replay}
                view={view}
                act={act}
              />
            )}
          </div>
        </div>
      )}

      {view.phase === "results" && (
        <div className="fayu-results">
          <div className="fayu-score-list">
            {scores.map(({ score, index }) => <div key={index} data-actor={index === actor} data-winner={index === scores[0]?.index}><span>{seatName(index)}</span><strong>{score}</strong></div>)}
          </div>
          <div className="fayu-reveal-grid">
            {view.canvases.map((canvas, index) => (
              <article key={index}>
                <FayuDrawing strokes={canvas} fills={view.fills[index] ?? []} />
                <small>{labels[index]} ·
                  {seatName(index)} ·{" "}
                  {Object.values(view.votes).filter((drawing) => drawing === index).length} 票 ·{" "}
                  {Object.values(view.guesses).filter((guesses) => guesses[index]?.correct).length} 人猜中
                </small>
                <strong>{view.prompts[index]?.text}</strong>
              </article>
            ))}
          </div>
          {control ? (
            <div className="fayu-actions">
              <Button type="button" disabled={pending || snapshot.paused} onClick={() => control({ type: "draw-round", round: view.round })}>下一轮</Button>
              <Button type="button" variant="danger" disabled={pending || snapshot.paused} onClick={() => control({ type: "draw-end", round: view.round })}>结束游戏</Button>
            </div>
          ) : (
            <small>等待房主开始下一轮</small>
          )}
        </div>
      )}

      {view.phase === "finished" && (
        <div className="fayu-results">
          <div className="fayu-score-list">
            {scores.map(({ score, index }) => <div key={index} data-actor={index === actor} data-winner={index === scores[0]?.index}><span>{seatName(index)}</span><strong>{score}</strong></div>)}
          </div>
        </div>
      )}

      <FayuLibraryPanel open={libraryOpen} library={library} onChange={changeLibrary} onClose={() => setLibraryOpen(false)} />
    </section>
  );
}
