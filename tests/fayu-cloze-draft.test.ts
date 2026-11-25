import { expect, it } from "vitest";
import { setClozeSlot } from "../src/client/fayu/cloze-draft";

it("fills and replaces the chosen blank without changing the earlier empty slot", () => {
  const draft = { templateId: "t1", assignments: [null, null, "海豚"] };
  const first = setClozeSlot(draft, 1, "小狗");
  expect(first.assignments).toEqual([null, "小狗", "海豚"]);
  expect(setClozeSlot(first, 1, "跑").assignments).toEqual([null, "跑", "海豚"]);
  expect(setClozeSlot(first, 1, null).assignments).toEqual(draft.assignments);
});
