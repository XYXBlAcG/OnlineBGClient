import { useState } from "react";
import {
  gameCatalogue,
  gameKinds,
  type GameKind,
} from "../../domain/catalogue";
import type { RoomConfig } from "../../domain/protocol";
import type { Difficulty } from "../../domain/types";
import { Button, Select } from "../ui/Controls";
import { defaultLocalHumans, localRoomConfig } from "./local-room";

export function MobileLobby({
  initialKind,
  onStart,
  onBack,
}: {
  initialKind?: GameKind;
  onStart: (config: RoomConfig) => void;
  onBack: () => void;
}) {
  const [kind, setKind] = useState<GameKind>(initialKind ?? "uno");
  const [humans, setHumans] = useState(() =>
    defaultLocalHumans(initialKind ?? "uno"),
  );
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const game = gameCatalogue[kind];
  const humanFloor = game.ai ? 1 : game.minPlayers;
  const changeKind = (next: GameKind) => {
    setKind(next);
    setHumans(defaultLocalHumans(next));
  };
  return (
    <main className="mobile-lobby">
      <header className="mobile-home-heading">
        <div>
          <button type="button" className="mobile-back" onClick={onBack}>
            ← 返回
          </button>
          <h1>本地开局</h1>
          <p>选好游戏就直接开始，不需要电脑或网络。</p>
        </div>
      </header>
      <section className="mobile-game-grid" aria-label="选择游戏">
        {gameKinds.map((item) => (
          <button
            type="button"
            key={item}
            className="mobile-game-card"
            aria-pressed={kind === item}
            onClick={() => changeKind(item)}
          >
            <span className="mobile-game-symbol">
              {gameCatalogue[item].symbol}
            </span>
            <strong>{gameCatalogue[item].name}</strong>
            <small>
              {gameCatalogue[item].minPlayers}–{gameCatalogue[item].maxPlayers}{" "}
              人
            </small>
          </button>
        ))}
      </section>
      <section className="mobile-local-setup" aria-label="本地对局设置">
        <div className="mobile-local-title">
          <div>
            <strong>{game.name}</strong>
            <small>{game.description}</small>
          </div>
          <span>{game.ai ? "可以和 AI 玩" : "同屏轮流"}</span>
        </div>
        <label className="mobile-local-field">
          <span>真人玩家</span>
          <Select
            aria-label="真人玩家"
            value={humans}
            onValueChange={(value) => setHumans(Number(value))}
          >
            {Array.from(
              { length: game.maxPlayers - humanFloor + 1 },
              (_, index) => index + humanFloor,
            ).map((value) => (
              <option key={value} value={value}>
                {value} 人
              </option>
            ))}
          </Select>
        </label>
        {game.ai && (
          <label className="mobile-local-field">
            <span>AI 难度</span>
            <Select
              aria-label="AI 难度"
              value={difficulty}
              onValueChange={(value) => setDifficulty(value as Difficulty)}
            >
              <option value="easy">简单</option>
              <option value="normal">普通</option>
              <option value="hard">困难</option>
            </Select>
          </label>
        )}
        <p className="mobile-local-note">
          {game.ai
            ? `其余席位由 AI 补足，共 ${Math.max(game.minPlayers, humans)} 人开局。`
            : "同屏轮流操作，不加入 AI。"}
        </p>
        <Button
          variant="primary"
          className="mobile-local-start"
          onClick={() => onStart(localRoomConfig(kind, humans, difficulty))}
        >
          开始本地对局
        </Button>
      </section>
    </main>
  );
}
