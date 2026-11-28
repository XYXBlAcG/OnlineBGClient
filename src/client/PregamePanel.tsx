import { supportsLlmDecisions } from "../domain/companion";
import { gameCatalogue } from "../domain/catalogue";
import type { SeatConfig, Snapshot } from "../domain/protocol";
import { expeditionAiDifficultyNames } from "./expedition/ExpeditionOptionsControl";
import { difficultyNames } from "./game-difficulty";
import { roomReadiness } from "./room-readiness";
import { Select, Switch } from "./ui/Controls";
import { DrawWordPreview } from "./drawguess/DrawWordPreview";

export function PregamePanel({
  snapshot,
  starting,
  onReady,
  onStart,
  onSeatChange,
  onChatAiSeatChange,
  onChatEnabledChange,
  onOpenAiSettings,
  onOpenWordLibrary,
  showLlm = true,
}: {
  snapshot: Snapshot;
  starting: boolean;
  onReady: () => void;
  onStart: () => void;
  onSeatChange: (index: number, config: SeatConfig) => void;
  onChatAiSeatChange?: (index: number | null) => void;
  onChatEnabledChange?: (enabled: boolean) => void;
  onOpenAiSettings?: () => void;
  onOpenWordLibrary?: () => void;
  showLlm?: boolean;
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
        <div
          className="pregame-progress"
          aria-label={`${readyCount} 个席位已就绪`}
        >
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
      {snapshot.kind === "drawguess" && snapshot.config.drawguess.mode === "classic" && snapshot.canManage && (
        <div className="pregame-word-library">
          <DrawWordPreview />
          {onOpenWordLibrary && (
            <button type="button" onClick={onOpenWordLibrary}>
              管理词库
            </button>
          )}
        </div>
      )}
      {showLlm && snapshot.canManage && (
        <div className="pregame-ai-controls">
          <span>
            {snapshot.companion.configured ? "AI 模型已接入" : "AI 模型未接入"}
          </span>
          {snapshot.seats.some((seat) => seat.difficulty) &&
            onChatAiSeatChange && (
              <label>
                聊天 AI
                <Select
                  aria-label="聊天 AI 席位"
                  value={snapshot.config.companion.aiSeatIndex ?? ""}
                  onValueChange={(value) =>
                    onChatAiSeatChange(value === "" ? null : Number(value))
                  }
                >
                  <option value="">自动（第一个 AI）</option>
                  {snapshot.seats
                    .filter((seat) => seat.difficulty)
                    .map((seat, index) => (
                      <option value={index} key={seat.id}>
                        {seat.name}
                      </option>
                    ))}
                </Select>
              </label>
            )}
          {onChatEnabledChange && (
            <Switch
              label="启用 AI 聊天"
              checked={snapshot.companion.enabled}
              disabled={!snapshot.companion.available}
              onCheckedChange={onChatEnabledChange}
            />
          )}
          {onOpenAiSettings && (
            <button type="button" onClick={onOpenAiSettings}>
              接入 / 测试 AI
            </button>
          )}
        </div>
      )}
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
              <div className="pregame-seat-controls">
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
                {showLlm && seat.difficulty && (
                  <Select
                    aria-label={`席位 ${index + 1} AI 驱动`}
                    value={
                      supportsLlmDecisions(snapshot.kind) &&
                      snapshot.companion.server
                        ? (seat.driver ?? "search")
                        : "search"
                    }
                    onValueChange={(driver) =>
                      onSeatChange(index, {
                        type: "ai",
                        difficulty: seat.difficulty as keyof typeof aiNames,
                        name: seat.name,
                        driver: driver as "search" | "llm",
                      })
                    }
                  >
                    <option value="search">搜索</option>
                    <option
                      value="llm"
                      disabled={
                        !supportsLlmDecisions(snapshot.kind) ||
                        !snapshot.companion.server
                      }
                    >
                      LLM（UNO 联机）
                    </option>
                  </Select>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      <footer className="pregame-actions">
        <div>
          <strong>{readiness.message}</strong>
          <small>房主可以在“更换游戏 / 下一局”中调整游戏、人数与 AI。</small>
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
