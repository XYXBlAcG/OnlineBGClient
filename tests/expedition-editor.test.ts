import { expect, it } from "vitest";
import { heroContent } from "../src/domain/expedition/content";
import { expeditionStartingRelics } from "../src/domain/expedition/adventure";
import { relics } from "../src/domain/expedition/world";
import {
  applyExpeditionData,
  clearExpeditionOverrides,
  readExpeditionOverrides,
  snapshotExpeditionData,
  writeExpeditionOverrides,
} from "../src/client/dev/expedition-overrides";

function storage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
  };
}

it("round-trips overrides through storage and rejects corrupt data", () => {
  const store = storage();
  expect(readExpeditionOverrides(store)).toBeNull();
  const data = snapshotExpeditionData();
  writeExpeditionOverrides(data, store);
  expect(readExpeditionOverrides(store)?.professions.length).toBe(
    heroContent.length,
  );
  expect(
    readExpeditionOverrides(storage({ "onlinebg.expedition-data-overrides": "{" })),
  ).toBeNull();
  clearExpeditionOverrides(store);
  expect(readExpeditionOverrides(store)).toBeNull();
});

it("applies edited relic and profession values to the live domain data", () => {
  const baseline = snapshotExpeditionData();
  const data = snapshotExpeditionData();
  data.relics[0].definition = {
    ...data.relics[0].definition,
    name: "测试余烬",
    effects: [{ kind: "strength", amount: 9 }],
  };
  data.relics.push({
    id: "custom_test",
    definition: {
      name: "测试新遗物",
      icon: "✦",
      trigger: "round",
      effects: [{ kind: "block", amount: 7 }],
    },
  });
  data.professions[0] = { ...data.professions[0], maxHp: 99 };
  data.startingRelics[0] = "custom_test";
  applyExpeditionData(data);
  expect(relics.ember.name).toBe("测试余烬");
  expect(relics.ember.effects).toEqual([{ kind: "strength", amount: 9 }]);
  expect(
    (relics as Record<string, { effects: unknown }>).custom_test.effects,
  ).toEqual([{ kind: "block", amount: 7 }]);
  expect(heroContent[0].maxHp).toBe(99);
  expect(expeditionStartingRelics[0]).toBe("custom_test");
  applyExpeditionData(baseline);
  expect(relics.ember.name).toBe("余烬徽章");
  expect(heroContent[0].maxHp).toBe(48);
  expect(expeditionStartingRelics[0]).toBe("shell");
});
