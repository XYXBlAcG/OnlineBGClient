import { MediaCacheControls } from "./social/MediaCacheControls";
import type { MediaSession } from "./social/media";
import { MotionControls } from "./MotionControls";
import { useState } from "react";
import { AvatarPicker } from "./AvatarPicker";
import { useNativeWindow } from "./native/windows";
import type { PerformanceSettings } from "../domain/performance";
import { PhraseSettings } from "./PhraseSettings";
import { CacheSettings } from "./CacheSettings";
import { enableNotifications } from "./notifications";
import { ThemeControl } from "./ThemeControl";
import { Panel, Select, Slider, Switch } from "./ui/Controls";
import type { Preferences } from "./preferences";
import type { AppCommand } from "./commands";

export function Settings({
  open,
  onOpenChange,
  preferences,
  onChange,
  commands,
  onBind,
  onError,
  canConfigureAI = true,
  roomPerformance,
  mediaSession,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
  commands: AppCommand[];
  canConfigureAI?: boolean;
  roomPerformance?: PerformanceSettings;
  mediaSession?: MediaSession;
  onError: (message: string) => void;
  onBind: (id: string, binding: string) => void;
}) {
  const [section, setSection] = useState("外观");
  const detached = useNativeWindow(
    "settings",
    open,
    {
      view: "settings",
      preferences,
      commands: commands.map(({ id, title, binding, scope }) => ({
        id,
        title,
        binding,
        scope,
      })),
      canConfigureAI,
      roomPerformance,
      mediaSession,
    },
    (intent) => {
      if (intent.type === "close") onOpenChange(false);
      if (intent.type === "preferences") onChange(intent.preferences);
      if (intent.type === "binding") onBind(intent.id, intent.binding);
      if (intent.type === "error") onError(intent.message);
    },
  );
  if (detached) return null;
  const performance = canConfigureAI
    ? preferences.performance
    : roomPerformance || preferences.performance;
  return (
    <Panel
      className="settings-panel"
      title="设置"
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="设置分组">
          {["外观", "消息与互动", "AI 计算", "常用语", "数据", "快捷键"].map(
            (label) => (
              <button
                key={label}
                aria-pressed={section === label}
                onClick={() => setSection(label)}
              >
                {label}
              </button>
            ),
          )}
        </nav>
        <div className="settings-body">
          <section hidden={section !== "外观"} className="settings-section">
            <h3>外观</h3>
            <ThemeControl
              value={preferences.theme}
              onChange={(theme) => onChange({ ...preferences, theme })}
            />
            <MotionControls
              preferences={preferences}
              onChange={(motion) => onChange({ ...preferences, ...motion })}
            />
            <AvatarPicker
              value={preferences.avatar}
              onChange={(avatar) => onChange({ ...preferences, avatar })}
            />
            <Switch
              label="显示聊天侧栏"
              checked={preferences.chatVisible}
              onCheckedChange={(chatVisible) =>
                onChange({ ...preferences, chatVisible })
              }
            />
          </section>
          <section
            hidden={section !== "消息与互动"}
            className="settings-section"
          >
            <h3>消息与互动</h3>
            <Switch
              label="本机显示横幅与全屏表情"
              checked={preferences.bannerDisplay}
              onCheckedChange={(bannerDisplay) =>
                onChange({ ...preferences, bannerDisplay })
              }
            />
            <Switch
              label="回合与结算提示音"
              checked={preferences.turnSound}
              onCheckedChange={(turnSound) =>
                onChange({ ...preferences, turnSound })
              }
            />
            <label>
              提示音量 · {Math.round(preferences.soundVolume * 100)}%
              <Slider
                aria-label="提示音量"
                min={0}
                max={1}
                step={0.05}
                value={preferences.soundVolume}
                onValueChange={(soundVolume) =>
                  onChange({ ...preferences, soundVolume })
                }
              />
            </label>
            <Switch
              label="消息提示音"
              checked={preferences.messageSound}
              onCheckedChange={(messageSound) =>
                onChange({ ...preferences, messageSound })
              }
            />
            <Switch
              label="桌面系统通知"
              checked={preferences.systemNotifications}
              onCheckedChange={async (enabled) => {
                const granted = enabled ? await enableNotifications() : false;
                onChange({ ...preferences, systemNotifications: granted });
              }}
            />
            <Switch
              label="显示头像互动"
              checked={preferences.interactions}
              onCheckedChange={(interactions) =>
                onChange({ ...preferences, interactions })
              }
            />
            <Switch
              label="互动音效"
              checked={preferences.interactionSound}
              onCheckedChange={(interactionSound) =>
                onChange({ ...preferences, interactionSound })
              }
            />
          </section>
          <section hidden={section !== "AI 计算"} className="settings-section">
            <h3>AI 计算</h3>
            <label className="setting-row">
              CPU 加速
              <Select
                aria-label="CPU加速模式"
                value={performance.mode}
                disabled={!canConfigureAI}
                onValueChange={(mode) =>
                  onChange({
                    ...preferences,
                    performance: {
                      ...preferences.performance,
                      mode: mode as Preferences["performance"]["mode"],
                    },
                  })
                }
              >
                <option value="auto">自动</option>
                <option value="single">单线程</option>
                <option value="multi">多线程</option>
              </Select>
            </label>
            {performance.mode === "multi" && canConfigureAI && (
              <label>
                线程上限 · {preferences.performance.threads}
                <Slider
                  aria-label="AI线程上限"
                  min={1}
                  max={32}
                  step={1}
                  value={preferences.performance.threads}
                  onValueChange={(threads) =>
                    onChange({
                      ...preferences,
                      performance: { ...preferences.performance, threads },
                    })
                  }
                />
              </label>
            )}
            <Switch
              label="显示 AI 性能测试"
              checked={preferences.benchmarkVisible}
              onCheckedChange={(benchmarkVisible) =>
                onChange({ ...preferences, benchmarkVisible })
              }
            />
            <p className="muted">联机由房主电脑计算。当前策略使用 CPU 搜索。</p>
            <Switch
              label={canConfigureAI ? "记录并显示策略审核" : "显示策略审核"}
              checked={preferences.auditVisible}
              onCheckedChange={(auditVisible) =>
                onChange({ ...preferences, auditVisible })
              }
            />
          </section>
          <div hidden={section !== "常用语"}>
            <PhraseSettings
              groups={preferences.phraseGroups}
              onChange={(phraseGroups) =>
                onChange({ ...preferences, phraseGroups })
              }
              onError={onError}
            />
          </div>
          <div hidden={section !== "数据"}>
            {mediaSession?.endpoint && (
              <MediaCacheControls session={mediaSession} onError={onError} />
            )}
            <CacheSettings
              onError={onError}
              onAuditCleared={() =>
                onChange({ ...preferences, auditVisible: false })
              }
            />
          </div>
          <section hidden={section !== "快捷键"} className="settings-section">
            <h3>快捷键</h3>
            <p className="muted">
              点击组合键后按下新快捷键。聊天输入时不会触发游戏操作。
            </p>
            {commands.map((command) => (
              <div className="setting-row" key={command.id}>
                <span>{command.title}</span>
                <button
                  className="key-binding"
                  aria-label={`设置快捷键 ${command.title}`}
                  onKeyDown={(event) => {
                    if (
                      ["Control", "Meta", "Shift", "Alt"].includes(event.key) ||
                      event.isDefaultPrevented() ||
                      event.nativeEvent.isComposing
                    )
                      return;
                    event.preventDefault();
                    event.stopPropagation();
                    const key =
                      event.key.length === 1
                        ? event.key.toUpperCase()
                        : event.key;
                    onBind(
                      command.id,
                      [
                        ...(event.ctrlKey ? ["Control"] : []),
                        ...(event.metaKey ? ["Meta"] : []),
                        ...(event.altKey ? ["Alt"] : []),
                        ...(event.shiftKey ? ["Shift"] : []),
                        key,
                      ].join("+"),
                    );
                  }}
                >
                  <kbd>{command.binding || "未绑定"}</kbd>
                </button>
              </div>
            ))}
            <button onClick={() => onChange({ ...preferences, bindings: {} })}>
              恢复默认快捷键
            </button>
          </section>
        </div>
      </div>
    </Panel>
  );
}
