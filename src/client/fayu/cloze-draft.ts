export type ClozeDraft = { templateId: string; assignments: (string | null)[] };

export function setClozeSlot(draft: ClozeDraft, slot: number, value: string | null) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= draft.assignments.length) return draft;
  return { ...draft, assignments: draft.assignments.map((word, index) => index === slot ? value : word) };
}
