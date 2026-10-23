import * as Popover from "@radix-ui/react-popover";
import { useEffect, useRef, useState } from "react";
import {
  imageProfiles,
  type ImageQuality,
  type Attachment,
} from "../../domain/attachments";
import type { Snapshot } from "../../domain/protocol";
import { bannerCommands } from "../../domain/banner";
import { interactionCatalogue } from "../../domain/social";
import { phraseGroups } from "../../domain/phrases";
import { PhraseMenu } from "../PhraseMenu";
import type { Preferences } from "../preferences";
import { Panel, Switch, Select } from "../ui/Controls";
import { prepareImage, uploadImage, type MediaSession } from "./media";

export function ChatComposer({
  snapshot,
  preferences,
  onText,
  onImage,
  session,
  onBannerDisplay,
  onImageQuality,
}: {
  snapshot: Snapshot;
  preferences: Preferences;
  onText: (text: string) => void;
  onImage?: (image: Attachment) => void;
  session?: MediaSession;
  onBannerDisplay?: (enabled: boolean) => void;
  onImageQuality?: (quality: ImageQuality) => void;
}) {
  const [text, setText] = useState(""),
    [help, setHelp] = useState(false);
  const [prepared, setPrepared] = useState<File | null>(null),
    [preview, setPreview] = useState("");
  const [phase, setPhase] = useState<"idle" | "compress" | "upload">("idle"),
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
          onImage(image);
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
    if (text.trim() === "/help") {
      setHelp(true);
      setText("");
      return;
    }
    onText(text.trim());
    setText("");
  };
  const allowed =
    snapshot.bannerPolicy.mode !== "off" &&
    (snapshot.canManage ||
      snapshot.bannerPolicy.mode === "all" ||
      (snapshot.bannerPolicy.mode === "selected" &&
        snapshot.bannerPolicy.members.includes(
          snapshot.seats[snapshot.actor]?.id,
        )));
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
                groups={phraseGroups(snapshot.kind, preferences.phraseGroups)}
                onSend={onText}
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
        <button type="button" onClick={() => setHelp(true)}>
          指令
        </button>
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
      {(phase !== "idle" || prepared) && (
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
      {text.startsWith("/") && !prepared && (
        <div className="chat-command-hints">
          {!allowed &&
            bannerCommands.find(
              (command) => command.command === text.split(/\s/u)[0],
            )?.permission === "banner" && (
              <small>横幅需要房主授权，仍可使用聊天指令或查看帮助</small>
            )}
          {bannerCommands
            .filter((item) => item.command.startsWith(text.split(/\s/u)[0]))
            .map((item) => (
              <button
                type="button"
                key={item.command}
                onClick={() =>
                  setText(
                    item.command === "/help" ? "/help" : `${item.command} `,
                  )
                }
              >
                {item.command} · {item.label}
              </button>
            ))}
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
          placeholder="发消息，或输入 / 指令"
          maxLength={500}
          value={text}
          disabled={!!prepared || phase !== "idle"}
          onChange={(event) => setText(event.target.value)}
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
          发送
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
            {Object.entries(interactionCatalogue).map(([key, effect]) => (
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
