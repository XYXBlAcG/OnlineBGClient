import { gameCatalogue } from "../domain/catalogue";
import type { SeatConfig, Snapshot } from "../domain/protocol";
import { expeditionAiDifficultyNames } from "./expedition/ExpeditionOptionsControl";
import { difficultyNames } from "./game-difficulty";
import { roomReadiness } from "./room-readiness";
import { Select } from "./ui/Controls";

export function PregamePanel({
  snapshot,
  starting,
  onReady,
  onStart,
  onSeatChange,
}: {
  snapshot: Snapshot;
  starting: boolean;
  onReady: () => void;
  onStart: () => void;
  onSeatChange: (index: number, config: SeatConfig) => void;
}) {
  const game = gameCatalogue[snapshot.kind],
    readiness = roomReadiness(snapshot.seats),
    aiNames =
      snapshot.kind === "expedition"
        ? expeditionAiDifficultyNames
        : difficultyNames,
    readyCount = snapshot.seats.filter(
      (seat) => seat.difficulty || seat.ready,
    ).length,
    currentSeat =
      snapshot.actor >= 0 ? snapshot.seats[snapshot.actor] : undefined;
  return (
    <section
      className="pregame-panel"
      aria-label={`${game.name}准备界面`}
      data-ready={readiness.canStart}
    >
      {snapshot.resumeRoles && (
        <div className="resume-roles">
          <h3>确认远征角色后继续</h3>
          {snapshot.resumeRoles.map((role, index) => (
            <p key={index}>
              {snapshot.seats[index].name || `等待席位 ${index + 1}`} ·{" "}
              {role.profession}（原玩家：{role.name}）
            </p>
          ))}
          <p className="muted">
            确认本人接管的角色后准备，房主点开始对局继续原进度。
          </p>
        </div>
      )}
      <header className="pregame-header">
        <div>
          <h2>
            {snapshot.config.humans === 0
              ? "AI 性能测试"
              : snapshot.actor < 0
                ? "服务运行中"
                : "等待开局"}
          </h2>
          <small>
            {snapshot.config.humans === 0
              ? "观察 AI 自动对局并控制开局"
              : snapshot.actor < 0
                ? "电脑只负责托管房间"
                : currentSeat?.ready
                  ? "你已准备，等待房主开始"
                  : "确认席位后准备"}
          </small>
        </div>
        <div className="pregame-progress" aria-label={`${readyCount} 个席位已就绪`}>
          <strong>
            {readyCount}/{snapshot.seats.length}
          </strong>
          <span>就绪</span>
        </div>
      </header>
      <div className="pregame-brief">
        <span>
          房间 <b>{snapshot.room}</b>
        </span>
        <span>
          {game.category} · {game.minPlayers}–{game.maxPlayers} 人
        </span>
        <span>
          {snapshot.config.ai.length
            ? `${snapshot.config.ai.length} 名 AI`
            : "纯真人"}
        </span>
      </div>
      {snapshot.actor < 0 && (
        <p className="muted">
          {snapshot.config.humans === 0
            ? "全 AI 对战 · 你可以观战并控制开局"
            : `${snapshot.playing ? "对局进行中" : "等待手机玩家加入"} · 电脑不占席位`}
        </p>
      )}
      <div className="pregame-seats">
        {snapshot.seats.map((seat, index) => (
          <article
            className={`pregame-seat-card ${seat.ready ? "is-ready" : ""}`}
            key={seat.id}
          >
            <span className="pregame-seat-index">{index + 1}</span>
            <div className="pregame-seat-copy">
              <strong>{seat.name || "等待加入"}</strong>
              <small>
                {seat.difficulty
                  ? aiNames[seat.difficulty]
                  : seat.online
                    ? seat.ready
                      ? "已准备"
                      : "未准备"
                    : "等待加入"}
              </small>
            </div>
            {snapshot.canManage && index > 0 && (
              <Select
                aria-label={`席位 ${index + 1} 类型`}
                value={seat.difficulty || "human"}
                onValueChange={(value) =>
                  onSeatChange(
                    index,
                    value === "human"
                      ? { type: "human" }
                      : {
                          type: "ai",
                          difficulty: value as keyof typeof aiNames,
                          name: "",
                        },
                  )
                }
              >
                <option value="human">真人</option>
                {game.ai &&
                  Object.entries(aiNames).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label} AI
                    </option>
                  ))}
              </Select>
            )}
          </article>
        ))}
      </div>
      <footer className="pregame-actions">
        <div>
          <strong>{readiness.message}</strong>
          <small>
            房主可以在“更换游戏 / 下一局”中调整游戏、人数与 AI。
          </small>
        </div>
        <div className="room-ready-actions">
          {snapshot.actor >= 0 && (
            <button onClick={onReady}>
              {currentSeat?.ready ? "取消准备" : "准备"}
            </button>
          )}
          {snapshot.canManage && !snapshot.playing && (
            <button
              disabled={!readiness.canStart || starting}
              aria-busy={starting}
              className={`primary-button ${starting ? "operation-working" : ""}`}
              onClick={onStart}
            >
              {starting ? "正在开始…" : "开始对局"}
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
