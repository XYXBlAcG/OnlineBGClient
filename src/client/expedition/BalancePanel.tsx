import { useEffect, useRef, useState } from "react";
import { Panel } from "../ui/Controls";
import { type BenchmarkReport } from "../../domain/expedition/benchmark";
import reportData from "./balance-report.json";
import { cards, cardText, type CardId } from "../../domain/expedition/content";
declare const __EXPEDITION_WORKER__: string;
function ResultTable({ report }: { report: BenchmarkReport }) {
  return (
    <div className="exp-report-table">
      <table>
        <thead>
          <tr>
            <th>策略</th>
            <th>通关</th>
            <th>通关率</th>
            <th>平均剩余生命</th>
            <th>平均回合</th>
            <th>实际吸收伤害</th>
            <th>整批耗时</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row) => (
            <tr key={row.policy}>
              <th>{row.name}</th>
              <td>
                {row.wins}/{row.runs}
              </td>
              <td>{(row.winRate * 100).toFixed(0)}%</td>
              <td>{row.meanHp.toFixed(1)} / 90</td>
              <td>{row.meanRounds.toFixed(1)}</td>
              <td>{row.meanBlocked.toFixed(1)}</td>
              <td>{row.elapsedMs.toFixed(0)} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BalancePanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [report, setReport] = useState(reportData as BenchmarkReport),
    [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState("");
  const runner = useRef<{ worker: Worker; url: string } | null>(null);
  const stop = () => {
    if (runner.current) {
      runner.current.worker.terminate();
      URL.revokeObjectURL(runner.current.url);
      runner.current = null;
    }
    setProgress(null);
  };
  useEffect(
    () => () => {
      if (runner.current) {
        runner.current.worker.terminate();
        URL.revokeObjectURL(runner.current.url);
      }
    },
    [],
  );
  const run = () => {
    stop();
    setProgress(0);
    setError("");
    const url = URL.createObjectURL(
        new Blob([__EXPEDITION_WORKER__], { type: "text/javascript" }),
      ),
      worker = new Worker(url);
    runner.current = { worker, url };
    worker.onmessage = (
      event: MessageEvent<{
        type: string;
        done: number;
        total: number;
        report: BenchmarkReport;
        message: string;
      }>,
    ) => {
      if (event.data.type === "progress")
        setProgress(event.data.done / event.data.total);
      if (event.data.type === "done") {
        setReport(event.data.report);
        stop();
      }
      if (event.data.type === "error") {
        setError(event.data.message);
        stop();
      }
    };
    worker.onerror = (event) => {
      setError(event.message);
      stop();
    };
    worker.postMessage(100);
  };
  return (
    <Panel
      open={open}
      onOpenChange={onOpenChange}
      title="规则数值与实测"
      className="exp-balance"
    >
      <p className="exp-muted">
        当前版本设计值与实测分开列出。以下数据来自三场遭遇连续通关；不是原作数据或真人胜率。
      </p>
      <div className="exp-report-meta">
        <span>
          固定种子 {report.seedPrefix}
          {String(report.seedStart).padStart(3, "0")}–
          {report.seedStart + report.sampleCount - 1}
        </span>
        <span>每种策略 {report.sampleCount} 局</span>
        <span>牌库顺序对策略隐藏</span>
      </div>
      <ResultTable report={report} />
      {report.holdout && (
        <>
          <p className="exp-muted">
            独立复核：种子 {report.holdout.seedStart}–
            {report.holdout.seedStart + report.holdout.sampleCount - 1}
            ，每种策略 {report.holdout.sampleCount} 局。
          </p>
          <ResultTable report={report.holdout} />
        </>
      )}
      <p className="exp-muted">
        平均值包含失败局。格挡统计只计实际吸收的伤害。{report.environment}
        {report.rulesHash ? ` · 规则 ${report.rulesHash}` : ""}
      </p>
      <div className="exp-benchmark-actions">
        <button onClick={run} disabled={progress !== null}>
          在本机重测 300 局
        </button>
        {progress !== null && (
          <>
            <progress max="1" value={progress} />
            <span>{Math.round(progress * 100)}%</span>
            <button onClick={stop}>停止测试</button>
          </>
        )}
        {error && <span role="alert">{error}</span>}
      </div>
      <details className="exp-number-sheet">
        <summary>全部 15 种牌的初始设计值</summary>
        <table>
          <thead>
            <tr>
              <th>牌名</th>
              <th>能量</th>
              <th>效果</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(cards) as CardId[]).map((id) => (
              <tr key={id}>
                <th>{cards[id].name}</th>
                <td>{cards[id].cost}</td>
                <td>{cardText({ id: "sheet", card: id, upgraded: false })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <div className="exp-method">
        <strong>三种策略的具体定义</strong>
        <p>
          随机合法：将当前合法动作（包括结束行动）按种子洗牌。进攻优先：伤害、击杀和成长权重较高。团队生存：额外计入本回合有效保护、治疗与避免倒地。三者共用规则执行器，未使用未来抽牌结果。
        </p>
      </div>
    </Panel>
  );
}
