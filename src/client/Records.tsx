import { useEffect, useState, useMemo } from "react";
import { GameEngine } from "../domain/engine";
import { gameCatalogue } from "../domain/catalogue";
import { Replay, type ReplayRecord } from "../domain/replay";
import type { GameState } from "../domain/types";
import { protocolVersion, type Snapshot } from "../domain/protocol";
import { ClientStore } from "./storage";
import { exportJson, importJson } from "./files";
import { OriginalGame } from "./OriginalGame";
import { Panel, Select, Slider } from "./ui/Controls";

export function Records({
  open,
  onOpenChange,
  snapshot,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: Snapshot | null;
  onError: (message: string) => void;
}) {
  const engine = useMemo(() => new GameEngine(), []);
  const [store] = useState(() => new ClientStore());
  const [records, setRecords] = useState<ReplayRecord[]>([]);
  const [selected, setSelected] = useState<ReplayRecord | null>(null);
  const [frames, setFrames] = useState<GameState[]>([]);
  const [step, setStep] = useState(0);
  const [actor, setActor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (open)
      void store
        .records()
        .then((records) =>
          setRecords(records.sort((a, b) => b.startedAt - a.startedAt)),
        )
        .catch((error) => onError(String(error)));
  }, [open, store]);
  useEffect(() => {
    if (!snapshot) return;
    const records = [
      ...snapshot.records,
      ...(snapshot.replay ? [snapshot.replay] : []),
    ];
    void Promise.all(records.map((record) => store.saveRecord(record))).catch(
      (error) => onError(String(error)),
    );
  }, [snapshot?.replay, snapshot?.records, store]);
  useEffect(() => {
    if (!selected) return;
    const worker = new Worker(new URL("./replay-worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event) => {
      setLoading(false);
      if (event.data.error) onError(event.data.error);
      else setFrames(event.data.frames);
    };
    worker.onerror = (event) => {
      setLoading(false);
      onError(event.message);
    };
    worker.postMessage(selected);
    return () => worker.terminate();
  }, [selected]);
  useEffect(() => {
    if (!selected || loading || !playing || frames.length < 2) return;
    if (step >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => setStep((value) => Math.min(value + 1, frames.length - 1)),
      1000 / speed,
    );
    return () => window.clearTimeout(timer);
  }, [selected, loading, playing, frames.length, step, speed]);
  const preview: Snapshot | null =
    selected && frames[step]
      ? {
          apiVersion: protocolVersion,
          rulesVersion: selected.rulesVersion,
          room: selected.room,
          kind: selected.config.kind,
          config: selected.config,
          version: step,
          actor,
          canManage: false,
          playing: false,
          host: null,
          seats: selected.names.map((name, index) => ({
            id: `replay:${index}`,
            name,
            difficulty: null,
            online: true,
            ready: true,
          })),
          state: engine.project(frames[step], actor),
          candidates: [],
          computation: null,
          aiPaused: false,
          chat: [],
          chatSequence: 0,
          chatTotals: {},
          decisions: [],
          summaries: [],
          finished: true,
          resolving: false,
          paused: false,
          replay: selected,
          records: [],
        }
      : null;
  return (
    <>
      <Panel open={open} onOpenChange={onOpenChange} title="对局记录">
        <div className="section-toolbar">
          <button
            onClick={async () => {
              try {
                const input = await importJson();
                if (!input) return;
                const replay = new Replay(input);
                replay.frames();
                await store.saveRecord(replay.record);
                setRecords(await store.records());
              } catch (error) {
                onError(String(error));
              }
            }}
          >
            导入记录
          </button>
        </div>
        {!records.length && <p className="muted">结束对局后会自动保存记录。</p>}
        {records.map((record) => (
          <div
            className="record-row"
            key={`${record.room}:${record.startedAt}`}
          >
            <button
              onClick={() => {
                setFrames([]);
                setStep(0);
                setActor(0);
                setPlaying(false);
                setLoading(true);
                setSelected(record);
                onOpenChange(false);
              }}
            >
              {gameCatalogue[record.config.kind].name}
              <small>
                {new Date(record.startedAt).toLocaleString()} ·{" "}
                {record.names.join("、")}
              </small>
            </button>
            <button
              aria-label="导出记录"
              onClick={() =>
                void exportJson(record, `${record.room}.json`).catch((error) =>
                  onError(String(error)),
                )
              }
            >
              导出
            </button>
            <button
              aria-label="删除记录"
              onClick={async () => {
                await store.deleteRecord(record);
                setRecords(await store.records());
              }}
            >
              删除
            </button>
          </div>
        ))}
      </Panel>
      {selected && (
        <Panel
          className="ui-panel-wide"
          open={!!selected}
          onOpenChange={(value) => {
            if (!value) {
              setPlaying(false);
              setSelected(null);
            }
          }}
          title={`${gameCatalogue[selected.config.kind].name} · 回放`}
        >
          <div className="replay-controls">
            <button
              disabled={loading || frames.length < 2}
              onClick={() => {
                if (!playing && step === frames.length - 1) setStep(0);
                setPlaying((value) => !value);
              }}
            >
              {playing
                ? "暂停回放"
                : step === frames.length - 1 && frames.length > 1
                  ? "重新播放"
                  : "播放回放"}
            </button>
            <Select
              aria-label="回放速度"
              value={speed}
              onValueChange={(value) => setSpeed(Number(value))}
            >
              {[0.25, 0.5, 1, 2, 4].map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </Select>
            <Select
              aria-label="回放视角"
              value={actor}
              onValueChange={(value) => setActor(Number(value))}
            >
              {selected.names.map((name, index) => (
                <option key={index} value={index}>
                  {name}
                </option>
              ))}
            </Select>
            <span>
              {step} / {Math.max(0, frames.length - 1)}
            </span>
            <Slider
              aria-label="回放进度"
              value={step}
              min={0}
              max={Math.max(1, frames.length - 1)}
              step={1}
              onValueChange={(value) => {
                setPlaying(false);
                setStep(Math.min(value, Math.max(0, frames.length - 1)));
              }}
            />
          </div>
          {loading ? (
            <p>正在重放…</p>
          ) : (
            preview && (
              <OriginalGame
                replay
                snapshot={preview}
                act={() => {}}
                end={() => {}}
              />
            )
          )}
        </Panel>
      )}
    </>
  );
}
