import { invoke } from "@tauri-apps/api/core";
import { useState, useSyncExternalStore } from "react";
import { emojiRegistry, type EmojiStatus } from "./client";
import { Switch } from "../ui/Controls";
export function EmojiSettings({ proxy }: { proxy: string }) {
  const status = useSyncExternalStore(
    emojiRegistry.subscribe,
    emojiRegistry.snapshot,
    emojiRegistry.snapshot,
  );
  const [useProxy, setUseProxy] = useState(false),
    [error, setError] = useState("");
  if (!status.supported) return null;
  const run = async (command: string, args?: Record<string, unknown>) => {
    setError("");
    try {
      const result = await invoke<EmojiStatus>(command, args);
      if (result) await emojiRegistry.accept(result);
    } catch (error) {
      setError(String(error));
    }
  };
  return (
    <section className="settings-section emoji-settings">
      <h3>表情外观</h3>
      {status.installed ? (
        <>
          <Switch
            label="使用 Apple 风格表情"
            checked={status.enabled}
            onCheckedChange={(enabled) =>
              void run("emoji_enabled", { enabled })
            }
          />
          <div className="emoji-actions">
            <button
              disabled={status.phase === "downloading"}
              onClick={() => void run("emoji_remove")}
            >
              删除已下载的表情包
            </button>
          </div>
        </>
      ) : (
        <p className="muted">
          默认使用 Windows 系统表情，可单独下载 Apple 风格图片。
        </p>
      )}
      <Switch
        label="使用软件代理下载"
        checked={useProxy}
        onCheckedChange={setUseProxy}
      />
      {useProxy && <small className="muted">{proxy} · 在联机设置中修改</small>}
      {status.phase === "downloading" ? (
        <div className="emoji-download-progress" role="status">
          <progress
            aria-label="表情包下载进度"
            value={status.progress}
            max={1}
          />
          <span>{Math.round(status.progress * 100)}%</span>
          <div className="emoji-actions">
            <button onClick={() => void run("emoji_cancel")}>取消下载</button>
          </div>
        </div>
      ) : (
        <div className="emoji-actions">
          <button
            className="primary-button"
            onClick={() =>
              void run("emoji_install", { proxy: useProxy ? proxy : null })
            }
          >
            {status.installed ? "重新下载表情包" : "下载并启用 Apple 表情"}
          </button>
        </div>
      )}
      {(error || status.error) && (
        <p role="status">{error || status.error}，当前继续使用可用表情。</p>
      )}
    </section>
  );
}
