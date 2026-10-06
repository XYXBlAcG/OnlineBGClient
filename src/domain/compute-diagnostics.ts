export type ComputeStage = "load" | "initialize" | "transfer" | "execute";
export interface ComputeDiagnostic {
  stage: ComputeStage;
  detail: string;
  workerId?: number;
  script?: string;
  stack?: string;
}
export const computeStageNames: Record<ComputeStage, string> = {
  load: "计算线程脚本加载失败",
  initialize: "计算线程初始化失败",
  transfer: "计算线程消息传输失败",
  execute: "AI 策略执行失败",
};
export function computeDiagnostic(
  stage: ComputeStage,
  error: unknown,
  context: Pick<ComputeDiagnostic, "workerId" | "script"> = {},
): ComputeDiagnostic {
  if (error instanceof ComputeFailure) return error.diagnostic;
  const message = error instanceof Error ? error.message : String(error || "");
  return {
    stage,
    detail: /^(error|undefined|unknown|)$/i.test(message.trim())
      ? "运行环境未提供异常详情，请复制诊断信息"
      : message,
    ...context,
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
  };
}
export class ComputeFailure extends Error {
  constructor(readonly diagnostic: ComputeDiagnostic) {
    super(`${computeStageNames[diagnostic.stage]}：${diagnostic.detail}`);
    this.name = "ComputeFailure";
  }
}
