import { Select } from "./ui/Controls";
import { useEffect, useRef, useState } from "react";
import { strategyConfig } from "../domain/strategy";
import type { Decision } from "../domain/types";
import type { Snapshot } from "../domain/protocol";

export function Audit({ snapshot }: { snapshot: Snapshot }) {
  const [selected, setSelected] = useState(0);
  const [result, setResult] = useState("");
  const [alternative, setAlternative] = useState<number | null>(null);
  const worker = useRef<Worker>();
  const [replaying, setReplaying] = useState(false);
  useEffect(() => {
    const instance = new Worker(new URL("./audit-worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = instance;
    instance.onmessage = (event) => {
      setResult(event.data as string);
      setReplaying(false);
    };
    instance.onerror = (event) => {
      setResult(event.message);
      setReplaying(false);
    };
    return () => instance.terminate();
  }, []);
  const decision: Decision | undefined =
    snapshot.decisions[Math.min(selected, snapshot.decisions.length - 1)];
  const download = (value: unknown, name: string) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="audit-panel">
      <div className="section-toolbar">
        <h2>策略审核</h2>
        <button
          onClick={() => download(strategyConfig, "strategy-config.json")}
        >
          导出策略配置
        </button>
        <button
          disabled={!snapshot.decisions.length}
          onClick={() =>
            download(snapshot.decisions, `${snapshot.room}-decisions.json`)
          }
        >
          导出决策
        </button>
      </div>
      {!decision ? (
        <>
          <p>
            {snapshot.config.training
              ? "等待 AI 决策"
              : "完整候选与手牌信息将在对局结束后开放。训练房间可即时审核。"}
          </p>
          <div className="activity-list">
            {snapshot.summaries.map((summary) => (
              <div key={summary.version}>
                <span>{snapshot.seats[summary.actor].name}</span>
                <strong>{summary.label}</strong>
                <small>{summary.simulations} 次模拟</small>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <Select
            aria-label="选择决策"
            value={Math.min(selected, snapshot.decisions.length - 1)}
            onValueChange={(value) => {
              setSelected(Number(value));
              setAlternative(null);
              setResult("");
            }}
          >
            {snapshot.decisions.map((entry, index) => (
              <option value={index} key={index}>
                {index + 1} · {snapshot.seats[entry.actor].name} ·{" "}
                {
                  entry.candidates.find(
                    (candidate) =>
                      JSON.stringify(candidate.action) ===
                      JSON.stringify(entry.chosen),
                  )?.label
                }
              </option>
            ))}
          </Select>
          <div className="audit-meta">
            <span>{decision.version}</span>
            <span>{decision.difficulty}</span>
            <span>{decision.simulations} 次模拟</span>
          </div>
          <details>
            <summary>观察与假设</summary>
            {decision.assumptions.map((text) => (
              <p key={text}>{text}</p>
            ))}
            <pre>{JSON.stringify(decision.observation, null, 2)}</pre>
          </details>
          <div className="section-toolbar">
            <button
              disabled={replaying}
              onClick={() => {
                setReplaying(true);
                setResult("正在重放");
                worker.current!.postMessage(decision);
              }}
            >
              重放决策
            </button>
            <button
              onClick={() => download(decision, "decision-scenario.json")}
            >
              保存情景
            </button>
            <span role="status">{result}</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>候选动作</th>
                  <th>总评分</th>
                  <th>模拟均值 ± 标准误</th>
                  <th>审核</th>
                </tr>
              </thead>
              <tbody>
                {decision.candidates.map((candidate, index) => (
                  <tr
                    key={index}
                    className={
                      JSON.stringify(candidate.action) ===
                      JSON.stringify(decision.chosen)
                        ? "selected-row"
                        : ""
                    }
                  >
                    <td>
                      <details>
                        <summary>{candidate.label}</summary>
                        {candidate.features.map((feature) => (
                          <div key={feature.name}>
                            {feature.name}：{feature.value.toFixed(2)} ×{" "}
                            {feature.weight} = {feature.contribution.toFixed(2)}
                          </div>
                        ))}
                      </details>
                    </td>
                    <td>{candidate.score.toFixed(2)}</td>
                    <td>
                      {candidate.simulation
                        ? `${candidate.simulation.mean.toFixed(2)} ± ${candidate.simulation.standardError.toFixed(2)}`
                        : "启发式"}
                    </td>
                    <td>
                      <button onClick={() => setAlternative(index)}>
                        比较
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {alternative !== null && decision.candidates[alternative] && (
            <p className="comparison">
              替代动作「{decision.candidates[alternative].label}」评分为{" "}
              {decision.candidates[alternative].score.toFixed(2)}，与最高分相差{" "}
              {(
                decision.candidates[0].score -
                decision.candidates[alternative].score
              ).toFixed(2)}
              。展开两项可核对各因素贡献；模拟均值表示局面收益。
            </p>
          )}
        </>
      )}
    </section>
  );
}
