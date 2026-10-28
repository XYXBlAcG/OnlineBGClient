import { VoiceEffectControls } from "./VoiceEffectControls";
import { VoiceSetupGuide } from "./VoiceSetupGuide";
import "../ui/quick-start.css";
import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { confirmation } from "../confirmation-controller";
import { Select, Slider, Switch } from "../ui/Controls";
import type { VoicePreferences } from "../../domain/voice";
import { useVoice } from "./VoiceProvider";
interface Config {
  url: string;
  apiKey: string;
  hasSecret: boolean;
}
export function VoiceSettings({
  value,
  onChange,
}: {
  value: VoicePreferences;
  onChange: (value: VoicePreferences) => void;
}) {
  const { view, send } = useVoice();
  const configPanel = useRef<HTMLDetailsElement>(null);
  const [setupOpen, setSetupOpen] = useState(true);
  const [config, setConfig] = useState<Config>({
      url: "",
      apiKey: "",
      hasSecret: false,
    }),
    [secret, setSecret] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loopback, setLoopback] = useState(false);
  useEffect(() => {
    let active = true;
    void invoke<Config>("voice_config")
      .then((next) => {
        if (active) {
          setConfig(next);
          setSetupOpen(!next.hasSecret);
        }
      })
      .catch((error) => {
        if (active) setNotice(String(error));
      });
    send({ type: "devices" });
    return () => {
      active = false;
      send({ type: "test", enabled: false, loopback: false });
    };
  }, [send]);
  const save = async (clear = false) => {
    setBusy(true);
    setNotice("");
    try {
      await invoke("voice_save_config", {
        config: { url: config.url, apiKey: config.apiKey, secret },
        clear,
      });
      setSecret("");
      setConfig(await invoke<Config>("voice_config"));
      setNotice(
        "已保存。新的房主配置在下次启动房间服务时生效；现有对局不会被中断。",
      );
      await emit("voice-config-saved");
    } catch (error) {
      setNotice(String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="settings-section voice-settings">
      <h3>声音与语音</h3>
      <p className="muted">
        仅客户端支持房间连麦。加入后默认静音，语音音量独立于游戏音效。
      </p>
      <VoiceSetupGuide
        configured={config.hasSecret}
        onConfigure={() => {
          setSetupOpen(true);
          requestAnimationFrame(() => {
            configPanel.current?.scrollIntoView({ block: "nearest" });
            configPanel.current?.querySelector("summary")?.focus();
          });
        }}
      />
      <details
        ref={configPanel}
        open={setupOpen}
        onToggle={(event) => setSetupOpen(event.currentTarget.open)}
      >
        <summary>房主语音服务配置</summary>
        <p className="muted">
          仅开房的电脑需要配置自己的 LiveKit 项目。API Secret
          保存到系统凭据存储，不发送给其他玩家。
        </p>
        <label>
          项目地址
          <input
            value={config.url}
            placeholder="wss://你的项目.livekit.cloud"
            autoComplete="off"
            onChange={(event) =>
              setConfig({ ...config, url: event.target.value })
            }
          />
        </label>
        <label>
          API Key
          <input
            value={config.apiKey}
            autoComplete="off"
            onChange={(event) =>
              setConfig({ ...config, apiKey: event.target.value })
            }
          />
        </label>
        <label>
          API Secret
          <input
            type="password"
            value={secret}
            autoComplete="new-password"
            placeholder={
              config.hasSecret
                ? "已保存；留空保留现有 Secret"
                : "填写项目 Secret"
            }
            onChange={(event) => setSecret(event.target.value)}
          />
        </label>
        <div className="voice-buttons">
          <button type="button" disabled={busy} onClick={() => void save()}>
            保存房主配置
          </button>
          <button
            type="button"
            disabled={busy || !config.hasSecret}
            onClick={async () => {
              if (
                await confirmation.request(
                  "清除本机保存的语音服务凭据？当前房间不受影响，重启服务后停用语音。",
                  "清除凭据",
                )
              )
                void save(true);
            }}
          >
            清除凭据
          </button>
        </div>
      </details>
      <VoiceEffectControls
        value={value.effect}
        onChange={(effect) => onChange({ ...value, effect })}
      />
      <div className="voice-device-grid">
        <label>
          麦克风
          <Select
            aria-label="麦克风"
            value={value.input}
            onValueChange={(input) => onChange({ ...value, input })}
          >
            <option value="default">系统默认麦克风</option>
            {view.devices
              .filter((d) => d.kind === "audioinput" && d.id !== "default")
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </Select>
        </label>
        {view.outputSupported ? (
          <label>
            扬声器
            <Select
              aria-label="扬声器"
              value={value.output}
              onValueChange={(output) => onChange({ ...value, output })}
            >
              <option value="default">系统默认输出</option>
              {view.devices
                .filter((d) => d.kind === "audiooutput" && d.id !== "default")
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </Select>
          </label>
        ) : (
          <p className="muted">
            音频输出跟随系统，请在系统声音设置中选择扬声器或耳机。
          </p>
        )}
      </div>
      <div className="voice-buttons">
        <button type="button" onClick={() => send({ type: "devices" })}>
          刷新设备
        </button>
        <button
          type="button"
          onClick={() =>
            send({ type: "test", enabled: !view.testing, loopback })
          }
        >
          {view.testing ? "停止输入测试" : "测试麦克风"}
        </button>
      </div>
      <Switch
        label="测试时耳返（建议佩戴耳机）"
        checked={loopback}
        onCheckedChange={(checked) => {
          setLoopback(checked);
          if (view.testing)
            send({ type: "test", enabled: true, loopback: checked });
        }}
      />
      <div
        className="voice-input-level"
        role="meter"
        aria-label="麦克风输入电平"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(view.inputLevel * 100)}
      >
        <span
          style={{
            width: `${Math.max(0, Math.min(1, view.inputLevel)) * 100}%`,
          }}
        />
      </div>
      <label>
        语音总音量
        <Slider
          aria-label="语音总音量"
          value={value.volume}
          min={0}
          max={1}
          step={0.05}
          onValueChange={(volume) => onChange({ ...value, volume })}
        />
      </label>
      <Select
        aria-label="说话方式"
        value={value.mode}
        onValueChange={(mode) =>
          onChange({ ...value, mode: mode as VoicePreferences["mode"] })
        }
      >
        <option value="open">自由说话</option>
        <option value="push">按键说话</option>
      </Select>
      <p className="muted">
        按键说话需先开启麦克风。按键在「快捷键 →
        按住说话」修改，仅客户端获得焦点且未输入文字时生效。
      </p>
      <Switch
        label="有人说话时降低应用提示音"
        checked={value.duck}
        onCheckedChange={(duck) => onChange({ ...value, duck })}
      />
      {view.error && (
        <p className="voice-error" role="status">
          {view.error}
        </p>
      )}

      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
