import { useEffect, useState } from "react";
import { builtinStickers } from "../domain/social";
import type { Stickers } from "./stickers";

export function StickerImage({
  id,
  name,
  stickers,
  reduced,
}: {
  id: string;
  name: string;
  stickers: Stickers;
  reduced: boolean;
}) {
  const builtin = builtinStickers.find((asset) => asset.id === id);
  const [url, setUrl] = useState(""),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (builtin) return;
    let disposed = false,
      cleanup: (() => void) | undefined;
    setUrl("");
    setError(false);
    void stickers
      .url(id, reduced)
      .then((asset) => {
        if (disposed) asset.dispose();
        else {
          setUrl(asset.url);
          cleanup = asset.dispose;
        }
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [id, reduced, stickers, retry]);
  if (builtin)
    return (
      <span className="builtin-sticker" role="img" aria-label={name}>
        {builtin.emoji}
      </span>
    );
  if (error)
    return (
      <button onClick={() => setRetry((value) => value + 1)}>
        加载失败，重试
      </button>
    );
  return url ? (
    <img
      className="chat-sticker"
      src={url}
      alt={name}
      onError={() => setError(true)}
    />
  ) : (
    <span className="muted">加载表情…</span>
  );
}
