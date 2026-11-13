import { z } from "zod";
import type { ExpeditionRun } from "./adventure-types";
import {
  knowledgeForRun,
  legacyNodeById,
  legacyNodeIds,
  legacyPrerequisitesMet,
  legacySpent,
  normalizeLegacy,
  type LegacyNodeId,
} from "./legacy";

const baseJournalRunSchema = z.object({
  chapter: z.number().int().min(0),
  won: z.boolean(),
  professions: z.array(z.number().int().min(0)),
  cards: z.array(z.string().max(80)),
  relics: z.array(z.string().max(80)),
  bosses: z.array(z.number().int().min(0)),
});
export const journalRunSchema = baseJournalRunSchema.extend({
  ascension: z.number().int().min(0).max(10).default(0),
  settled: z.boolean().default(false),
  knowledge: z.number().int().min(0).default(0),
});
export type JournalRun = z.infer<typeof journalRunSchema>;

export const journalSchema = z.object({
  format: z.literal(2),
  legacy: z.array(z.enum(legacyNodeIds)).default([]),
  runs: z.record(z.string().max(150), journalRunSchema),
});
export const legacyJournalSchema = z.object({
  format: z.literal(1),
  runs: z.record(z.string().max(150), baseJournalRunSchema),
});
export type ExpeditionJournal = z.infer<typeof journalSchema>;
export const emptyJournal: ExpeditionJournal = {
  format: 2,
  legacy: [],
  runs: {},
};

export function migrateJournal(input: unknown): ExpeditionJournal {
  const current = journalSchema.safeParse(input);
  if (current.success)
    return {
      ...current.data,
      legacy: normalizeLegacy(current.data.legacy),
      runs: Object.fromEntries(
        Object.entries(current.data.runs).map(([id, run]) => [
          id,
          run.settled && !run.knowledge
            ? { ...run, knowledge: knowledgeForRun(run) }
            : run,
        ]),
      ),
    };
  const legacy = legacyJournalSchema.parse(input);
  return {
    format: 2,
    legacy: [],
    runs: Object.fromEntries(
      Object.entries(legacy.runs).map(([id, run]) => [
        id,
        {
          ...run,
          ascension: 0,
          settled: true,
          knowledge: knowledgeForRun({ ...run, ascension: 0 }),
        },
      ]),
    ),
  };
}

export function observeExpedition(
  journal: ExpeditionJournal,
  run: ExpeditionRun,
  actor: number,
): ExpeditionJournal {
  const hero = run.combat.heroes[actor];
  if (!hero || run.phase === "profession") return journal;
  const previous = journal.runs[run.runId];
  const bosses = [
    ...run.history.map((item) => item.chapter),
    ...(["waystation", "won"].includes(run.phase) ? [run.chapter] : []),
  ];
  const merge = <T>(a: T[] | undefined, b: T[]) =>
    [...new Set([...(a ?? []), ...b])].sort();
  const won = !!previous?.won || run.phase === "won",
    settled =
      !!previous?.settled || run.phase === "won" || run.phase === "lost",
    entry = {
      chapter: Math.max(previous?.chapter ?? 0, run.chapter),
      won,
      ascension: run.ascension,
      settled,
      knowledge: settled
        ? previous?.settled
          ? previous.knowledge
          : knowledgeForRun({
              chapter: Math.max(previous?.chapter ?? 0, run.chapter),
              won,
              bosses,
              ascension: run.ascension,
            })
        : 0,
      professions: merge(previous?.professions, [hero.profession]),
      cards: merge(
        previous?.cards,
        [
          ...hero.hand,
          ...hero.deck,
          ...hero.discard,
          ...hero.exhaust,
          ...hero.played,
        ].map((card) => card.card),
      ),
      relics: merge(previous?.relics, [...hero.relics]),
      bosses: merge(previous?.bosses, bosses),
    };
  if (JSON.stringify(previous) === JSON.stringify(entry)) return journal;
  return {
    ...journal,
    runs: { ...journal.runs, [run.runId]: entry },
  };
}

export function journalKnowledge(journal: ExpeditionJournal) {
  return Object.values(journal.runs).reduce(
    (sum, run) =>
      sum + (run.settled ? run.knowledge || knowledgeForRun(run) : 0),
    0,
  );
}

export function journalLegacySpent(journal: ExpeditionJournal) {
  return legacySpent(journal.legacy);
}

export function journalAvailableKnowledge(journal: ExpeditionJournal) {
  return Math.max(0, journalKnowledge(journal) - journalLegacySpent(journal));
}

export function journalArchiveLevel(journal: ExpeditionJournal) {
  return 1 + Math.floor(journalKnowledge(journal) / 60);
}

export function canUnlockLegacy(
  journal: ExpeditionJournal,
  id: LegacyNodeId,
): boolean {
  const node = legacyNodeById.get(id);
  return (
    !!node &&
    !journal.legacy.includes(id) &&
    legacyPrerequisitesMet(journal.legacy, id) &&
    journalAvailableKnowledge(journal) >= node.cost
  );
}

export function unlockLegacy(
  journal: ExpeditionJournal,
  id: LegacyNodeId,
): ExpeditionJournal {
  const node = legacyNodeById.get(id);
  if (!node) throw new Error("未知的远征传承");
  if (journal.legacy.includes(id)) throw new Error("该传承已经解锁");
  if (!legacyPrerequisitesMet(journal.legacy, id))
    throw new Error("前置传承尚未解锁");
  if (journalAvailableKnowledge(journal) < node.cost)
    throw new Error("秘塔学识不足");
  return {
    ...journal,
    legacy: normalizeLegacy([...journal.legacy, id]),
  };
}
