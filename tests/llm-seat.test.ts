import { expect, it } from "vitest";
import { parseCandidateChoice } from "../src/server/llm-seat";
it("accepts only a complete valid index", () => {
  expect(parseCandidateChoice("1", 2)).toBe(1);
  for (const text of ["选择 1。", "-1", "1.5", "9", "不知道", "01"])
    expect(parseCandidateChoice(text, 2)).toBeNull();
});
