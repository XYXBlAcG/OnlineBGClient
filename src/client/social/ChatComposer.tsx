import { withDefaultBannerColor } from "../../domain/banner";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  imageProfiles,
  type ImageQuality,
  type Attachment,
} from "../../domain/attachments";
import type { Snapshot } from "../../domain/protocol";
import { bannerCommands } from "../../domain/banner";
import { freeInteractionCatalogue } from "../../domain/social";
import { phraseGroups } from "../../domain/phrases";
import { PhraseMenu } from "../PhraseMenu";
import type { Preferences } from "../preferences";
import { Panel, Switch, Select } from "../ui/Controls";
import { prepareImage, uploadImage, type MediaSession } from "./media";
import {
  applyChatSuggestion,
  chatSuggestions,
  type ChatSuggestion,
} from "./chat-suggestions";

export function ChatComposer({
  snapshot,
  preferences,
  onText,
  onImage,
  session,
  onBannerDisplay,
  onImageQuality,
}: {
  snapshot?: Snapshot;
  preferences: Preferences;
  onText: (text: string) => void | Promise<void>;
  onImage?: (image: Attachment) => void | Promise<void>;
  session?: MediaSession;
  onBannerDisplay?: (enabled: boolean) => void;
  onImageQuality?: (quality: ImageQuality) => void;
}) {
  const [text, setText] = useState(""),
    [help, setHelp] = useState(false),
    [caret, setCaret] = useState(0),
    [activeSuggestion, setActiveSuggestion] = useState(0),
    [dismissedSuggestion, setDismissedSuggestion] = useState("");
  const [prepared, setPrepared] = useState<File | null>(null),
    [preview, setPreview] = useState("");
  const [phase, setPhase] = useState<"idle" | "compress" | "upload" | "send">(
      "idle",
    ),
    [progress, setProgress] = useState(0),
    [error, setError] = useState("");
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const original = useRef<File>();
  const input = useRef<HTMLInputElement>(null),
    abort = useRef<AbortController | null>(null);
  const sessionKey = `${session?.endpoint}:${session?.room}:${session?.token}`;
  useEffect(
    () => () => {
      abort.current?.abort();
      abort.current = null;
    },
    [sessionKey],
  );
  useEffect(() => {
    setPrepared(null);
    original.current = undefined;
    setPhase("idle");
    setError("");
  }, [sessionKey]);
  useEffect(() => {
    if (!prepared) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(prepared);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [prepared]);
  const choose = async (
    file: File,
    quality: ImageQuality = preferences.imageQuality,
  ) => {
    if (phase !== "idle") return;
    const controller = new AbortController();
    original.current = file;
    abort.current = controller;
    setPhase("compress");
    setError("");
    setProgress(0);
    try {
      const result = await prepareImage(
        file,
        controller.signal,
        setProgress,
        quality,
      );
      const bitmap = await createImageBitmap(result);
      if (!controller.signal.aborted) {
        setDimensions({ width: bitmap.width, height: bitmap.height });
        setPrepared(result);
      }
      bitmap.close();
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : "图片压缩失败");
    } finally {
      if (abort.current === controller) setPhase("idle");
    }
  };
  const submit = async () => {
    if (phase !== "idle") return;
    if (prepared && session && onImage) {
      const controller = new AbortController();
      abort.current = controller;
      setPhase("upload");
      setError("");
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const image = await uploadImage(session, prepared, controller.signal);
        if (!controller.signal.aborted) {
          await onImage(image);
          setPrepared(null);
          original.current = undefined;
        }
      } catch (error) {
        if (abort.current === controller)
          setError(
            controller.signal.aborted
              ? "上传已中止，可重新发送"
              : error instanceof Error
                ? error.message
                : "上传失败",
          );
      } finally {
        clearTimeout(timer);
        if (abort.current === controller) setPhase("idle");
      }
      return;
    }
    if (!text.trim()) return;
    if (snapshot && text.trim() === "/help") {
      setHelp(true);
      setText("");
      setCaret(0);
      setDismissedSuggestion("");
      return;
    }
    try {
      setPhase("send");
      await onText(
        withDefaultBannerColor(text.trim(), preferences.bannerColor),
      );
      setError("");
      setText("");
      setCaret(0);
      setDismissedSuggestion("");
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setPhase("idle");
    }
  };
  const allowed =
    !!snapshot &&
    snapshot.bannerPolicy.mode !== "off" &&
    (snapshot.canManage ||
      snapshot.bannerPolicy.mode === "all" ||
      (snapshot.bannerPolicy.mode === "selected" &&
        snapshot.bannerPolicy.members.includes(
          snapshot.seats[snapshot.actor]?.id,
        )));
  const suggestions = useMemo(
    () => (snapshot ? chatSuggestions(text, caret, snapshot) : []),
    [text, caret, snapshot],
  );
  const suggestionKey = `${text}:${caret}`;
  const suggestionsOpen =
    suggestions.length > 0 &&
    dismissedSuggestion !== suggestionKey &&
    !prepared &&
    phase === "idle";
  useEffect(() => setActiveSuggestion(0), [text, caret]);
  useEffect(() => {
    if (!suggestionsOpen || typeof document === "undefined") return;
    document
      .getElementById(`chat-suggestion-${activeSuggestion}`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [activeSuggestion, suggestionsOpen]);
  const commitSuggestion = (suggestion: ChatSuggestion) => {
    const next = applyChatSuggestion(text, suggestion);
    setText(next.text);
    setCaret(next.caret);
    setDismissedSuggestion(`${next.text}:${next.caret}`);
    requestAnimationFrame(() => {
      const element = input.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(next.caret, next.caret);
    });
  };
  const handleComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestionsOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((value) => (value + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion(
        (value) => (value - 1 + suggestions.length) % suggestions.length,
      );
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const suggestion = suggestions[activeSuggestion];
      if (suggestion) commitSuggestion(suggestion);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDismissedSuggestion(suggestionKey);
    }
  };
  return (
    <div className="chat-composer">
      <div className="chat-compose-tools">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button type="button">常用语</button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              data-motion-scope="ui"
              className="ui-popover quick-phrase-menu"
              sideOffset={8}
            >
              <PhraseMenu
                groups={
                  snapshot
                    ? phraseGroups(snapshot.kind, preferences.phraseGroups)
                    : preferences.phraseGroups
                }
                onSend={(value) => {
                  void Promise.resolve(onText(value)).catch((error) =>
                    setError(
                      error instanceof Error ? error.message : String(error),
                    ),
                  );
                }}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        {session && onImage && (
          <>
            <button
              type="button"
              disabled={phase !== "idle"}
              onClick={() => input.current?.click()}
            >
              图片
            </button>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void choose(file);
              }}
            />
          </>
        )}
        {snapshot && (
          <button type="button" onClick={() => setHelp(true)}>
            指令
          </button>
        )}
        {onBannerDisplay && (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button type="button" aria-label="聊天显示设置">
                显示
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="ui-popover" sideOffset={8}>
                <Switch
                  label="本机显示横幅与全屏表情"
                  checked={preferences.bannerDisplay}
                  onCheckedChange={onBannerDisplay}
                />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>
      {session && onImage && (
        <label className="chat-upload-quality">
          图片
          <Select
            aria-label="图片清晰度"
            value={preferences.imageQuality}
            disabled={phase !== "idle"}
            onValueChange={(value) => {
              onImageQuality?.(value as ImageQuality);
              if (original.current)
                void choose(original.current, value as ImageQuality);
            }}
          >
            {Object.entries(imageProfiles).map(([key, profile]) => (
              <option key={key} value={key}>
                {profile.label}
              </option>
            ))}
          </Select>
        </label>
      )}
      {((phase !== "idle" && phase !== "send") || prepared) && (
        <div className="chat-upload-preview">
          {preview && <img src={preview} alt="待发送图片" />}
          <span role="status">
            {phase === "compress"
              ? `压缩中 ${Math.round(progress)}%`
              : phase === "upload"
                ? "上传中…"
                : prepared
                  ? `${dimensions.width} × ${dimensions.height} · ${Math.ceil(prepared.size / 1024)} KB · ${imageProfiles[preferences.imageQuality].label}`
                  : ""}
          </span>
          <button
            type="button"
            onClick={() => {
              abort.current?.abort();
              abort.current = null;
              original.current = undefined;
              setPrepared(null);
              setPhase("idle");
              setError("");
            }}
          >
            取消
          </button>
        </div>
      )}
      {error && (
        <p className="chat-upload-error" role="status">
          {error}
        </p>
      )}
      {suggestionsOpen && (
        <div
          className="chat-command-hints"
          id="chat-suggestions"
          role="listbox"
          aria-label={
            suggestions[0]?.kind === "mention" ? "选择玩家" : "选择指令"
          }
        >
          {suggestions.map((suggestion, index) => (
            <button
              type="button"
              key={suggestion.id}
              id={`chat-suggestion-${index}`}
              role="option"
              aria-selected={index === activeSuggestion}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveSuggestion(index)}
              onClick={() => commitSuggestion(suggestion)}
            >
              <code>{suggestion.label}</code>
              <span>{suggestion.detail}</span>
            </button>
          ))}
          {!allowed &&
            suggestions.some(
              (suggestion) =>
                suggestion.kind === "command" &&
                bannerCommands.find(
                  (item) => item.command === suggestion.label,
                )?.permission === "banner",
            ) && (
              <small>横幅需要房主授权，仍可使用聊天指令或查看帮助</small>
            )}
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <input
          aria-label="消息"
          aria-autocomplete="list"
          aria-expanded={suggestionsOpen}
          aria-controls={suggestionsOpen ? "chat-suggestions" : undefined}
          aria-activedescendant={
            suggestionsOpen ? `chat-suggestion-${activeSuggestion}` : undefined
          }
          placeholder="发消息，@ 提及玩家，/ 指令"
          maxLength={500}
          value={text}
          disabled={!!prepared || phase !== "idle"}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setText(value);
            setCaret(event.currentTarget.selectionStart ?? value.length);
          }}
          onClick={(event) =>
            setCaret(event.currentTarget.selectionStart ?? text.length)
          }
          onSelect={(event) =>
            setCaret(event.currentTarget.selectionStart ?? text.length)
          }
          onKeyDown={handleComposerKeyDown}
          onPaste={(event) => {
            const file = event.clipboardData.files[0];
            if (file && session && onImage) {
              event.preventDefault();
              void choose(file);
            }
          }}
        />
        <button
          type="submit"
          disabled={phase !== "idle" || (!prepared && !text.trim())}
        >
          {phase === "send" ? "发送中…" : "发送"}
        </button>
      </form>
      <Panel open={help} onOpenChange={setHelp} title="聊天指令">
        <div className="chat-command-help">
          {bannerCommands.map((item) => (
            <button
              type="button"
              key={item.command}
              onClick={() => {
                setText(item.example);
                setHelp(false);
              }}
            >
              <code>{item.example}</code>
              <span>{item.label}</span>
            </button>
          ))}
          <h3>全屏表情</h3>
          <div className="effect-picker">
            {Object.entries(freeInteractionCatalogue).map(([key, effect]) => (
              <button
                type="button"
                key={key}
                title={effect.name}
                aria-label={effect.name}
                onClick={() => {
                  setText(`/effect ${effect.emoji}`);
                  setHelp(false);
                }}
              >
                {effect.emoji}
              </button>
            ))}
          </div>
          <small className="muted">
            横幅与表情权限由房主管理，发送间隔为 10 秒。
          </small>
        </div>
      </Panel>
    </div>
  );
}
