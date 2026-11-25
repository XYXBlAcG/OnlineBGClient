import { GolfDifficultyControl } from "../golf/GolfDifficultyControl";
import { DrawModeControl } from "../drawguess/DrawModeControl";
import type { DrawMode } from "../../domain/drawguess/types";
import { PoolOptionsControl } from "../pool/PoolOptionsControl";
import { MahjongOptionsControl } from "../mahjong/MahjongOptionsControl";
import { poolOptionsSchema } from "../../domain/pool/types";
import { mahjongOptionsSchema } from "../../domain/mahjong/types";
import { ExpeditionOptionsControl } from "../expedition/ExpeditionOptionsControl";
import { expeditionOptionsSchema } from "../../domain/expedition/adventure-types";
import { DominionOptionsControl } from "../dominion/DominionOptionsControl";
import { dominionOptionsSchema } from "../../domain/dominion/types";
import { FlightOptionsControl } from "../flight/FlightOptionsControl";
import { flightOptionsSchema } from "../../domain/flight";
import { CheckersOptionsControl } from "../checkers/CheckersOptionsControl";
import { checkersOptionsSchema } from "../../domain/checkers";
import { useState } from "react";
import {
  gameCatalogue,
  mobileGameKinds,
  type GameKind,
} from "../../domain/catalogue";
import type { RoomConfig } from "../../domain/protocol";
import type { Difficulty } from "../../domain/types";
import { Button, Select } from "../ui/Controls";
import { ExpeditionJournalPanel } from "../expedition/ExpeditionJournalPanel";
import { useExpeditionJournal } from "../expedition/use-expedition-journal";
import {
  defaultLocalHumans,
  localAiRange,
  localRoomConfig,
} from "./local-room";

