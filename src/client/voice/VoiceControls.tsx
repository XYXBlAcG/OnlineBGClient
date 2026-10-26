import { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { confirmation } from "../confirmation-controller";
import { Slider } from "../ui/Controls";
import { useVoice } from "./VoiceProvider";
import "./voice.css";
const labels = {
  unavailable: "连接房间后可使用语音",
  idle: "未加入",
  connecting: "正在连接",
  connected: "已连接",
  reconnecting: "正在恢复语音",
  error: "语音已断开",
};
export function VoiceToolbar({ onOpen }: { onOpen: () => void }) {
  const { view, send } = useVoice();
  if (!isTauri()) return null;
  const active = ["connected", "reconnecting"].includes(view.phase);
  return (
    <span className="voice-toolbar">
      <button type="button" onClick={onOpen}>
        语音{active ? ` ${view.members.filter((m) => m.joined).length}` : ""}
      </button>
      {active && (
        <button
          type="button"
          aria-label={view.muted ? "开启麦克风" : "静音麦克风"}
          aria-pressed={view.muted}
          onClick={() => send({ type: "mute" })}
        >
          {view.muted ? "麦克风已静音" : "麦克风开启"}
        </button>
      )}
    </span>
  );
}
export function VoiceDock() {
  const { view, send } = useVoice();
  const [expanded, setExpanded] = useState(false);
  if (!isTauri()) return null;
  const active = ["connected", "reconnecting"].includes(view.phase);
  const join = async () => {
    if (
      await confirmation.request(
        "加入房间语音后默认静音，仅收听。可先在「设备」中选择音频设备，主动开麦后才会请求麦克风权限。",
        "静音加入",
      )
    )
      send({ type: "join" });
  };
  return (
    <section className="voice-dock" aria-label="房间语音">
      <div className="voice-heading">
        <strong>房间语音 · {labels[view.phase]}</strong>
        {active && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            成员 {view.members.filter((m) => m.joined).length}
          </button>
        )}
      </div>
      {view.phase === "unavailable" ? (
        <small>请通过客户端加入联机房间。</small>
      ) : (
        <>
          <div className="voice-buttons">
            {!active ? (
              <button
                type="button"
                className="primary"
                disabled={view.phase === "connecting" || !view.configured}
                onClick={() => void join()}
              >
                加入语音
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={view.hostMuted}
                  aria-pressed={view.muted}
                  onClick={() => send({ type: "mute" })}
                >
                  {view.hostMuted
                    ? "房主已禁言"
                    : view.muted
                      ? "开启麦克风"
                      : "麦克风静音"}
                </button>
                <button
                  type="button"
                  aria-pressed={view.deafened}
                  onClick={() => send({ type: "deafen" })}
                >
                  {view.deafened ? "恢复收听" : "耳机静音"}
                </button>
                <button type="button" onClick={() => send({ type: "leave" })}>
                  离开
                </button>
              </>
            )}
            <button type="button" onClick={() => send({ type: "settings" })}>
              设备与连麦设置
            </button>
          </div>
          {!view.configured && (
            <div>
              <small>
                {view.canManage
                  ? "房间语音尚未配置。配置后需重新创建房间。"
                  : "请房主配置语音服务并重新创建房间；你无需填写配置。"}
              </small>
              {view.canManage && (
                <button
                  type="button"
                  onClick={() => send({ type: "settings" })}
                >
                  配置房主语音
                </button>
              )}
            </div>
          )}
        </>
      )}
      {view.playbackBlocked && (
        <button type="button" onClick={() => send({ type: "playback" })}>
          点击恢复语音播放
        </button>
      )}
      {view.error && (
        <p className="voice-error" role="status">
          {view.error}
        </p>
      )}
      {expanded && active && (
        <div className="voice-members">
          {view.members.map((member) => (
            <div className="voice-member" key={member.id}>
              <div className="voice-member-name">
                <span className="voice-person" data-speaking={member.speaking}>
                  {Array.from(member.name)[0]}
                </span>
                <strong title={member.name}>
                  {member.name}
                  {member.id === view.identity ? "（我）" : ""}
                </strong>
                <small>
                  {member.blocked
                    ? "已移出"
                    : member.muted
                      ? "已禁言"
                      : member.speaking
                        ? "正在说话"
                        : member.joined
                          ? "在线"
                          : "未加入"}
                </small>
              </div>
              {member.id !== view.identity && member.joined && (
                <Slider
                  aria-label={`${member.name} 的音量`}
                  value={member.volume}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={(volume) =>
                    send({ type: "volume", target: member.id, volume })
                  }
                />
              )}
              {view.canManage && member.id !== view.identity && (
                <div className="voice-buttons">
                  {!member.blocked && (
                    <button
                      type="button"
                      onClick={() =>
                        send({
                          type: "moderate",
                          target: member.id,
                          operation: member.muted ? "allow" : "mute",
                        })
                      }
                    >
                      {member.muted ? "允许发言" : "禁言"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      send({
                        type: "moderate",
                        target: member.id,
                        operation: member.blocked ? "admit" : "remove",
                      })
                    }
                  >
                    {member.blocked ? "允许加入" : "移出语音"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
