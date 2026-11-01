import React from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { allCards } from "../src/domain/expedition/rules";
import { CardService } from "../src/client/expedition/CardService";
import { InventoryContent } from "../src/client/expedition/Inventory";

vi.mock("@radix-ui/react-tooltip", () => ({
  Provider: ({ children }: { children: React.ReactNode }) => children,
  Root: ({ children }: { children: React.ReactNode }) => children,
  Trigger: ({ children }: { children: React.ReactNode }) => children,
  Portal: () => null,
  Content: () => null,
}));
vi.mock("@radix-ui/react-popover", () => ({
  Root: ({ children }: { children: React.ReactNode }) => children,
  Anchor: ({ children }: { children: React.ReactNode }) => children,
  Portal: () => null,
  Content: () => null,
  Close: () => null,
}));

it("升级先选择与预览，确认后通过真实冒险规则执行；过期选择不能确认", () => {
  const rules = new ExpeditionAdventure();
  let state = rules.create(1);
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  state.view.map[0][0].kind = "camp";
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: state.view.map[0][0].id },
  });
  const hero = state.view.combat.heroes[0];
  const candidates = rules
    .candidates(state, 0)
    .flatMap((candidate) =>
      candidate.action.type === "expedition-action"
        ? [candidate.action.move]
        : [],
    );
  const card = allCards(hero)[0];
  let sent = 0;
  const send = (move: (typeof candidates)[number]) => {
    state = rules.apply(state, 0, { type: "expedition-action", move });
    sent++;
  };
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <CardService
        mode="upgrade"
        hero={hero}
        moves={candidates}
        onChoose={send}
      />,
    );
  });
  act(() =>
    tree.root
      .findAllByType("article")
      .find((node) => node.props["data-card-instance"] === card.id)!
      .findByProps({ className: "exp-card-main" })
      .props.onClick(),
  );
  expect(sent).toBe(0);
  expect(
    tree.root
      .findAllByType("article")
      .filter((node) => node.props["data-card-instance"] === card.id),
  ).toHaveLength(3);
  act(() =>
    tree.update(
      <CardService mode="upgrade" hero={hero} moves={[]} onChoose={send} />,
    ),
  );
  expect(tree.root.findByProps({ className: "primary" }).props.disabled).toBe(
    true,
  );
  act(() =>
    tree.update(
      <CardService
        mode="upgrade"
        hero={hero}
        moves={candidates}
        onChoose={send}
      />,
    ),
  );
  act(() => tree.root.findByProps({ className: "primary" }).props.onClick());
  expect(sent).toBe(1);
  expect(
    allCards(state.view.combat.heroes[0]).find((value) => value.id === card.id)
      ?.upgradeLevel,
  ).toBe(1);
  act(() => tree.unmount());
});

it("查看牌堆只渲染当前标签且不改变真实抽牌顺序", () => {
  const rules = new ExpeditionAdventure();
  const state = rules.create(1);
  const hero = state.view.combat.heroes[0];
  const original = hero.deck.map((card) => card.id);
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<InventoryContent hero={hero} name="甲" />);
  });
  act(() =>
    tree.root
      .findAllByProps({ role: "tab" })
      .find((tab) => tab.props.id === "exp-pile-deck")!
      .props.onClick(),
  );
  expect(tree.root.findByProps({ role: "tabpanel" }).props["aria-label"]).toBe(
    "抽牌堆组成",
  );
  expect(tree.root.findAllByType("article")).toHaveLength(hero.deck.length);
  expect(hero.deck.map((card) => card.id)).toEqual(original);
  act(() => tree.unmount());
});
