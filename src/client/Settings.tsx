import { enableNotifications } from "./notifications";
import { themes } from "./themes";
import { Panel, Select, Switch } from "./ui/Controls";
import type { Preferences } from "./preferences";
import type { AppCommand } from "./commands";

export function Settings({
  open,
  onOpenChange,
  preferences,
  onChange,
  commands,
  onBind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
  commands: AppCommand[];
  onBind: (id: string, binding: string) => void;
}) {
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
        <h3>高级</h3>
        <Switch
          label="显示策略审核"
          checked={preferences.auditVisible}
          onCheckedChange={(auditVisible) =>
            onChange({ ...preferences, auditVisible })
          }
        />
      </section>
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
