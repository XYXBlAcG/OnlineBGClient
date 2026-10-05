import type { PerformanceSettings } from "../domain/performance";
import { PhraseSettings } from "./PhraseSettings";
import { CacheSettings } from "./CacheSettings";
import { enableNotifications } from "./notifications";
import { themes } from "./themes";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
  commands: AppCommand[];
  canConfigureAI?: boolean;
  roomPerformance?: PerformanceSettings;
  onError: (message: string) => void;
  onBind: (id: string, binding: string) => void;
}) {
  const performance = canConfigureAI
    ? preferences.performance
    : roomPerformance || preferences.performance;
  return (
    <Panel title="设置" open={open} onOpenChange={onOpenChange}>
      <section className="settings-section">
        <h3>外观</h3>
        <div className="setting-row">
          <span>主题</span>
          <Select
            aria-label="外观主题"
            value={preferences.theme}
            onValueChange={(theme) =>
              onChange({ ...preferences, theme: theme as Preferences["theme"] })
            }
          >
            <option value="system">跟随系统</option>
            {themes.list().map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </Select>
        </div>
        <Switch
          label="界面动画"
          checked={preferences.motion}
          onCheckedChange={(motion) => onChange({ ...preferences, motion })}
        />
        <Switch
          label="显示聊天侧栏"
          checked={preferences.chatVisible}
          onCheckedChange={(chatVisible) =>
            onChange({ ...preferences, chatVisible })
          }
        />
      </section>
      <section className="settings-section">
        <h3>消息与互动</h3>
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
      <section className="settings-section">
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
        <p className="muted">联机由房主电脑计算。当前策略使用 CPU 搜索。</p>
        <Switch
          label={canConfigureAI ? "记录并显示策略审核" : "显示策略审核"}
          checked={preferences.auditVisible}
          onCheckedChange={(auditVisible) =>
            onChange({ ...preferences, auditVisible })
          }
        />
      </section>
      <PhraseSettings
        groups={preferences.phraseGroups}
        onChange={(phraseGroups) => onChange({ ...preferences, phraseGroups })}
        onError={onError}
      />
      <CacheSettings
        onError={onError}
        onAuditCleared={() => onChange({ ...preferences, auditVisible: false })}
      />
      <section className="settings-section">
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
                  event.key.length === 1 ? event.key.toUpperCase() : event.key;
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
    </Panel>
  );
}
