import { useState } from "react";
import type { Action } from "../../domain/actions";
import type { DrawView } from "../../domain/drawguess/types";
import type { GameSnapshot } from "../OriginalGame";
import { useTurnClock } from "../use-turn-clock";
import { Button } from "../ui/Controls";
import { DrawingPreview } from "../fayu/DrawingPreview";
import { FayuCanvas } from "../fayu/FayuCanvas";
import "../ui/party-games.css";

export function DrawGuessTable({
  view,
  snapshot,
  act,
  pending,
  replay,
}: {
  view: DrawView;
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  pending: boolean;
  replay: boolean;
}) {
  const [guess, setGuess] = useState("");
  const isArtist = view.artist === snapshot.actor;
  const drawing = view.phase === "drawing";
  const artist = snapshot.seats[view.artist]?.name || `玩家 ${view.artist + 1}`;
  const ready =
    !replay && !snapshot.paused && !snapshot.finished && snapshot.actor >= 0;
  const personalGuess = view.guesses[snapshot.actor];
  const attemptsLeft = (personalGuess?.attempts ?? 0) < 30;
  const time = useTurnClock(
    snapshot.turnDeadline,
    snapshot.serverTime,
    !!snapshot.paused,
  );
  const question = drawing ? (isArtist ? view.prompt : view.hint) : view.prompt;
  const topScore = Math.max(...view.scores);
  return (
    <section className="party-game draw-table" aria-label="你画我猜">
      <header className="party-game-head">
        <div>
          <small>
            第 {view.round + 1} / {view.players} 轮
          </small>
          <h2>
            {drawing
              ? `${artist}画图`
              : view.phase === "finished"
                ? "最终比分"
                : "揭晓答案"}
          </h2>
        </div>
        <div className="party-game-tags">
          <strong>{question}</strong>
          <span className="draw-mobile-scores">
            {view.scores.map((score, index) => `${snapshot.seats[index]?.name || `玩家 ${index + 1}`} ${score}`).join(" · ")}
          </span>
          {!replay && time !== null && view.phase !== "finished" && (
            <span className="party-clock">{time} 秒</span>
          )}
        </div>
      </header>
      <div className="party-board" data-merged-canvas="true">
        {drawing && isArtist && !replay ? <FayuCanvas
          key={`${snapshot.room}:${snapshot.playId}:${snapshot.actor}:${view.round}`}
          draftKey={`${snapshot.room}:${snapshot.seats[snapshot.actor]?.id ?? snapshot.actor}`}
          draftGame={`${snapshot.playId ?? snapshot.room}:${view.round}`}
          history={view.history}
          strokes={view.strokes}
          fills={view.fills ?? []} layers={view.layers}
          enabled={drawing && isArtist && ready}
          pending={pending}
          round={view.round}
          act={act}
          showTools={drawing && isArtist && !replay}
          finish={drawing && isArtist && !replay ? {
            action: { type: "draw-next", round: view.round },
            label: "揭晓答案",
          } : undefined}
        /> : <DrawingPreview strokes={view.strokes} fills={view.fills ?? []} layers={view.layers} />}
      </div>
      <ol className="party-game-scores" aria-label="分数">
        {view.scores.map((score, index) => (
          <li key={index} aria-current={index === snapshot.actor}>
            <span>{snapshot.seats[index]?.name || `玩家 ${index + 1}`}</span>
            {(view.phase === "finished"
              ? score === topScore
              : view.solved.includes(index)) && (
              <small>{view.phase === "finished" ? "获胜" : "猜中"}</small>
            )}
            <strong>{score}</strong>
          </li>
        ))}
      </ol>
      {drawing &&
      ready &&
      !isArtist &&
      !view.solved.includes(snapshot.actor) ? (
        <form
          className="party-game-controls"
          onSubmit={(event) => {
            event.preventDefault();
            if (pending || !guess.trim() || !attemptsLeft) return;
            act({ type: "draw-guess", round: view.round, text: guess.trim() });
            setGuess("");
          }}
        >
          <input
            aria-label="输入猜词"
            placeholder="你猜是什么？"
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            maxLength={40}
            disabled={!attemptsLeft}
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={pending || !guess.trim() || !attemptsLeft}
          >
            提交
          </Button>
          <small role="status">
            {!attemptsLeft
              ? "本轮猜词次数已用完"
              : personalGuess && !personalGuess.correct
                ? "还没猜中"
                : ""}
          </small>
        </form>
      ) : !replay &&
        ready &&
        !drawing &&
        view.phase === "reveal" &&
        isArtist ? (
        <div className="party-game-controls">
          <Button
            type="button"
            disabled={pending}
            onClick={() => act({ type: "draw-next", round: view.round })}
          >
            继续
          </Button>
        </div>
      ) : !replay && drawing && view.solved.includes(snapshot.actor) ? (
        <div className="party-game-controls">
          <small role="status">猜中了，等其他玩家完成</small>
        </div>
      ) : null}
    </section>
  );
}
