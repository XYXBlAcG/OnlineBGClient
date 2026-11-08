import { useEffect, useState } from "react";
import "./FpsMeter.css";

export function FpsMeter({ visible }: { visible: boolean }) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (!visible || typeof requestAnimationFrame === "undefined") return;
    let frame = 0;
    let frames = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible]);
  if (!visible) return null;
  return (
    <output
      className="fps-meter"
      data-low={fps > 0 && fps < 45 ? "true" : "false"}
      aria-label="帧率"
    >
      {fps} FPS
    </output>
  );
}
