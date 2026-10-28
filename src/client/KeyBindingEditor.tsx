import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKey,
} from "react";
import { emitTo } from "@tauri-apps/api/event";
import { isTauri } from "@tauri-apps/api/core";
import {
  CommandRegistry,
  keyboardBinding,
  formatBinding,
  type AppCommand,
} from "./commands";
export function KeyBindingEditor({
  command,
  commands,
  onBind,
}: {
  command: AppCommand;
  commands: AppCommand[];
  onBind: (id: string, binding: string) => void | Promise<void>;
}) {
  const [recording, setRecording] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState<string | null>(null),
    [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    pending = useRef(false);
  const save = async (binding: string) => {
    if (pending.current) return;
    try {
      const registry = new CommandRegistry();
      commands.forEach((c) => registry.register(c));
      registry.bind(command.id, binding);
      pending.current = true;
      setSaving(true);
      setRecording(false);
      setError("");
      await onBind(command.id, binding);
      setSaved(binding);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setRecording(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  const capture = (event: KeyboardEvent | ReactKey<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const composing =
      "nativeEvent" in event
        ? event.nativeEvent.isComposing
        : event.isComposing;
    if (
      composing ||
      event.repeat ||
      ["Control", "Meta", "Shift", "Alt"].includes(event.key)
    )
      return;
    if (event.key === "Escape") {
      setRecording(false);
      setError("");
      return;
    }
    void save(
      ["Backspace", "Delete"].includes(event.key) ? "" : keyboardBinding(event),
    );
  };
  const latest = useRef(capture);
  latest.current = capture;
  useLayoutEffect(() => {
    if (recording) input.current?.focus({ preventScroll: true });
  }, [recording]);
  useEffect(() => {
    if (isTauri())
      void emitTo("main", "shortcut-recording", {
        id: command.id,
        active: recording,
      });
    if (!recording || typeof window === "undefined") return;
    const handler = (event: KeyboardEvent) => {
      if (event.target === input.current) {
        event.stopImmediatePropagation();
        latest.current(event);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => {
      window.removeEventListener("keydown", handler, true);
      if (isTauri())
        void emitTo("main", "shortcut-recording", {
          id: command.id,
          active: false,
        });
    };
  }, [recording]);
  useEffect(() => {
    if (saved === command.binding) setSaved(null);
  }, [command.binding, saved]);
  return (
    <div className="binding-editor">
      {recording ? (
        <>
          <input
            ref={input}
            readOnly
            className="key-binding"
            aria-label={`录入快捷键 ${command.title}`}
            value="请按组合键…"
            onBlur={(event) => {
              if (
                !event.currentTarget.parentElement?.contains(
                  event.relatedTarget as Node,
                )
              )
                setRecording(false);
            }}
            onKeyDownCapture={capture}
          />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setRecording(false);
              setError("");
            }}
          >
            取消
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void save("")}
          >
            清除
          </button>
        </>
      ) : (
        <button
          type="button"
          className="key-binding"
          disabled={saving}
          aria-label={`设置快捷键 ${command.title}`}
          onClick={() => {
            setRecording(true);
            setError("");
          }}
        >
          <kbd>{formatBinding(saved ?? command.binding) || "未绑定"}</kbd>
        </button>
      )}
      {saving && <small role="status">保存中…</small>}
      {saved !== null && !saving && <small role="status">已保存</small>}
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
