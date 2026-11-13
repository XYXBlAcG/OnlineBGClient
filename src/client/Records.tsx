import type { ReplayMarker, ReplayBookmark } from "../domain/replay-timeline";
import { adjacentReplay, replayPlaylist } from "./replay-playlist";
import { ReplayParty } from "./party/ReplayParty";
import { PartyLedger } from "../domain/party";
import { ReplayBanners } from "./social/ReplayBanners";
import { auxiliaryView } from "./native/contract";
import { useNativeWindow } from "./native/windows";
import { useEffect, useState, useRef } from "react";
import { gameCatalogue } from "../domain/catalogue";
import { Replay, type ReplayRecord } from "../domain/replay";
import type { GameState } from "../domain/types";
import { protocolVersion, type Snapshot } from "../domain/protocol";
import { ClientStore, subscribeRecords } from "./storage";
import { exportJson, importJson } from "./files";
import { OriginalGameLazy } from "./OriginalGameLazy";
import { Panel, Select, Slider, Switch } from "./ui/Controls";

export function Records({
  open,
  onOpenChange,
  onError,
  onReady,
}: {
  onReady?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (message: string) => void;
}) {
  const detached = useNativeWindow(
    "records",
    open,
    { view: "records" },
    (intent) => {
      if (intent.type === "close") onOpenChange(false);
      if (intent.type === "error") onError(intent.message);
    },
  );
  const [store] = useState(() => new ClientStore());
  const [timeline, setTimeline] = useState<ReplayMarker[]>([]);
  const [bookmarks, setBookmarks] = useState<ReplayBookmark[]>([]);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [records, setRecords] = useState<ReplayRecord[]>([]);
  const [selected, setSelected] = useState<ReplayRecord | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const bookmarkBusy = useRef(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  async function persistBookmarks(items: ReplayBookmark[]) {
    const record = selectedRef.current;
    if (!record || bookmarkBusy.current) return;
    bookmarkBusy.current = true;
    setSavingBookmark(true);
    try {
      await store.saveBookmarks(record, items);
      if (selectedRef.current === record) {
        setBookmarks(items);
        setBookmarkLabel("");
      }
    } catch (error) {
      onError(String(error));
    } finally {
      bookmarkBusy.current = false;
      setSavingBookmark(false);
    }
  }
  const [frame, setFrame] = useState<{
    index: number;
    actor: number;
    state: GameState;
  } | null>(null);
  const replayWorker = useRef<Worker | null>(null);
  const wantedFrame = useRef(0);
  const frameCache = useRef(new Map<string, GameState>());
  const requestedFrames = useRef(new Set<string>());
  const frameCount = selected
    ? Math.max(
        selected.events.length + 1,
        ...(selected.party ?? []).map(
          ({ frame, event }) =>
            frame +
            Math.ceil(
              (event.time - (event.createdAt ?? event.time) + event.duration) /
                1000,
            ) +
            1,
        ),
      )
    : 0;
  const [step, setStep] = useState(0);
  const gameStep = selected ? Math.min(step, selected.events.length) : 0;
  wantedFrame.current = gameStep;
  const [actor, setActor] = useState(0);
  const [continuous, setContinuous] = useState(false);
  const wantedActor = useRef(actor);
  wantedActor.current = actor;
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open || detached) return;
    let active = true;
    const refresh = () => {
      void store
        .records()
        .then((records) => {
          if (active)
            setRecords(records.sort((a, b) => b.startedAt - a.startedAt));
        })
        .catch((error) => onError(String(error)))
        .finally(() => {
          if (active) onReady?.();
        });
    };
    refresh();
    const unsubscribe = subscribeRecords(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [open, detached, store]);
  useEffect(() => {
    if (!selected) return;
    setTimeline([]);
    setBookmarks([]);
    setBookmarkLabel("");
    let notesActive = true;
    setLoadingBookmarks(true);
    void store
      .bookmarks(selected)
      .then((items) => {
        if (notesActive) setBookmarks(items);
      })
      .catch((error) => onError(String(error)))
      .finally(() => {
        if (notesActive) setLoadingBookmarks(false);
      });
    frameCache.current.clear();
    requestedFrames.current.clear();
    setFrame(null);
    setLoading(true);
    let active = true;
    const worker = new Worker(new URL("./replay-worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event) => {
      if (!active) return;
      if (event.data.timelineError) onError(event.data.timelineError);
      if (event.data.timeline) {
        setTimeline(event.data.timeline);
        return;
      }
      if (event.data.error) {
        setLoading(false);
        onError(event.data.error);
        return;
      }
      for (const item of event.data.frames ?? []) {
        frameCache.current.set(`${event.data.actor}:${item.index}`, item.state);
        if (frameCache.current.size > 160)
          frameCache.current.delete(frameCache.current.keys().next().value!);
        requestedFrames.current.delete(`${event.data.actor}:${item.index}`);
      }
      const wanted = frameCache.current.get(
        `${event.data.actor}:${wantedFrame.current}`,
      );
      if (wanted && event.data.actor === wantedActor.current) {
        setFrame({
          index: wantedFrame.current,
          state: wanted,
          actor: event.data.actor,
        });
        setLoading(false);
      }
    };
    worker.onerror = (event) => {
      if (!active) return;
      setLoading(false);
      onError(event.message);
    };
    replayWorker.current = worker;
    worker.postMessage({ record: selected, actor, indexes: [0] });
    return () => {
      active = false;
      notesActive = false;
      worker.terminate();
      replayWorker.current = null;
    };
  }, [selected]);
  useEffect(() => {
    if (!selected || !replayWorker.current) return;
    const worker = replayWorker.current;
    const key = `${actor}:${gameStep}`;
    const cached = frameCache.current.get(key);
    if (cached) {
      setFrame({ index: gameStep, state: cached, actor });
      setLoading(false);
    } else {
      setLoading(true);
    }
    const indexes = [
      gameStep,
      ...Array.from(
        { length: Math.max(6, Math.ceil(speed * 4)) },
        (_, index) => gameStep + index + 1,
      ),
    ].filter((index) => index < frameCount);
    const missing = indexes.filter((index) => {
      const frameKey = `${actor}:${index}`;
      if (
        frameCache.current.has(frameKey) ||
        requestedFrames.current.has(frameKey)
      )
        return false;
      requestedFrames.current.add(frameKey);
      return true;
    });
    if (missing.length) worker.postMessage({ actor, indexes: missing });
  }, [gameStep, actor, speed, frameCount, selected]);
  useEffect(() => {
    if (!selected || loading || !playing || frameCount < 2) return;
    let frameId = 0,
      previous = performance.now(),
      carry = 0;
    const tick = (now: number) => {
      carry += ((now - previous) / 1000) * speed;
      previous = now;
      const advance = Math.floor(carry);
      if (advance > 0) {
        carry -= advance;
        setStep((value) => {
          const next = Math.min(value + advance, frameCount - 1);

          return next;
        });
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [selected, loading, playing, frameCount, speed]);
  const selectRecord = (record: ReplayRecord, autoplay = false) => {
    setFrame(null);
    setStep(0);
    setLoading(true);
    setSelected(record);
    setActor((value) => Math.min(value, record.names.length - 1));
    setPlaying(autoplay);
  };
  useEffect(() => {
    if (!selected || loading || !playing || step < frameCount - 1) return;
    const next = continuous ? adjacentReplay(records, selected, 1) : undefined;
    if (next) selectRecord(next, true);
    else setPlaying(false);
  }, [step, frameCount, loading, playing, continuous, selected, records]);
  if (detached) return null;
  const preview: Snapshot | null =
    selected && frame && frame.actor === actor
      ? {
          serverTime: Date.now(),
          apiVersion: protocolVersion,
          rulesVersion: selected.rulesVersion,
          room: selected.room,
          kind: selected.config.kind,
          config: selected.config,
          version: frame.index,
          actor,
          canManage: false,
          playing: false,
          host: null,
          seats: selected.names.map((name, index) => ({
            id: `replay:${index}`,
            name,
            avatar: selected.avatars?.[index],
            difficulty: null,
            online: true,
            ready: true,
          })),
          state: frame.state,
          candidates: [],
          computation: null,
          aiPaused: false,
          bannerPolicy: { mode: "off", members: [] },
          party: new PartyLedger().snapshot({
            players: [],
            observers: [],
            round: "replay",
            playing: false,
            finished: false,
          }),
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
      <Panel
        open={open && (!auxiliaryView || !selected)}
        onOpenChange={onOpenChange}
        title="对局记录"
      >
        <div className="section-toolbar">
          <button
            onClick={async () => {
              try {
                const input = await importJson();
                if (!input) return;
                const replay = new Replay(input);
                replay.frame(replay.record.events.length);
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
                selectRecord(record);
                if (!auxiliaryView) onOpenChange(false);
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
          className="ui-panel-wide replay-panel"
          open={!!selected}
          onOpenChange={(value) => {
            if (!value) {
              setPlaying(false);
              setSelected(null);
            }
          }}
          title={`${gameCatalogue[selected.config.kind].name} · 回放`}
        >
          {auxiliaryView && (
            <button
              onClick={() => {
                setSelected(null);
                setPlaying(false);
              }}
            >
              返回记录
            </button>
          )}
          <div className="replay-controls">
            <button
              disabled={!adjacentReplay(records, selected, -1)}
              onClick={() =>
                selectRecord(adjacentReplay(records, selected, -1)!)
              }
            >
              上一局
            </button>
            <span>
              第{" "}
              {replayPlaylist(records, selected).findIndex(
                (record) => record.startedAt === selected.startedAt,
              ) + 1}{" "}
              / {replayPlaylist(records, selected).length} 局
            </span>
            <button
              disabled={!adjacentReplay(records, selected, 1)}
              onClick={() =>
                selectRecord(adjacentReplay(records, selected, 1)!)
              }
            >
              下一局
            </button>
            <Switch
              checked={continuous}
              onCheckedChange={setContinuous}
              label={
                selected.config.kind === "expedition"
                  ? "连续播放本次远征"
                  : "连续播放本房间"
              }
            />
            <button
              disabled={step === 0}
              onClick={() => {
                setPlaying(false);
                setStep((value) => Math.max(0, value - 1));
              }}
            >
              上一步
            </button>
            <button
              disabled={step >= frameCount - 1}
              onClick={() => {
                setPlaying(false);
                setStep((value) => Math.min(frameCount - 1, value + 1));
              }}
            >
              下一步
            </button>

            <button
              disabled={loading || frameCount < 2}
              onClick={() => {
                if (!playing && step === frameCount - 1) setStep(0);
                setPlaying((value) => !value);
              }}
            >
              {playing
                ? "暂停回放"
                : step === frameCount - 1 && frameCount > 1
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
              onValueChange={(value) => {
                setFrame(null);
                setLoading(true);
                setActor(Number(value));
              }}
            >
              {selected.names.map((name, index) => (
                <option key={index} value={index}>
                  {name}
                </option>
              ))}
            </Select>
            <span>
              {step} / {Math.max(0, frameCount - 1)}
            </span>
            <Slider
              aria-label="回放进度"
              value={step}
              min={0}
              max={Math.max(1, frameCount - 1)}
              step={1}
              onValueChange={(value) => {
                setPlaying(false);
                setStep(Math.min(value, Math.max(0, frameCount - 1)));
              }}
            />
          </div>
          <details>
            <summary>时间轴与书签</summary>
            {timeline.length > 0 && (
              <Select
                aria-label="章节与节点"
                value="choose"
                onValueChange={(value) => {
                  setPlaying(false);
                  setStep(timeline[Number(value)].frame);
                }}
              >
                <option value="choose">跳转到章节或节点</option>
                {timeline.map((item, i) => (
                  <option key={i} value={i}>
                    {item.label}（{item.frame}）
                  </option>
                ))}
              </Select>
            )}
            <input
              aria-label="书签说明"
              maxLength={80}
              value={bookmarkLabel}
              onChange={(event) => setBookmarkLabel(event.target.value)}
            />
            <button
              disabled={savingBookmark || loadingBookmarks}
              onClick={() =>
                void persistBookmarks(
                  [
                    ...bookmarks.filter((item) => item.frame !== gameStep),
                    {
                      frame: gameStep,
                      label: bookmarkLabel.trim() || `第 ${gameStep} 步`,
                    },
                  ].sort((a, b) => a.frame - b.frame),
                )
              }
            >
              保存当前书签
            </button>
            {bookmarks.map((item) => (
              <div key={item.frame}>
                <button
                  onClick={() => {
                    setPlaying(false);
                    setStep(item.frame);
                  }}
                >
                  {item.label}
                </button>
                <button
                  aria-label={`删除书签${item.label}`}
                  disabled={savingBookmark || loadingBookmarks}
                  onClick={() =>
                    void persistBookmarks(
                      bookmarks.filter((mark) => mark.frame !== item.frame),
                    )
                  }
                >
                  删除
                </button>
              </div>
            ))}
          </details>
          {!loading && <ReplayBanners record={selected} step={step} />}
          {preview && (
            <ReplayParty
              record={selected}
              step={step}
              playing={playing && !loading}
              speed={speed}
              preview={preview}
            />
          )}
          {loading && <p role="status">正在定位回放…</p>}
          {preview && (
            <OriginalGameLazy
              replay
              animationActive={playing}
              animationRate={speed}
              snapshot={preview}
              act={() => {}}
              end={() => {}}
            />
          )}
        </Panel>
      )}
    </>
  );
}
