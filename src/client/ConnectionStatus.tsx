import type { Snapshot } from "../domain/protocol";
import { gameCatalogue } from "../domain/catalogue";

export function ConnectionStatus({
  snapshot,
  network,
  latency,
}: {
  snapshot: Snapshot;
  network: boolean;
  latency?: number;
}) {
  const humans = snapshot.seats.filter((seat) => seat.difficulty === null);
  const ai = snapshot.seats.filter((seat) => seat.difficulty !== null);
  const host = snapshot.host?.name ?? snapshot.seats[0]?.name ?? "本机";
  const turn =
    snapshot.actor >= 0
      ? (snapshot.seats[snapshot.actor]?.name ?? "你")
      : "旁观";
  const latencyLabel =
    latency === undefined
      ? "未测量"
      : latency <= 80
        ? "良好"
        : latency <= 180
          ? "一般"
          : "较高";
  return (
    <div className="connection-status-card" aria-label="连接状态">
      <div className="connection-status-heading">
        <span
          className="connection-status-dot"
          data-state={network ? "online" : "local"}
        />
        <strong>{network ? "联机房间" : "本地房间"}</strong>
        <small>{gameCatalogue[snapshot.kind].name}</small>
      </div>
      <dl>
        <div>
          <dt>房主</dt>
          <dd>{host}</dd>
        </div>
        <div>
          <dt>席位</dt>
          <dd>
            {humans.length} 真人 · {ai.length} AI
            {snapshot.spectators?.length
              ? ` · ${snapshot.spectators.length} 旁观`
              : ""}
          </dd>
        </div>
        <div>
          <dt>网络</dt>
          <dd>
            {network ? "联机连接" : "本机连接"} ·{" "}
            {latency === undefined
              ? "未测量"
              : `${latency} ms · ${latencyLabel}`}
          </dd>
        </div>
        <div>
          <dt>当前</dt>
          <dd>
            {snapshot.finished
              ? "对局结束"
              : snapshot.paused
                ? "已暂停"
                : `轮到 ${turn}`}
          </dd>
        </div>
      </dl>
    </div>
  );
}
