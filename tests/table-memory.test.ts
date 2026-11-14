import { describe, expect, it } from "vitest";
import { TableMemory } from "../src/domain/table-mind/memory";
import type { TableEvent } from "../src/domain/table-mind/model";

const event = (overrides: Partial<TableEvent>): TableEvent => ({
  id: "table:1",
  seq: 1,
  version: 1,
  at: 1,
  kind: "chat",
  label: "hi",
  public: true,
  ...overrides,
});

describe("TableMemory", () => {
  it("remembers action, chat and achievement with actor names", () => {
    const memory = new TableMemory();
    memory.observe([
      event({
        id: "table:1",
        actor: "a",
        actorName: "甲",
        label: "出了红牌",
        kind: "action",
      }),
      event({
        id: "table:2",
        actor: "b",
        actorName: "乙",
        label: "打得不错",
        kind: "chat",
      }),
      event({ id: "table:3", label: "游戏开始", kind: "game-start" }),
    ]);
    expect(memory.recall()).toMatchObject([
      { text: "甲：出了红牌", kind: "action" },
      { text: "乙：打得不错", kind: "chat" },
    ]);
  });

  it("caps and returns the latest facts", () => {
    const memory = new TableMemory();
    memory.observe(
      Array.from({ length: 210 }, (_, index) =>
        event({ id: `table:${index}`, label: `m${index}`, at: index }),
      ),
    );
    expect(memory.recall(2).map((fact) => fact.text)).toEqual([
      "m208",
      "m209",
    ]);
  });
});
