import {
  fayuTemplateById,
  fayuTemplateText,
  fayuTemplates,
  type FayuSlotKind,
  type FayuTemplate,
} from "./templates";
import {
  fayuAdjectiveTargets,
  fayuBuiltinPool,
  fayuMotionVerbSet,
  fayuNounClassesOf,
  fayuPoolByPos,
  fayuVerbAgents,
  fayuVerbPatients,
  type FayuNounClass,
  type FayuPool,
  type FayuWord,
} from "./words";

export interface FayuSentence {
  templateId: string;
  words: string[];
  text: string;
}

const sentenceLimit = 60;
const normalized = (value: string) => value.trim().normalize("NFKC");
const thingClasses: FayuNounClass[] = [
  "object",
  "food",
  "plant",
  "body",
  "nature",
  "vehicle",
  "building",
];

function pick<T>(items: readonly T[], random: () => number) {
  return items[Math.floor(Math.max(0, Math.min(0.9999, random())) * items.length)]!;
}

function pickWord(items: FayuWord[], random: () => number) {
  const weighted = items.flatMap((word) => (word.absurd ? [word, word] : [word]));
  return pick(weighted, random);
}

function hasClass(word: FayuWord, classes: FayuNounClass[]) {
  return fayuNounClassesOf(word).some((item) => classes.includes(item));
}

function nounsIn(pool: FayuPool, classes: FayuNounClass[]) {
  return fayuPoolByPos(pool, "noun").filter((word) => hasClass(word, classes));
}

function verbOptions(template: FayuTemplate, pool: FayuPool) {
  const verbs = fayuPoolByPos(pool, "verb");
  const transitive = verbs.filter((word) => fayuVerbPatients(word).length > 0);
  const intransitive = verbs.filter((word) => !fayuVerbPatients(word).length);
  const source = template.transitivity === "transitive" ? transitive : intransitive;
  return template.motionOnly
    ? source.filter((word) => fayuMotionVerbSet.has(word.word))
    : source;
}

export function fayuTemplateUsable(template: FayuTemplate, pool: FayuPool) {
  if (!verbOptions(template, pool).length) return false;
  return template.slots.every((item) => {
    if (item.kind === "verb" || item.kind === "verb2" || item.kind === "adj") return true;
    if (item.kind === "place") return fayuPoolByPos(pool, "place").length > 0;
    if (item.kind === "adv") return fayuPoolByPos(pool, "adv").length > 0;
    if (item.kind === "proper") return fayuPoolByPos(pool, "proper").length > 0;
    return fayuPoolByPos(pool, "noun").length > 0;
  });
}

