import React from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { GameOpeningChoice } from "../src/client/GameOpeningChoice";
import { Select } from "../src/client/ui/Controls";

vi.mock("../src/client/ui/Controls", () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <select>{children}</select>
  ),
}));

const expedition = { difficulty: "standard", ascension: 0 } as const;
const mahjong = { cap: 3, selfDraw: "base" } as const;

it("首次打开麻将需要选择模式后才能确认", () => {
  const confirm = vi.fn();
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <GameOpeningChoice
        kind="scmj"
        expedition={expedition}
        mahjong={mahjong}
        onConfirm={confirm}
        onCancel={() => {}}
      />,
    );
  });
  const buttons = tree.root.findAllByType("button");
  const submit = buttons.at(-1)!;
  expect(submit.props.disabled).toBe(true);
  act(() => buttons[1].props.onClick());
  expect(submit.props.disabled).toBe(false);
  act(() => submit.props.onClick());
  expect(confirm).toHaveBeenCalledWith(expedition, {
    ...mahjong,
    mode: "washizu",
  });
  act(() => tree.unmount());
});

it("远征开局可同时确认挑战难度和 N10", () => {
  const confirm = vi.fn();
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <GameOpeningChoice
        kind="expedition"
        expedition={expedition}
        mahjong={mahjong}
        onConfirm={confirm}
        onCancel={() => {}}
      />,
    );
  });
  const [difficulty, ascension] = tree.root.findAllByType(Select);
  expect(React.Children.toArray(ascension.props.children)).toHaveLength(11);
  act(() => difficulty.props.onValueChange("challenge"));
  act(() => ascension.props.onValueChange("10"));
  act(() => tree.root.findAllByType("button").at(-1)!.props.onClick());
  expect(confirm).toHaveBeenCalledWith(
    { difficulty: "challenge", ascension: 10 },
    mahjong,
  );
  act(() => tree.unmount());
});
