import { useMotion } from "./use-motion";
import { useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { builtinStickers } from "../domain/social";
import type { Preferences } from "./preferences";
import { type StoredSticker } from "./storage";
import { StickerImage } from "./StickerImage";
import type { Stickers } from "./stickers";
import { Panel } from "./ui/Controls";

export function StickerPicker({
  stickers,
  preferences,
  onPreferences,
  onSend,
  onEmoji,
  onError,
}: {
  stickers: Stickers;
  preferences: Preferences;
  onPreferences: (value: Preferences) => void;
  onSend: (asset: string, name: string) => void;
  onEmoji: (emoji: string) => void;
  onError: (message: string) => void;
}) {
  const motion = useMotion(preferences.motion);
  const [open, setOpen] = useState(false),
    [custom, setCustom] = useState<StoredSticker[]>([]),
    [preview, setPreview] = useState<StoredSticker | null>(null),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open)
      void stickers
        .list()
        .then(setCustom)
        .catch((error) => onError(String(error)));
  }, [open, stickers]);
  const items = [
    ...builtinStickers.map((asset) => ({ id: asset.id, name: asset.name })),
    ...custom.map((sticker) => sticker.asset),
  ];
  const remember = (id: string) =>
    onPreferences({
      ...preferences,
      stickerRecent: [
        id,
        ...preferences.stickerRecent.filter((value) => value !== id),
      ].slice(0, 12),
    });
  const send = async (id: string, name: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const stored = custom.find((sticker) => sticker.asset.id === id);
      if (stored) await stickers.publish(stored);
      onSend(id, name);
      setOpen(false);
      remember(id);
    } catch (error) {
      onError(String(error));
    } finally {
      setBusy(false);
    }
  };
  const [category, setCategory] = useState<"all" | "favorites" | "recent">(
    "all",
  );
  const ids =
    category === "favorites"
      ? preferences.stickerFavorites
      : preferences.stickerRecent;
  const shown =
    category === "all"
      ? items
      : ids
          .map((id) => items.find((item) => item.id === id))
          .filter((item): item is (typeof items)[number] => !!item);
  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button type="button" aria-label="表情包">
            ☺
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="ui-popover sticker-picker"
            sideOffset={8}
            collisionPadding={10}
          >
            <div className="sticker-tabs">
              {[
                ["all", "全部"],
                ["favorites", "收藏"],
                ["recent", "最近"],
              ].map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setCategory(id as typeof category)}
                >
                  {label}
                </button>
              ))}
              <button type="button" onClick={() => input.current?.click()}>
                导入图片
              </button>
            </div>
            <div className="emoji-picker">
              {["😀", "😂", "🥺", "😎", "👍", "🎉", "❤️", "🙏"].map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => {
                    onEmoji(emoji);
                    setOpen(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="sticker-grid">
              {shown.map((item) => (
                <div key={item.id}>
                  <button
                    disabled={busy}
                    type="button"
                    aria-label={`发送${item.name}`}
                    onClick={() => void send(item.id, item.name)}
                  >
                    <StickerImage
                      id={item.id}
                      name={item.name}
                      stickers={stickers}
                      reduced={!motion}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={`收藏${item.name}`}
                    onClick={() =>
                      onPreferences({
                        ...preferences,
                        stickerFavorites: preferences.stickerFavorites.includes(
                          item.id,
                        )
                          ? preferences.stickerFavorites.filter(
                              (id) => id !== item.id,
                            )
                          : [...preferences.stickerFavorites, item.id],
                      })
                    }
                  >
                    {preferences.stickerFavorites.includes(item.id) ? "★" : "☆"}
                  </button>
                </div>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <input
        ref={input}
        type="file"
        accept="image/png,image/webp,image/gif"
        hidden
        aria-label="导入表情图片"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void stickers
            .import(file)
            .then(setPreview)
            .catch((error) => onError(String(error)));
        }}
      />
      <Panel
        title="表情预览"
        open={!!preview}
        onOpenChange={(value) => {
          if (!value) setPreview(null);
        }}
      >
        {preview && (
          <>
            <Preview blob={preview.preview} />
            <p>{preview.asset.name}</p>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const asset = await stickers.publish(preview);
                  onSend(asset.id, asset.name);
                  remember(asset.id);
                  setPreview(null);
                  setOpen(false);
                } catch (error) {
                  onError(String(error));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "发送中…" : "发送表情"}
            </button>
            <button onClick={() => setPreview(null)}>取消</button>
          </>
        )}
      </Panel>
    </>
  );
}
function Preview({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const value = URL.createObjectURL(blob);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [blob]);
  return <img className="chat-sticker" src={url} alt="待发送表情" />;
}
