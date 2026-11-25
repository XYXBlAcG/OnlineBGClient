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
    label: "动作已发送，等待服务器确认…",
  });
  expect(
    tableChromeStatus(
      chrome({ paused: true, candidates: [{}] as never }),
      false,
    ),
  ).toEqual({ state: "paused", label: "有玩家掉线，等待恢复连接" });
  expect(
    tableChromeStatus(chrome({ paused: true, aiPaused: true }), false),
  ).toEqual({ state: "paused", label: "AI 性能测试已暂停" });
  expect(tableChromeStatus(chrome({ resolving: true }), false)).toEqual({
    state: "resolving",
    label: "等待玩家响应",
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

it("hides the generic turn row when the table shows its own status", () => {
  const hidden = renderToStaticMarkup(
    <TableChrome
      snapshot={chrome({ candidates: [{}] as never }) as never}
      pending={false}
      showTurn={false}
    />,
  );
  expect(hidden).not.toContain("轮到你了");
  const pending = renderToStaticMarkup(
    <TableChrome snapshot={chrome({}) as never} pending showTurn={false} />,
  );
  expect(pending).toContain("动作已发送，等待服务器确认…");
});

it("shows one resolving message and only names 无懈可击 in 三国杀", () => {
  const one = renderToStaticMarkup(
    <TableChrome
      snapshot={{ ...chrome({ resolving: true }), kind: "sgs" }}
      pending={false}
    />,
  );
  expect(one.match(/等待无懈可击响应/g)).toHaveLength(1);
  const other = renderToStaticMarkup(
    <TableChrome
      snapshot={{ ...chrome({ resolving: true }), kind: "scmj" }}
      pending={false}
    />,
  );
  expect(other).toContain("等待玩家响应");
  expect(other).not.toContain("无懈可击");
});

it("uses UNO's real turn even when an out-of-turn action is legal", () => {
  const snapshot = {
    ...chrome({ candidates: [{}] as never }),
    kind: "uno" as const,
    actor: 1,
    state: {
      kind: "uno",
      view: { isStart: true, waitFor: 0 },
    } as Snapshot["state"],
    seats: [{ name: "阿青" }] as Snapshot["seats"],
  };
  expect(tableChromeStatus(snapshot, false)).toEqual({
    state: "turn",
    label: "阿青的回合",
  });
});

it("keeps one status slot through idle, thinking and pending updates", () => {
  const views = [
    renderToStaticMarkup(<TableChrome snapshot={chrome({})} pending={false} />),
    renderToStaticMarkup(
      <TableChrome
        snapshot={chrome({})}
        pending={false}
        secondary={<span>陪练正在决策</span>}
      />,
    ),
    renderToStaticMarkup(<TableChrome snapshot={chrome({})} pending />),
  ];
  for (const view of views)
    expect(view.match(/class="game-status-row"/g)).toHaveLength(1);
  expect(views[1]).toContain("陪练正在决策");
});
