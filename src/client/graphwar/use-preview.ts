import { useEffect, useRef, useState } from "react";
import type { GraphwarView, Shot } from "../../domain/graphwar/types";
import type { PreviewOutput } from "./preview-worker";
interface PreviewResult {
  view: GraphwarView;
  actor: number;
  formula: string;
  shot?: Shot;
  error?: string;
}
export function usePreview(
  view: GraphwarView,
  actor: number,
  formula: string,
  enabled: boolean,
): Pick<PreviewResult, "shot" | "error"> {
  const request = useRef(0);
  const [result, setResult] = useState<PreviewResult>();
  useEffect(() => {
    if (!enabled || !formula.trim()) return;
    const id = ++request.current;
    let worker: Worker | undefined,
      deadline: ReturnType<typeof setTimeout> | undefined;
    const finish = (value: Pick<PreviewResult, "shot" | "error">) => {
      if (id !== request.current) return;
      clearTimeout(deadline);
      worker?.terminate();
      setResult({ view, actor, formula, ...value });
    };
    const timer = setTimeout(() => {
      try {
        worker = new Worker(new URL("./preview-worker.ts", import.meta.url), {
          type: "module",
        });
        worker.onmessage = ({ data }: MessageEvent<PreviewOutput>) => {
          if (data.id === id)
            finish(
              "shot" in data ? { shot: data.shot } : { error: data.error },
            );
        };
        worker.onerror = () => finish({ error: "预览计算失败，请重新输入" });
        deadline = setTimeout(
          () => finish({ error: "预览超时，请简化函数后重试" }),
          3000,
        );
        worker.postMessage({ id, view, actor, formula });
      } catch {
        finish({ error: "无法启动预览计算，可以关闭预览后发射" });
      }
    }, 220);
    return () => {
      request.current++;
      clearTimeout(timer);
      clearTimeout(deadline);
      worker?.terminate();
    };
  }, [view, actor, formula, enabled]);
  return enabled &&
    result?.view === view &&
    result.actor === actor &&
    result.formula === formula
    ? result
    : {};
}
