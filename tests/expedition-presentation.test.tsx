import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ExpeditionRules, allCards } from "../src/domain/expedition/rules";
import { cardText } from "../src/domain/expedition/content";
import {
  cardComparison,
  enemyIntents,
} from "../src/client/expedition/presentation";
import { CardService } from "../src/client/expedition/CardService";
import { InventoryContent } from "../src/client/expedition/Inventory";

it("升级对比从实际规则派生，保留实例且不会修改原牌", () => {
  const hero = new ExpeditionRules().create("presentation").heroes[0];
  const card = allCards(hero).find((value) => !value.upgradeLevel)!;
  const comparison = cardComparison(card);
  expect(comparison.before).toBe(cardText(card));
  expect(comparison.after).toBe(cardText({ ...card, upgradeLevel: 1 }));
  expect(card.upgradeLevel).toBe(0);
  expect(comparison.upgraded.id).toBe(card.id);
});

it("敌方意图与执行规则一致并使用玩家姓名，击败后不计入威胁", () => {
  const state = new ExpeditionRules().create("intent", [0, 1, 2]);
  state.enemies[0].intent = {
    kind: "attack",
    amount: 6,
    target: "all",
    hits: 2,
  };
  state.enemies[0].strength = 3;
  const intents = enemyIntents(state, ["甲", "乙", "丙"]);
  expect(intents[0].summary).toContain("9 × 2");
  expect(intents[0].target).toBe("全队");
  state.enemies[0].hp = 0;
  expect(enemyIntents(state)[0].summary).toBe("已击败");
});

it("移除服务直接展示完整牌面与费用，不依赖 title 文本", () => {
  const hero = new ExpeditionRules().create("service").heroes[0];
  const card = allCards(hero)[0];
  const html = renderToStaticMarkup(
    <CardService
      mode="remove"
      hero={hero}
      moves={[{ type: "remove", instance: card.id }]}
      onChoose={() => {}}
      price={35}
    />,
  );
  expect(html).toContain(cardText(card));
  expect(html).toContain("35 金币");
  expect(html).toContain("data-card-instance=");
  expect(html).not.toContain("title=");
});

it("行装默认仅展示手牌，抽牌堆组成不混入当前手牌", () => {
  const hero = new ExpeditionRules().create("inventory").heroes[0];
  const html = renderToStaticMarkup(<InventoryContent hero={hero} name="甲" />);
  expect(html).toContain('aria-selected="true"');
  expect(html).toContain('aria-label="当前手牌"');
  expect(html).not.toContain('aria-label="抽牌堆组成"');
  expect((html.match(/data-card-instance=/g) || []).length).toBe(
    hero.hand.length,
  );
});
