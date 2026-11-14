import { describe, expect, it, vi } from "vitest";
import type { DecisionCandidate } from "../src/domain/types";
import type { CandidateRuntime } from "../src/server/llm-seat";
import {
  candidatePrompt,
  chooseCandidateWithLlm,
  parseCandidateChoice,
} from "../src/server/llm-seat";

const candidates: DecisionCandidate[] = [
  {
    action: { type: "uno-draw" },
    label: "摸牌",
    score: 1.2,
    features: [],
  },
  {
    action: { type: "uno-play", card: 7, color: 0, jump: false, saidUno: true },
    label: "出 🔴红 5️⃣",
    score: 3.4,
    features: [],
  },
];

describe("LLM candidate selection", () => {
  it("parses a candidate index safely", () => {
    expect(parseCandidateChoice("1", 2)).toBe(1);
    expect(parseCandidateChoice("选择 1。", 2)).toBe(1);
    expect(parseCandidateChoice("9", 2)).toBeNull();
    expect(parseCandidateChoice("不知道", 2)).toBeNull();
  });

  it("builds a prompt from labels and scores only", () => {
    const prompt = candidatePrompt("UNO", candidates);
    expect(prompt.system).toContain("UNO");
    expect(prompt.user).toContain("摸牌");
    expect(prompt.user).toContain("出 🔴红 5️⃣");
    expect(prompt.visible).toHaveLength(2);
  });

  it("chooses a candidate through the runtime", async () => {
    const runtime = {
      complete: vi.fn(async () => "1"),
    } as unknown as CandidateRuntime;
    const choice = await chooseCandidateWithLlm(runtime, "UNO", candidates);
    expect(choice?.index).toBe(1);
    expect(choice?.chosen).toEqual(candidates[1]!.action);
  });

  it("returns null on invalid or empty choices", async () => {
    const runtime = {
      complete: vi.fn(async () => "invalid"),
    } as unknown as CandidateRuntime;
    expect(await chooseCandidateWithLlm(runtime, "UNO", candidates)).toBeNull();
    expect(await chooseCandidateWithLlm(runtime, "UNO", [])).toBeNull();
    const single = await chooseCandidateWithLlm(runtime, "UNO", [
      candidates[0]!,
    ]);
    expect(single?.index).toBe(0);
  });
});
