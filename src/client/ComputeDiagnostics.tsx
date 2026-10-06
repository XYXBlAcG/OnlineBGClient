import { useNativeWindow } from "./native/windows";
import { useState } from "react";
import { version } from "../../package.json";
import { Panel } from "./ui/Controls";
import {
  computeStageNames,
  type ComputeDiagnostic,
} from "../domain/compute-diagnostics";
export function ComputeDiagnostics({
  diagnostic,
  onRetry,
  onError,
  detailsOnly = false,
}: {
  diagnostic: ComputeDiagnostic | null;
  detailsOnly?: boolean;
  onRetry?: () => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(detailsOnly);
  const [copied, setCopied] = useState(false);
  const detached = useNativeWindow(
    "diagnostics",
    open && !!diagnostic,
    {
      view: "diagnostics",
      diagnostic: diagnostic || { stage: "execute", detail: "" },
      canRetry: !!onRetry,
    },
    (intent) => {
      if (intent.type === "close") setOpen(false);
      if (intent.type === "retry") {
        onRetry?.();
        setOpen(false);
      }
      if (intent.type === "error") onError(intent.message);
    },
  );
  if (!diagnostic) return null;
  const details = JSON.stringify(
    {
      ...diagnostic,
      environment: {
        version,
        userAgent: navigator.userAgent,
        origin: location.origin,
        cores: navigator.hardwareConcurrency || 2,
      },
    },
    null,
    2,
  );
  return (
    <>
      {!detailsOnly && (
        <div className="compute-failure" role="alert">
          <span>{computeStageNames[diagnostic.stage]}</span>
          <button onClick={() => setOpen(true)}>查看诊断</button>
          {onRetry && <button onClick={onRetry}>重试 AI</button>}
        </div>
      )}
      {!detached && (
        <Panel title="AI 计算诊断" open={open} onOpenChange={setOpen}>
          <p>{diagnostic.detail}</p>
          <textarea
            className="diagnostic-details"
            aria-label="计算诊断信息"
            readOnly
            value={details}
          />
          <button
            onClick={() =>
              void navigator.clipboard
                .writeText(details)
                .then(() => setCopied(true))
                .catch((error) => onError(String(error)))
            }
          >
            {copied ? "已复制" : "复制诊断"}
          </button>
        </Panel>
      )}
    </>
  );
}
