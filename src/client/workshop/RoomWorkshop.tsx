import { useState } from "react";
import { ClientStore } from "../storage";
import type { Snapshot } from "../../domain/protocol";
import type { PartyAction } from "../../domain/party";
export function RoomWorkshop({
  snapshot,
  send,
}: {
  snapshot: Snapshot;
  send: (action: PartyAction) => void;
}) {
  const [status, setStatus] = useState("");
  const apply = async () => {
    try {
      const packs = (await new ClientStore().plugins())
        .filter((p) => p.enabled)
        .map((p) => p.pack);
      send({ type: "plugins", packs });
      setStatus("已发送房间插件配置");
    } catch (e) {
      setStatus(String(e));
    }
  };
  return (
    <details className="party-policy">
      <summary>本房间插件 · {snapshot.party.plugins.length}</summary>
      {snapshot.party.plugins.map((pack) => (
        <p key={pack.id}>
          {pack.name} · {pack.version}
        </p>
      ))}
      <button disabled={snapshot.playing} onClick={() => void apply()}>
        应用本机启用的插件
      </button>
      <small>
        {snapshot.playing
          ? "本局版本已锁定；对局结束后可更换插件。"
          : status || "在设置 → 插件工坊安装和启用插件。"}
      </small>
    </details>
  );
}
