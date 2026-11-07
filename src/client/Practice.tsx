import { useEffect, useMemo, useState } from "react";
import { gameCatalogue } from "../domain/catalogue";
import { Strategies } from "../domain/strategies";
import type { RoomConfig, Snapshot } from "../domain/protocol";
import type { Action } from "../domain/types";
import { OriginalGame } from "./OriginalGame";
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
  const strategies = useMemo(() => new Strategies(), []);
  const [snapshot, setSnapshot] = useState<Snapshot>(() =>
    session.room.snapshot(session.token),
  );
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(true);
  const [guideSlot, setGuideSlot] = useState<HTMLDivElement | null>(null);
  const game = gameCatalogue[source.kind];
  useEffect(() => {
    const timer = setInterval(() => {
      const room = session.room;
      if (room.hasEnded || !room.state) return;
      const request = room.aiRequest();
      if (!request) return;
      try {
        const decision = strategies.decide(
          request.observation,
          request.actor,
          request.difficulty,
          request.seed,
        );
        room.acceptDecision(decision, room.version);
        setSnapshot(room.snapshot(session.token));
      } catch (value) {
        setError(value instanceof Error ? value.message : String(value));
      }
    }, 450);
    return () => clearInterval(timer);
  }, [session, strategies]);
  const act = (action: Action) => {
    try {
      session.room.act(
        session.token,
        `practice:${Date.now()}`,
        session.room.version,
        action,
      );
      setSnapshot(session.room.snapshot(session.token));
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
        <section className="game-area practice-game-area">
          <OriginalGame
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