function fillTemplate(
  template: FayuTemplate,
  pool: FayuPool,
  random: () => number,
  used: Set<string>,
): string[] | null {
  const words = new Array<string>(template.slots.length).fill("");
  const local = new Set(used);
  const verbs = verbOptions(template, pool);
  const take = (options: FayuWord[]) => {
    const available = options.filter((word) => !local.has(normalized(word.word)));
    if (!available.length) return undefined;
    const word = pickWord(available, random);
    local.add(normalized(word.word));
    return word;
  };
  const verbSlots = template.slots
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.kind === "verb" || item.kind === "verb2");
  const chosenVerb = take(verbs);
  if (!chosenVerb) return null;
  for (const slot of verbSlots) {
    const word = slot.item.kind === "verb" ? chosenVerb : take(verbs.filter((entry) => entry.word !== chosenVerb.word));
    if (!word) return null;
    words[slot.index] = word.word;
  }
  for (const [index, item] of template.slots.entries()) {
    if (words[index] || item.kind === "verb" || item.kind === "verb2" || item.kind === "adj") continue;
    if (item.kind === "agent") {
      const agents = fayuVerbAgents(chosenVerb);
      const options = nounsIn(pool, agents);
      const word = take(options.length ? options : fayuPoolByPos(pool, "noun"));
      if (!word) return null;
      words[index] = word.word;
      continue;
    }
    if (item.kind === "patient") {
      const patients = fayuVerbPatients(chosenVerb);
      const options = nounsIn(pool, patients.length ? patients : thingClasses);
      const word = take(options.length ? options : fayuPoolByPos(pool, "noun"));
      if (!word) return null;
      words[index] = word.word;
      continue;
    }
    if (item.kind === "thing") {
      const options = nounsIn(pool, thingClasses);
      const word = take(options.length ? options : fayuPoolByPos(pool, "noun"));
      if (!word) return null;
      words[index] = word.word;
      continue;
    }
    if (item.kind === "proper") {
      const word = take(fayuPoolByPos(pool, "proper"));
      if (!word) return null;
      words[index] = word.word;
      continue;
    }
    if (item.kind === "place") {
      const word = take(fayuPoolByPos(pool, "place"));
      if (!word) return null;
      words[index] = word.word;
      continue;
    }
    const word = take(fayuPoolByPos(pool, "adv"));
    if (!word) return null;
    words[index] = word.word;
  }
  for (const [index, item] of template.slots.entries()) {
    if (item.kind !== "adj" || words[index]) continue;
    const targetIndex = item.modifies
      ? template.slots.findIndex((entry) => entry.key === item.modifies)
      : -1;
    const targetWord =
      targetIndex >= 0
        ? fayuPoolByPos(pool, "noun")
            .concat(fayuPoolByPos(pool, "proper"))
            .find((entry) => entry.word === words[targetIndex])
        : undefined;
    const targetClasses = targetWord ? fayuNounClassesOf(targetWord) : [];
    const matching = fayuPoolByPos(pool, "adj").filter((word) => {
      const targets = fayuAdjectiveTargets(word);
      return targets === "any" || !targetWord || targets.some((item2) => targetClasses.includes(item2));
    });
    const word = take(matching.length ? matching : fayuPoolByPos(pool, "adj"));
    if (!word) return null;
    words[index] = word.word;
  }
  if (words.some((word) => !word)) return null;
  return words;
}

export function pickFayuSentence(
  pool: FayuPool,
  random: () => number,
  used: Set<string> = new Set(),
): FayuSentence | null {
  const templates = fayuTemplates.filter((template) => fayuTemplateUsable(template, pool));
  if (!templates.length) return null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const template = pick(templates, random);
    const words = fillTemplate(template, pool, random, used);
    if (!words) continue;
    const text = fayuTemplateText(template, words);
    if (text.length > sentenceLimit || used.has(normalized(text))) continue;
    return { templateId: template.id, words, text };
  }
  return null;
}

export function generateFayuSentence(
  input: FayuPool,
  random: () => number,
  used: Set<string> = new Set(),
): FayuSentence {
  const sentence = pickFayuSentence(input.words.length >= 12 ? input : fayuBuiltinPool, random, used);
  if (sentence) return sentence;
  const fallback = fayuTemplateById.get("t1")!;
  const words = fallback.slots.map((item) => {
    const pos =
      item.kind === "verb" || item.kind === "verb2"
        ? "verb"
        : item.kind === "adj"
          ? "adj"
          : item.kind === "place"
            ? "place"
            : item.kind === "adv"
              ? "adv"
              : item.kind === "proper"
                ? "proper"
                : "noun";
    return fayuPoolByPos(fayuBuiltinPool, pos)[0]?.word ?? "东西";
  });
  return { templateId: fallback.id, words, text: fayuTemplateText(fallback, words) };
}

export function validateFayuSentence(
  templateId: string,
  words: string[],
): FayuSentence | null {
  const template = fayuTemplateById.get(templateId);
  if (!template || words.length !== template.slots.length) return null;
  if (
    words.some(
      (word) =>
        !word.trim() ||
        word.length > 20 ||
        [...word].some((char) => char.charCodeAt(0) < 32),
    ) ||
    new Set(words.map(normalized)).size !== words.length
  )
    return null;
  const text = fayuTemplateText(template, words);
  if (text.length > sentenceLimit) return null;
  return { templateId, words: words.map(normalized), text };
}

export function fayuSentenceWords(sentence: FayuSentence) {
  return sentence.words.map(normalized);
}

export function fayuSlotPos(kind: FayuSlotKind) {
  if (kind === "verb" || kind === "verb2") return "verb" as const;
  if (kind === "adj") return "adj" as const;
  if (kind === "place") return "place" as const;
  if (kind === "adv") return "adv" as const;
  if (kind === "proper") return "proper" as const;
  return "noun" as const;
}
