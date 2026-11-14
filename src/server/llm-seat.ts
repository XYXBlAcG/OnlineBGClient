import type { Action, DecisionCandidate } from "../domain/types";
import type { CompanionRuntime } from "./companion";

export function parseCandidateChoice(
  text: string,
  count: number,
): number | null {
  const match = text.match(/\d+/);
  if (!match) return null;
  const index = Number(match[0]);
  return Number.isInteger(index) && index >= 0 && index < count
    ? index
    : null;
}

export interface CandidatePrompt {
  system: string;
  user: string;
  visible: DecisionCandidate[];
}

export function candidatePrompt(
  game: string,
  candidates: DecisionCandidate[],
  limit = 8,
): CandidatePrompt {
  const visible = candidates.slice(0, limit);
  const lines = visible.map(
    (candidate, index) =>
      `${index}. ${candidate.label}（搜索评分 ${candidate.score.toFixed(1)}）`,
  );
  return {
    system: `你是《${game}》牌桌上的 AI 玩家。服务端已经给出合法候选，你只能从候选中选择，不能创造新动作。只输出候选编号，不要解释。`,
    user: `合法候选：\n${lines.join("\n")}\n请选择编号（0-${visible.length - 1}）。`,
    visible,
  };
}

export async function chooseCandidateWithLlm(
  runtime: CompanionRuntime,
  game: string,
  candidates: DecisionCandidate[],
): Promise<{ chosen: Action; index: number } | null> {
  if (!candidates.length) return null;
  if (candidates.length === 1)
    return { chosen: candidates[0]!.action, index: 0 };
  const prompt = candidatePrompt(game, candidates);
  const text = await runtime.complete(prompt.system, prompt.user, 24, 6000);
  const index = parseCandidateChoice(text, prompt.visible.length);
  if (index === null) return null;
  return { chosen: prompt.visible[index]!.action, index };
}
