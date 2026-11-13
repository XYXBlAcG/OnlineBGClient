import { heroContent, type CardId } from "../../domain/expedition/content";
import type { Effect } from "../../domain/expedition/card-types";
import { expeditionStartingRelics } from "../../domain/expedition/adventure";
import {
  relics,
  type RelicDefinition,
  type RelicId,
} from "../../domain/expedition/world";

const overrideKey = "onlinebg.expedition-data-overrides";

export interface ProfessionOverride {
  name: string;
  title: string;
  description: string;
  resourceHint: string;
  maxHp: number;
  icon: string;
  deck: string[];
  rewards: string[];
}

export interface ExpeditionDataOverrides {
  version: 1;
  relics: { id: string; definition: RelicDefinition }[];
  professions: ProfessionOverride[];
  startingRelics: string[];
}

export function snapshotExpeditionData(): ExpeditionDataOverrides {
  return {
    version: 1,
    relics: Object.entries(relics).map(([id, definition]) => ({
      id,
      definition: structuredClone(definition) as RelicDefinition,
    })),
    professions: heroContent.map((hero) => ({
      name: hero.name,
      title: hero.title,
      description: hero.description,
      resourceHint: hero.resourceHint,
      maxHp: hero.maxHp,
      icon: hero.icon,
      deck: [...hero.deck],
      rewards: [...hero.rewards],
    })),
    startingRelics: [...expeditionStartingRelics],
  };
}

const defaultData = snapshotExpeditionData();

export function defaultExpeditionData(): ExpeditionDataOverrides {
  return structuredClone(defaultData);
}

export function applyExpeditionData(data: ExpeditionDataOverrides): void {
  const record = relics as Record<string, RelicDefinition>;
  for (const { id, definition } of data.relics) record[id] = definition;
  heroContent.splice(
    0,
    heroContent.length,
    ...data.professions.map((profession) => ({
      ...profession,
      deck: [...profession.deck] as CardId[],
      rewards: [...profession.rewards] as CardId[],
    })),
  );
  expeditionStartingRelics.splice(
    0,
    expeditionStartingRelics.length,
    ...(data.startingRelics as RelicId[]),
  );
}

export function readExpeditionOverrides(
  storage: Pick<Storage, "getItem"> = localStorage,
): ExpeditionDataOverrides | null {
  try {
    const raw = storage.getItem(overrideKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as ExpeditionDataOverrides;
    if (value?.version !== 1 || !Array.isArray(value.relics)) return null;
    return value;
  } catch {
    return null;
  }
}

export function writeExpeditionOverrides(
  data: ExpeditionDataOverrides,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  storage.setItem(overrideKey, JSON.stringify(data));
}

export function clearExpeditionOverrides(
  storage: Pick<Storage, "removeItem"> = localStorage,
): void {
  storage.removeItem(overrideKey);
}

export function applyStoredExpeditionOverrides(): boolean {
  const data = readExpeditionOverrides();
  if (!data) return false;
  applyExpeditionData(data);
  return true;
}

export type EditableEffect = Effect;
