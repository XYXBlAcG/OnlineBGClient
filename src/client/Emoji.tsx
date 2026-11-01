import { emojiRegistry } from "./emoji/client";
import twemoji from "@twemoji/api";
import { Fragment, useSyncExternalStore } from "react";

export function emojiUrl(text: string): string | undefined {
  const code = twemoji.convert.toCodePoint(text.replace(/\uFE0F/g, ""));
  const exact = twemoji.convert.toCodePoint(text);
  return emojiRegistry.url(code) ?? emojiRegistry.url(exact);
}
export function Emoji({ text }: { text: string }) {
  useSyncExternalStore(
    emojiRegistry.subscribePack,
    emojiRegistry.packSnapshot,
    emojiRegistry.packSnapshot,
  );
  const parts: { text: string; emoji: boolean }[] = [];
  let rest = text;
  twemoji.replace(text, (match) => {
    const index = rest.indexOf(match);
    if (index > 0) parts.push({ text: rest.slice(0, index), emoji: false });
    parts.push({ text: match, emoji: true });
    rest = rest.slice(index + match.length);
    return match;
  });
  if (rest) parts.push({ text: rest, emoji: false });
  return (
    <>
      {parts.map((part, index) => {
        const src = part.emoji ? emojiUrl(part.text) : undefined;
        return src ? (
          <img
            key={index}
            className="shared-emoji"
            src={src}
            alt={part.text}
            draggable={false}
            onError={() => emojiRegistry.unavailable(src)}
          />
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        );
      })}
    </>
  );
}
