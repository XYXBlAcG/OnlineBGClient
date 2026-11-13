import { expect, it } from "vitest";
import {
  connectionPhase,
  connectionPhaseLabels,
  isRecoveredTransition,
} from "../src/client/connection-phase";

it("maps connection status strings onto staged phases", () => {
  expect(connectionPhase("连接中")).toBe("connecting");
  expect(connectionPhase("网络连接异常，等待重试")).toBe("waiting");
  expect(connectionPhase("连接中断，正在恢复")).toBe("reconnecting");
  expect(connectionPhase("重连中")).toBe("reconnecting");
  expect(connectionPhase("正在同步牌桌")).toBe("syncing");
  expect(connectionPhase("已连接")).toBe("online");
  expect(connectionPhase("身份已在其他窗口恢复")).toBe("online");
  for (const phase of Object.keys(connectionPhaseLabels))
    expect(connectionPhaseLabels[phase as keyof typeof connectionPhaseLabels])
      .toBeTruthy();
});

it("reports a recovery only when an interrupted phase returns online", () => {
  expect(isRecoveredTransition("reconnecting", "online")).toBe(true);
  expect(isRecoveredTransition("waiting", "online")).toBe(true);
  expect(isRecoveredTransition("online", "online")).toBe(false);
  expect(isRecoveredTransition("connecting", "online")).toBe(false);
  expect(isRecoveredTransition("syncing", "online")).toBe(false);
});
