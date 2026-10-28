import { useEffect, useState } from "react";
import type { Snapshot } from "../domain/protocol";
export function ComputeStatus({
  snapshot,
  details = false,
  control,
  benchmarkVisible = false,
}: {
  snapshot: Snapshot;
  details?: boolean;
  benchmarkVisible?: boolean;
  control: (enabled: boolean) => void;
}) {
  const metric = snapshot.computation;
  const [elapsed, setElapsed] = useState(metric?.elapsedMs || 0);
  useEffect(() => {
    setElapsed(metric?.elapsedMs || 0);
    if (
      !details ||
      !snapshot.playing ||
      metric?.status !== "computing" ||
      snapshot.paused ||
      snapshot.finished
    )
      return;
    const received = performance.now();
    const timer = setInterval(
      () => setElapsed(metric.elapsedMs + performance.now() - received),
      100,
    );
    return () => clearInterval(timer);
  }, [metric, snapshot.playing, snapshot.paused, snapshot.finished, details]);
  const work = metric?.simulations || metric?.scoredCandidates || 0;
  const benchmark =
    benchmarkVisible && snapshot.kind === "tq" && snapshot.config.humans === 0;
  if (!snapshot.playing || snapshot.finished || (!metric && !benchmark))
    return null;
  return (
    <div className="compute-status" aria-label="AI计算统计">
      {metric && (
        <span>
          {snapshot.paused || snapshot.aiPaused
            ? "AI 已暂停"
            : `${snapshot.seats[metric.actor]?.name ?? "AI"}${metric.status === "computing" && !snapshot.finished ? "正在决策" : "已完成决策"}`}
          {details && (
            <>
              {" "}
              · {(elapsed / 1000).toFixed(2)} 秒 · {work}{" "}
              {metric.simulations ? "次模拟" : "个候选"} ·{" "}
              {Math.round((work * 1000) / Math.max(1, elapsed))} 次/秒 ·
              并行上限 {metric.threads} 线程
            </>
          )}
          {benchmark &&
            details &&
            ` · 已完成 ${metric.completedDecisions} 次决策 · 平均 ${(metric.totalElapsedMs / Math.max(1, metric.completedDecisions) / 1000).toFixed(2)} 秒/次 · 累计 ${metric.totalSimulations} 次模拟`}
        </span>
      )}
      {benchmark && snapshot.canManage && !snapshot.finished && (
        <button onClick={() => control(snapshot.aiPaused)}>
          {" "}
          {snapshot.aiPaused ? "继续 AI 测试" : "暂停 AI 测试"}
        </button>
      )}
    </div>
  );
}
