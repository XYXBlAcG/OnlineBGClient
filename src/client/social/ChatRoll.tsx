import { useEffect, useState } from "react";
import type { ChatMessage } from "../../domain/social";
import { usePresentation } from "../motion";
export function ChatRoll({
  message,
  serverTime,
}: {
  message: Extract<ChatMessage, { type: "roll" }>;
  serverTime: number;
}) {
  const motion = usePresentation();
  const [fresh, setFresh] = useState(
    () => serverTime >= message.time && serverTime - message.time < 4000,
  );
  const duration = 850,
    stagger = 70;
  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(
      () => setFresh(false),
      duration + (message.results.length - 1) * stagger + 50,
    );
    return () => clearTimeout(timer);
  }, [message.id]);
  return (
    <div
      className="chat-roll"
      data-motion-scope="social"
      data-rolling={fresh && motion.social && motion.ui}
      style={{ "--die-duration": `${duration}ms` } as React.CSSProperties}
    >
      <div
        className="chat-dice"
        aria-label={`${message.results.length} 个 ${message.sides} 面骰子，结果 ${message.results.join("、")}`}
      >
        {message.results.map((value, index) => (
          <span
            className="chat-die-stage"
            key={index}
            style={
              { "--die-delay": `${index * stagger}ms` } as React.CSSProperties
            }
          >
            <span className="chat-die">
              <span className="chat-die-face">{value}</span>
              <span className="chat-die-side" aria-hidden="true">
                ✦
              </span>
              <span className="chat-die-top" aria-hidden="true">
                ·
              </span>
            </span>
          </span>
        ))}
      </div>
      <small>
        {message.results.length}d{message.sides} · 合计{" "}
        <strong>{message.results.reduce((a, b) => a + b, 0)}</strong>
      </small>
    </div>
  );
}
