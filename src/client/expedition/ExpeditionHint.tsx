import styles from "./ExpeditionHint.module.css";
import { useState } from "react";
import { Button } from "../ui/Controls";
export function ExpeditionHint({ text }: { text: string }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem("expedition.context-hints") !== "0";
    } catch {
      return true;
    }
  });
  return (
    <span className={styles.root}>
      {enabled && <span role="status">{text}</span>}
      <Button
        aria-pressed={enabled}
        onClick={() => {
          const next = !enabled;
          setEnabled(next);
          try {
            localStorage.setItem("expedition.context-hints", next ? "1" : "0");
          } catch {}
        }}
      >
        {enabled ? "隐藏提示" : "即时提示"}
      </Button>
    </span>
  );
}