export function MobileLobby({
  initialKind,
  onStart,
  onBack,
}: {
  initialKind?: GameKind;
  onStart: (config: RoomConfig) => void;
  onBack: () => void;
}) {
  const [drawMode, setDrawMode] = useState<DrawMode>("classic");
  const [golfDifficulty, setGolfDifficulty] = useState<Parameters<typeof GolfDifficultyControl>[0]["value"]>("standard");
  const [pool, setPool] = useState(() => poolOptionsSchema.parse({}));
  const [mahjong, setMahjong] = useState(() => mahjongOptionsSchema.parse({}));
  const [expeditionOptions, setExpeditionOptions] = useState(() =>
    expeditionOptionsSchema.parse({}),
  );
  const [dominion, setDominion] = useState(() =>
    dominionOptionsSchema.parse({}),
  );
  const [flight, setFlight] = useState(() => flightOptionsSchema.parse({}));
  const [checkers, setCheckers] = useState(() =>
    checkersOptionsSchema.parse({}),
  );
  const [kind, setKind] = useState<GameKind>(initialKind ?? "uno");
  const [humans, setHumans] = useState(() =>
    defaultLocalHumans(initialKind ?? "uno"),
  );
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [aiDelayMs, setAiDelayMs] = useState(1500);
  const [requestedAi, setRequestedAi] = useState<number | null>(null);
  const game = gameCatalogue[kind];
  const expedition = kind === "expedition";
  const expeditionJournal = useExpeditionJournal(expedition);
  const humanFloor = defaultLocalHumans(kind, drawMode);
  const aiRange = localAiRange(kind, humans);
  const aiCount =
    requestedAi === null
      ? aiRange.min
      : Math.min(Math.max(requestedAi, aiRange.min), aiRange.max);
  const changeKind = (next: GameKind) => {
    setKind(next);
    setHumans(defaultLocalHumans(next, drawMode));
    setRequestedAi(null);
  };
  const changeHumans = (next: number) => {
    setHumans(next);
    setRequestedAi(null);
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
        {mobileGameKinds.map((item) => (
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
              {item === "drawguess" ? defaultLocalHumans(item, "fayu") : gameCatalogue[item].minPlayers}–{gameCatalogue[item].maxPlayers}{" "}
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
          <span>
            {game.ai
              ? expedition
                ? "可以和 AI 朋友玩"
                : "可以和 AI 玩"
              : "同屏轮流"}
          </span>
        </div>
        {kind === "drawguess" && (
          <DrawModeControl value={drawMode} onChange={(mode) => {
            setHumans(Math.max(defaultLocalHumans(kind, mode), humans === humanFloor ? 0 : humans));
            setDrawMode(mode);
          }} />
        )}
        {kind === "golf" && <GolfDifficultyControl value={golfDifficulty} onChange={setGolfDifficulty} />}
        {kind === "pool" && (
          <PoolOptionsControl value={pool} onChange={setPool} />
        )}
        {kind === "scmj" && (
          <MahjongOptionsControl value={mahjong} onChange={setMahjong} />
        )}
        {kind === "dominion" && (
          <DominionOptionsControl value={dominion} onChange={setDominion} />
        )}
        {kind === "fxq" && (
          <FlightOptionsControl value={flight} onChange={setFlight} />
        )}
        {kind === "tq" && (
          <CheckersOptionsControl value={checkers} onChange={setCheckers} />
        )}
        <label className="mobile-local-field">
          <span>真人玩家</span>
          <Select
            aria-label="真人玩家"
            value={humans}
            onValueChange={(value) => changeHumans(Number(value))}
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
        {game.ai && aiRange.max > 0 && (
          <label className="mobile-local-field">
            <span>{expedition ? "AI 朋友" : "AI 对手"}</span>
            <Select
              aria-label="AI 对手"
              value={aiCount}
              onValueChange={(value) => setRequestedAi(Number(value))}
            >
              {Array.from(
                { length: aiRange.max - aiRange.min + 1 },
                (_, index) => index + aiRange.min,
              ).map((value) => (
                <option key={value} value={value}>
                  {value} 个
                </option>
              ))}
            </Select>
          </label>
        )}
        {game.ai && (
          <label className="mobile-local-field">
            <span>{expedition ? "AI 能力" : "AI 难度"}</span>
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
        {expedition && (
          <ExpeditionJournalPanel
            journal={expeditionJournal.journal}
            error={expeditionJournal.error}
            loading={expeditionJournal.loading}
            onUpgrade={expeditionJournal.upgrade}
            onImport={expeditionJournal.importJournal}
            onRefresh={expeditionJournal.refresh}
          />
        )}
        {expedition && (
          <ExpeditionOptionsControl
            value={expeditionOptions}
            onChange={(value) =>
              setExpeditionOptions(expeditionOptionsSchema.parse(value))
            }
            journal={expeditionJournal.journal}
          />
        )}
        {game.ai && (
          <label className="mobile-local-field">
            <span>AI 响应</span>
            <Select
              aria-label="AI 响应"
              value={aiDelayMs}
              onValueChange={(value) => setAiDelayMs(Number(value))}
            >
              <option value={500}>0.5 秒</option>
              <option value={1000}>1 秒</option>
              <option value={1500}>1.5 秒</option>
              <option value={2000}>2 秒</option>
              <option value={3000}>3 秒</option>
            </Select>
          </label>
        )}
        <p className="mobile-local-note">
          {game.ai
            ? expedition
              ? `共 ${humans + aiCount} 人开局，${aiCount} 位 AI 朋友。`
              : `共 ${humans + aiCount} 人开局，${aiCount} 个 AI。`
            : "同屏轮流操作，不加入 AI。"}
        </p>
        <Button
          variant="primary"
          className="mobile-local-start"
          disabled={expedition && expeditionJournal.loading}
          onClick={() =>
            onStart(
              localRoomConfig(kind, {
                gameOptions: {
                  golf: { difficulty: golfDifficulty },
                  pool,
                  mahjong,
                  expedition: expeditionOptions,
                  dominion,
                  flight,
                  checkers,
                },
                humans,
                difficulty,
                requestedAi: aiCount,
                aiDelayMs,
                expeditionLegacy: expeditionJournal.journal.legacy,
              }),
            )
          }
        >
          开始本地对局
        </Button>
      </section>
    </main>
  );
}
