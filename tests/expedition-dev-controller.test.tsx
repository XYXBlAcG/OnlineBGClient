import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import type { GameSnapshot } from "../src/client/OriginalGame";
import { DevExpeditionController } from "../src/client/expedition/DevExpeditionController";

afterEach(() => vi.unstubAllGlobals());

it("开发调试只以牌桌内控制条出现，并提供当前对局的代理与断点", () => {
  const adventure = new ExpeditionAdventure(() => 0.37),
    state = adventure.create(1),
    snapshot: GameSnapshot = {
      room: "dev-room",
      kind: "expedition",
      actor: 0,
      canManage: true,
      version: 1,
      seats: [
        {
          id: "seat-0",
          name: "测试玩家",
          difficulty: null,
          online: true,
          ready: true,
        },
      ],
      state,
      finished: false,
      candidates: adventure.candidates(state, 0),
    },
    html = renderToStaticMarkup(
      <DevExpeditionController
        snapshot={snapshot}
        act={() => {}}
        pending={false}
        manualActionToken={0}
        manualActionVersion={0}
      />,
    );
  expect(html).toContain("exp-dev-controls");
  expect(html).toContain("DEV");
  expect(html).toContain("裂隙回溯");
  expect(html).toContain("断点");
  expect(html).toContain("单步");
  expect(html).toContain("自动运行");
  expect(html).not.toContain("exp-lab");
  expect(html).not.toContain("aria-modal");
});

it("断点后接受玩家合法操作，并在房间确认后继续自动前进", async () => {
  vi.stubGlobal("window", { clearTimeout, setTimeout });
  vi.stubGlobal("HTMLFormElement", class {});
  const adventure = new ExpeditionAdventure(() => 0.37);
  let state = adventure.create(1);
  state = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  state.view.map[0][0].kind = "elite";
  const snapshot: GameSnapshot = {
      room: "dev-room",
      kind: "expedition",
      actor: 0,
      canManage: true,
      version: 1,
      seats: [
        {
          id: "seat-0",
          name: "测试玩家",
          difficulty: null,
          online: true,
          ready: true,
        },
      ],
      state,
      finished: false,
      candidates: adventure.candidates(state, 0),
    },
    onAct = () => {};
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <DevExpeditionController
        snapshot={snapshot}
        act={onAct}
        pending={false}
        manualActionToken={0}
        manualActionVersion={1}
      />,
    );
  });
  act(() => {
    tree.root
      .findAllByType("button")
      .find((button) => button.props.children === "自动运行")!
      .props.onClick();
  });
  expect(JSON.stringify(tree.toJSON())).toContain("请在牌桌手动选择");
  const manual = adventure.candidates(state, 0)[0],
    selected = adventure.apply(state, 0, manual.action);
  await act(async () => {
    tree.update(
      <DevExpeditionController
        snapshot={{
          ...snapshot,
          version: 2,
          state: selected,
          candidates: adventure.candidates(selected, 0),
        }}
        act={onAct}
        pending={false}
        manualActionToken={1}
        manualActionVersion={1}
      />,
    );
  });
  expect(JSON.stringify(tree.toJSON())).toContain("继续自动前进");
  act(() => tree.unmount());
});
