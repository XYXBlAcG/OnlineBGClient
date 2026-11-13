import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { TableChrome, tableChromeStatus } from "../src/client/TableChrome";
import type { Snapshot } from "../src/domain/protocol";

const chrome = (overrides: Partial<Snapshot>) =>
  ({
    paused: false,
    aiPaused: false,
    resolving: false,
    finished: false,
    playing: true,
    candidates: [],
    ...overrides,
  }) as Pick<
    Snapshot,
    "paused" | "aiPaused" | "resolving" | "finished" | "playing" | "candidates"
  >;

it("derives one status for the table chrome with a fixed priority", () => {
  expect(tableChromeStatus(chrome({}), true)).toEqual({
    state: "pending",
    label: "操作确认中…",
  });
  expect(
    tableChromeStatus(chrome({ paused: true, candidates: [{}] as never }), false),
  ).toEqual({ state: "paused", label: "有玩家掉线，等待恢复连接" });
  expect(
    tableChromeStatus(
      chrome({ paused: true, aiPaused: true }),
      false,
    ),
  ).toEqual({ state: "paused", label: "AI 性能测试已暂停" });
  expect(tableChromeStatus(chrome({ resolving: true }), false)).toEqual({
    state: "resolving",
    label: "等待无懈可击响应，房间服务自动结算",
  });
  expect(
    tableChromeStatus(chrome({ candidates: [{}] as never }), false),
  ).toEqual({ state: "turn", label: "轮到你了" });
  expect(tableChromeStatus(chrome({}), false)).toEqual({
    state: "idle",
    label: "",
  });
});

it("renders paused, turn, and finished chrome from the same component", () => {
  const paused = renderToStaticMarkup(
    <TableChrome snapshot={chrome({ paused: true })} pending={false} />,
  );
  expect(paused).toContain('data-chrome-state="paused"');
  expect(paused).toContain("有玩家掉线，等待恢复连接");

  const turn = renderToStaticMarkup(
    <TableChrome
      snapshot={
        chrome({ candidates: [{}] as never }) as unknown as Pick<
          Snapshot,
          | "paused"
          | "aiPaused"
          | "resolving"
          | "finished"
          | "playing"
          | "candidates"
        >
      }
      pending={false}
    />,
  );
  expect(turn).toContain('data-chrome-state="turn"');
  expect(turn).toContain("轮到你了");

  const finished = renderToStaticMarkup(
    <TableChrome
      snapshot={chrome({ finished: true, playing: false }) as never}
      pending={false}
      finishedActions={<button>查看回放</button>}
    />,
  );
  expect(finished).toContain("对局已结束");
  expect(finished).toContain("查看回放");
});
