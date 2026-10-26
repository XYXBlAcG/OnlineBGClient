import { VoiceDock } from "./voice/VoiceControls";
import type { ImageQuality, Attachment } from "../domain/attachments";
import { ChatComposer } from "./social/ChatComposer";
import { ChatImage } from "./social/ChatImage";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Snapshot } from "../domain/protocol";
import type { Preferences } from "./preferences";
import { ChatReadState } from "./chat-read";
import { notifyMessage, playCue } from "./notifications";

export function ChatPanel({
  snapshot,
  endpoint,
  preferences,
  onText,
  onImage,
  token,
  onBannerDisplay,
  onImageQuality,
  onUnread,
  onClose,
  showClose = true,
}: {
  snapshot: Snapshot;
  endpoint?: string;
  preferences: Preferences;
  onText: (text: string) => void;
  onImage?: (image: Attachment) => void;
  token?: string;
  onBannerDisplay?: (enabled: boolean) => void;
  onImageQuality?: (quality: ImageQuality) => void;
  onUnread: (count: number) => void;
  onClose: () => void;
  showClose?: boolean;
}) {
  const panel = useRef<HTMLElement>(null);
  const ownId =
    snapshot.actor < 0 ? snapshot.host!.id : snapshot.seats[snapshot.actor].id;
  const key = `chat-read:${endpoint || "local"}:${snapshot.room}:${ownId}`;
  const read = useMemo(() => new ChatReadState(key, localStorage), [key]);
  const [atBottom, setAtBottom] = useState(true),
    [active, setActive] = useState(!document.hidden && document.hasFocus());
  const messages = useRef<HTMLDivElement>(null),
    lastSeen = useRef(snapshot.chatSequence);
  const [, refreshRead] = useState(0);
  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === key) refreshRead((value) => value + 1);
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, [key]);
  const sequence = snapshot.chatSequence,
    own = snapshot.chatTotals[ownId] || 0;
  const unread = localStorage.getItem(key) ? read.unread(sequence, own) : 0;
  useEffect(() => {
    const update = () => setActive(!document.hidden && document.hasFocus());
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    if (!localStorage.getItem(key)) read.mark(sequence, own);
    if (preferences.chatVisible && atBottom && active) {
      read.mark(sequence, own);
      onUnread(0);
    } else onUnread(unread);
    const incoming = snapshot.chat.filter(
      (message) =>
        message.sequence > lastSeen.current && message.sender !== ownId,
    );
    lastSeen.current = sequence;
    if (!incoming.length) return;
    if (preferences.messageSound) playCue("message", preferences.soundVolume);
    if (preferences.systemNotifications && !active) {
      const latest = incoming.at(-1)!;
      notifyMessage(latest.name, latest.text);
    }
  }, [
    sequence,
    own,
    ownId,
    key,
    preferences.chatVisible,
    preferences.messageSound,
    preferences.systemNotifications,
    atBottom,
    active,
    unread,
  ]);
  useLayoutEffect(() => {
    if (preferences.chatVisible && atBottom && messages.current)
      messages.current.scrollTop = messages.current.scrollHeight;
  }, [sequence, preferences.chatVisible, atBottom]);
  const jump = () => {
    setAtBottom(true);
    if (messages.current)
      messages.current.scrollTop = messages.current.scrollHeight;
    read.mark(sequence, own);
    onUnread(0);
  };
  return (
    <aside ref={panel} className="chat-panel" hidden={!preferences.chatVisible}>
      <div className="chat-heading">
        <h2>房间消息</h2>
        {showClose && (
          <button type="button" aria-label="收起聊天" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      <div
        ref={messages}
        className="chat-messages"
        onScroll={(event) => {
          const box = event.currentTarget;
          setAtBottom(box.scrollHeight - box.scrollTop - box.clientHeight < 36);
        }}
      >
        {snapshot.chat.map((message) => (
          <div
            key={message.sequence}
            data-content={message.type}
            className={`chat-message ${message.sender === ownId ? "own-message" : ""}`}
          >
            <div className="chat-message-meta">
              <small>{message.name}</small>
              <time
                dateTime={new Date(message.time).toISOString()}
                title={new Date(message.time).toLocaleString()}
              >
                {new Date(message.time).toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
            </div>
            {message.type === "image" && token ? (
              <ChatImage
                image={message.attachment}
                session={{ room: snapshot.room, token, endpoint }}
              />
            ) : (
              <p>
                {message.type === "banner" || message.type === "emote"
                  ? "✦ "
                  : ""}
                {message.text}
              </p>
            )}
          </div>
        ))}
      </div>
      {!atBottom && unread > 0 && (
        <button className="new-messages" onClick={jump}>
          新消息 · {unread}
        </button>
      )}
      <ChatComposer
        snapshot={snapshot}
        preferences={preferences}
        onText={(value) => {
          onText(value);
          jump();
        }}
        onImage={onImage}
        session={token ? { room: snapshot.room, token, endpoint } : undefined}
        onBannerDisplay={onBannerDisplay}
        onImageQuality={onImageQuality}
      />
      <VoiceDock />
    </aside>
  );
}
