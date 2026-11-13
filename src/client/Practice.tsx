import type { PracticeWorkerResponse } from "./practice-worker";
import styles from "./mahjong/PracticeLesson.module.css";
import { useEffect, useMemo, useState } from "react";
import { gameCatalogue } from "../domain/catalogue";
import {
  initialMahjongLesson,
  advanceMahjongLesson,
  mahjongLesson,
} from "./mahjong/practice-lesson";
import type { RoomConfig, Snapshot } from "../domain/protocol";
import type { Action } from "../domain/types";
import { OriginalGameLazy } from "./OriginalGameLazy";
import { BeginnerGuide } from "./BeginnerGuide";
import { Button } from "./ui/Controls";
import { createPracticeSession } from "./practice-room";

function PracticeSession({
  source,
  onReset,
  onClose,
}: {
  source: RoomConfig;
  onReset: () => void;
  onClose: () => void;
}) {
  const session = useMemo(() => createPracticeSession(source), [source]);
  const [lessonProgress, setLessonProgress] = useState(initialMahjongLesson);
  const [snapshot, setSnapshot] = useState<Snapshot>(() =>
    session.room.snapshot(session.token),
  );
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(true);
  const [guideSlot, setGuideSlot] = useState<HTMLDivElement | null>(null);
  const game = gameCatalogue[source.kind];
  useEffect(() => {
    const worker = new Worker(
      new URL("./practice-worker.ts", import.meta.url),
      { type: "module" },
    );
    let busy = false,
      disposed = false,
      workerFailed = false,
      failedVersion = -1;
    worker.onmessage = (event: MessageEvent<PracticeWorkerResponse>) => {
      if (disposed) return;
      busy = false;
      if (event.data.version !== session.room.version) return;
      if ("error" in event.data) {
        failedVersion = event.data.version;
        setError(event.data.error);
        return;
      }
      try {
        session.room.acceptDecision(event.data.result, event.data.version);
        setSnapshot(session.room.snapshot(session.token));
      } catch (error) {
        failedVersion = event.data.version;
        setError(String(error));
      }
    };
    worker.onerror = (event) => {
      if (disposed) return;
      workerFailed = true;
      busy = false;
      setError(event.message);
    };
    const timer = setInterval(() => {
      if (
        busy ||
        workerFailed ||
        failedVersion === session.room.version ||
        session.room.hasEnded
      )
        return;
      const request = session.room.aiRequest();
      if (!request) return;
      busy = true;
      worker.postMessage({ request, version: session.room.version });
    }, 450);
    return () => {
      disposed = true;
      clearInterval(timer);
      worker.terminate();
    };
  }, [session]);
  const lesson = mahjongLesson(snapshot, lessonProgress);
  const act = (action: Action) => {
    try {
      session.room.act(
        session.token,
        `practice:${Date.now()}`,
        session.room.version,
        action,
      );
      setSnapshot(session.room.snapshot(session.token));
      setLessonProgress((progress) => advanceMahjongLesson(progress, action));
      setError("");
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
    }
  };
  return (
    <main className="practice-shell">
      <header className="practice-heading">
        <div>
          <strong>练习 · {game.name}</strong>
          <small>教学 AI · 不会发送到真实房间</small>
        </div>
        {error && <span role="status">{error}</span>}
        <div className="practice-actions">
          <Button
            aria-pressed={guideOpen}
            onClick={() => setGuideOpen((value) => !value)}
          >
            {guideOpen ? "隐藏引导" : "显示引导"}
          </Button>
          <Button onClick={onReset}>重新开始</Button>
          <Button onClick={onClose}>退出练习</Button>
        </div>
      </header>
      <div className="practice-layout" data-guide-open={guideOpen}>
        <section
          className={`game-area practice-game-area ${styles.table}`}
          data-lesson={
            source.kind === "scmj" && guideOpen && !lesson?.complete
              ? snapshot.state?.kind === "scmj" &&
                snapshot.state.view.phase === "lack"
                ? "lack"
                : snapshot.state?.kind === "scmj" &&
                    snapshot.state.view.phase === "response"
                  ? "response"
                  : "hand"
              : undefined
          }
        >
          {lesson && guideOpen && (
            <section className={styles.task} aria-label="麻将实操任务">
              <ol>
                {lesson.steps.map((title, index) => (
                  <li
                    key={title}
                    aria-current={index === lesson.stage ? "step" : undefined}
                  >
                    {title}
                  </li>
                ))}
              </ol>
              <strong role="status">{lesson.title}</strong>
              <p>{lesson.hint}</p>
              <span>已完成 {Math.min(3, lesson.discards)} / 3 次出牌</span>
              {lesson.complete && (
                <Button onClick={() => setGuideOpen(false)}>
                  继续自由练习
                </Button>
              )}
            </section>
          )}

          <OriginalGameLazy
            snapshot={snapshot}
            act={act}
            end={onClose}
            replay={false}
          />
          <BeginnerGuide
            kind={source.kind}
            snapshot={snapshot}
            dock={guideSlot}
            enabled={guideOpen}
            visible={guideOpen}
            onChange={setGuideOpen}
            showToggle={false}
            showLocator={false}
          />
        </section>
        <aside className="room-sidebar practice-sidebar" hidden={!guideOpen}>
          <div
            ref={setGuideSlot}
            className="room-guide-slot"
            hidden={!guideOpen}
          />
        </aside>
      </div>
    </main>
  );
}

export function Practice({
  source,
  onClose,
}: {
  source: RoomConfig;
  onClose: () => void;
}) {
  const [reset, setReset] = useState(0);
  return (
    <PracticeSession
      key={reset}
      source={source}
      onReset={() => setReset((value) => value + 1)}
      onClose={onClose}
    />
  );
}
