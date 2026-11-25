export type FayuSlotKind =
  | "agent"
  | "patient"
  | "thing"
  | "place"
  | "adv"
  | "adj"
  | "verb"
  | "verb2"
  | "proper";

export interface FayuTemplateSlot {
  key: string;
  kind: FayuSlotKind;
  modifies?: string;
}

export interface FayuTemplate {
  id: string;
  pattern: string;
  slots: FayuTemplateSlot[];
  transitivity: "intransitive" | "transitive";
  motionOnly?: boolean;
}

const slot = (key: string, kind: FayuSlotKind, modifies?: string): FayuTemplateSlot => ({
  key,
  kind,
  ...(modifies ? { modifies } : {}),
});

export const fayuTemplates: readonly FayuTemplate[] = [
  {
    id: "t1",
    pattern: "{a1}的{n1}在{p1}{d1}地{v1}",
    slots: [slot("a1", "adj", "n1"), slot("n1", "agent"), slot("p1", "place"), slot("d1", "adv"), slot("v1", "verb")],
    transitivity: "intransitive",
  },
  {
    id: "t2",
    pattern: "{n1}被{a1}的{n2}{d1}地{v1}了",
    slots: [slot("n1", "patient"), slot("a1", "adj", "n2"), slot("n2", "agent"), slot("d1", "adv"), slot("v1", "verb")],
    transitivity: "transitive",
  },
  {
    id: "t3",
    pattern: "在{p1}，{a1}的{n1}{d1}地{v1}",
    slots: [slot("p1", "place"), slot("a1", "adj", "n1"), slot("n1", "agent"), slot("d1", "adv"), slot("v1", "verb")],
    transitivity: "intransitive",
  },
  {
    id: "t4",
    pattern: "{a1}的{n1}突然{v1}，{d1}地停不下来",
    slots: [slot("a1", "adj", "n1"), slot("n1", "agent"), slot("v1", "verb"), slot("d1", "adv")],
    transitivity: "intransitive",
  },
  {
    id: "t5",
    pattern: "{n1}和{a1}的{n2}在{p1}一起{v1}",
    slots: [slot("n1", "agent"), slot("a1", "adj", "n2"), slot("n2", "agent"), slot("p1", "place"), slot("v1", "verb")],
    transitivity: "intransitive",
  },
  {
    id: "t6",
    pattern: "{d1}地，{a1}的{n1}{v1}着{a2}的{n2}",
    slots: [slot("d1", "adv"), slot("a1", "adj", "n1"), slot("n1", "agent"), slot("v1", "verb"), slot("a2", "adj", "n2"), slot("n2", "patient")],
    transitivity: "transitive",
  },
  {
    id: "t7",
    pattern: "{a1}的{n1}在{p1}{d1}地{v1}",
    slots: [slot("a1", "adj", "n1"), slot("n1", "agent"), slot("p1", "place"), slot("d1", "adv"), slot("v1", "verb")],
    transitivity: "intransitive",
  },
  {
    id: "t8",
    pattern: "如果{a1}的{n1}{v1}，{a2}的{n2}就会{d1}地{v2}",
    slots: [slot("a1", "adj", "n1"), slot("n1", "agent"), slot("v1", "verb"), slot("a2", "adj", "n2"), slot("n2", "agent"), slot("d1", "adv"), slot("v2", "verb2")],
    transitivity: "intransitive",
  },
  {
    id: "t9",
    pattern: "{n1}把{a1}的{n2}{d1}地{v1}了",
    slots: [slot("n1", "agent"), slot("a1", "adj", "n2"), slot("n2", "patient"), slot("d1", "adv"), slot("v1", "verb")],
    transitivity: "transitive",
  },
  {
    id: "t10",
    pattern: "{d1}地，{a1}的{n1}从{p1}{v1}到{p2}",
    slots: [slot("d1", "adv"), slot("a1", "adj", "n1"), slot("n1", "agent"), slot("p1", "place"), slot("v1", "verb"), slot("p2", "place")],
    transitivity: "intransitive",
    motionOnly: true,
  },
  {
    id: "t11",
    pattern: "{a1}的{n1}身旁放着{a2}的{n2}，在{p1}{v1}",
    slots: [slot("a1", "adj", "n1"), slot("n1", "agent"), slot("a2", "adj", "n2"), slot("n2", "thing"), slot("p1", "place"), slot("v1", "verb")],
    transitivity: "intransitive",
  },
  {
    id: "t12",
    pattern: "在{p1}住着一个{a1}的{n1}，它每天{d1}地{v1}",
    slots: [slot("p1", "place"), slot("a1", "adj", "n1"), slot("n1", "agent"), slot("d1", "adv"), slot("v1", "verb")],
    transitivity: "intransitive",
  },
  {
    id: "t13",
    pattern: "{a1}的{n1}问{a2}的{n2}：你为什么{d1}地{v1}？",
    slots: [slot("a1", "adj", "n1"), slot("n1", "agent"), slot("a2", "adj", "n2"), slot("n2", "agent"), slot("d1", "adv"), slot("v1", "verb")],
    transitivity: "intransitive",
  },
  {
    id: "t14",
    pattern: "{n1}在{p1}发现了一个{a1}的{n2}，于是{d1}地{v1}",
    slots: [slot("n1", "agent"), slot("p1", "place"), slot("a1", "adj", "n2"), slot("n2", "thing"), slot("d1", "adv"), slot("v1", "verb")],
    transitivity: "intransitive",
  },
  {
    id: "t15",
    pattern: "{a1}的{n1}{v1}的时候，{a2}的{n2}在{p1}{d1}地{v2}",
    slots: [slot("a1", "adj", "n1"), slot("n1", "agent"), slot("v1", "verb"), slot("a2", "adj", "n2"), slot("n2", "agent"), slot("p1", "place"), slot("d1", "adv"), slot("v2", "verb2")],
    transitivity: "intransitive",
  },
  {
    id: "t16",
    pattern: "{pro1}在{p1}{d1}地{v1}",
    slots: [slot("pro1", "proper"), slot("p1", "place"), slot("d1", "adv"), slot("v1", "verb")],
    transitivity: "intransitive",
  },
  {
    id: "t17",
    pattern: "{pro1}把{a1}的{n1}{d1}地{v1}了",
    slots: [slot("pro1", "proper"), slot("a1", "adj", "n1"), slot("n1", "patient"), slot("d1", "adv"), slot("v1", "verb")],
    transitivity: "transitive",
  },
  {
    id: "t18",
    pattern: "{n1}在{p1}遇见了{pro1}，然后{d1}地{v1}",
    slots: [slot("n1", "agent"), slot("p1", "place"), slot("pro1", "proper"), slot("d1", "adv"), slot("v1", "verb")],
    transitivity: "intransitive",
  },
  {
    id: "t19",
    pattern: "{pro1}和{pro2}在{p1}一起{v1}",
    slots: [slot("pro1", "proper"), slot("pro2", "proper"), slot("p1", "place"), slot("v1", "verb")],
    transitivity: "intransitive",
  },
  {
    id: "t20",
    pattern: "{a1}的{n1}一边{v1}一边{v2}，{d1}地停不下来",
    slots: [slot("a1", "adj", "n1"), slot("n1", "agent"), slot("v1", "verb"), slot("v2", "verb2"), slot("d1", "adv")],
    transitivity: "intransitive",
  },
];

export const fayuTemplateById = new Map(fayuTemplates.map((template) => [template.id, template]));

export function fayuTemplateText(template: FayuTemplate, words: string[]) {
  let text = template.pattern;
  for (const [index, item] of template.slots.entries())
    text = text.replaceAll(`{${item.key}}`, words[index] ?? "");
  return text;
}

export function fayuTemplateSlotLabels(template: FayuTemplate) {
  return template.slots.map((item) => item.kind);
}
