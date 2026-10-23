import { useEffect, useRef, useState } from "react";
import type { Attachment } from "../../domain/attachments";
import { fetchImage, type MediaSession } from "./media";
import { Panel } from "../ui/Controls";
export function ChatImage({
  image,
  session,
}: {
  image: Attachment;
  session: MediaSession;
}) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [attempt, setAttempt] = useState(0),
    [pixels, setPixels] = useState(false);
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let objectUrl = "",
      started = false,
      disposed = false;
    const controller = new AbortController();
    setUrl("");
    setError("");
    const load = () => {
      if (started) return;
      started = true;
      void fetchImage(session, image, controller.signal)
        .then((bytes) => {
          if (disposed) return;
          objectUrl = URL.createObjectURL(bytes);
          setUrl(objectUrl);
        })
        .catch((error) => {
          if (!disposed)
            setError(error instanceof Error ? error.message : "图片加载失败");
        });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          load();
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    if (element.current) observer.observe(element.current);
    return () => {
      disposed = true;
      controller.abort();
      observer.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [session.endpoint, session.room, session.token, image.id, attempt]);
  return (
    <div
      ref={element}
      className="chat-image"
      style={{ aspectRatio: `${image.width}/${image.height}` }}
    >
      {url ? (
        <button
          type="button"
          className="chat-image-open"
          aria-label="查看聊天图片"
          onClick={() => setOpen(true)}
        >
          <img
            src={url}
            alt="聊天图片"
            width={image.width}
            height={image.height}
            loading="lazy"
          />
        </button>
      ) : error ? (
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          {error} · 重试
        </button>
      ) : (
        <span className="muted">图片加载中</span>
      )}
      <Panel
        title="聊天图片"
        className="image-viewer"
        open={open}
        onOpenChange={setOpen}
      >
        {url && (
          <>
            <button
              type="button"
              aria-pressed={pixels}
              onClick={() => setPixels((value) => !value)}
            >
              {pixels ? "适应窗口" : "实际像素"}
            </button>
            <div className="image-viewer-canvas" data-pixels={pixels}>
              <img
                src={url}
                alt="聊天图片大图"
                width={image.width}
                height={image.height}
              />
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
