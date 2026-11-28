import { pickFayuSentence } from "../../domain/fayu/generator";
import {
  fayuBuiltinWords, fayuNounClasses, fayuNounClassNames, fayuPosSchema, fayuWordSchema,
  type FayuNounClass, type FayuPos, type FayuWord,
} from "../../domain/fayu/words";
import { makeWordRows, setSystemWords } from "../drawguess/word-library-model";
import { WordLibraryWorkspace } from "../drawguess/WordLibraryWorkspace";
import { Panel, Select } from "../ui/Controls";
import {
  fayuCombinedPool, fayuLibraryReady, fayuWordKey, mergeFayuWords, parseFayuWords, parseTextWords, serializeFayuLibrary,
  type FayuLibrary,
} from "./library";

const posNames: Record<FayuPos, string> = {
  noun: "名词", proper: "角色", place: "地点", verb: "动词", adj: "形容词", adv: "副词",
};

const verbPresets = [
  { label: "自己做一个动作", patients: [] },
  { label: "对食物或物品做", patients: ["food", "object"] },
  { label: "对人或动物做", patients: ["person", "animal"] },
  { label: "对任何东西做", patients: ["object", "food", "person", "animal"] },
] satisfies { label: string; patients: FayuNounClass[] }[];

type EditorProps = { library: FayuLibrary; onChange: (library: FayuLibrary) => void };

export function FayuLibraryPanel({ open, library, onChange, onClose }: EditorProps & { open: boolean; onClose: () => void }) {
  return <Panel title="法语词库" className="ui-panel-wide" open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
    {open && <FayuLibraryEditor library={library} onChange={onChange} />}
  </Panel>;
}

export function FayuLibraryEditor({ library, onChange }: EditorProps) {
  const rows = makeWordRows(library.words, fayuBuiltinWords, library.builtin, (_, word) => fayuWordKey(word));
  return <WordLibraryWorkspace rows={rows} positions={posNames} operations={{
    add: (): FayuWord => ({ word: "", category: "", aliases: [], pos: "noun" }),
    canReset: Object.keys(library.builtin ?? {}).length > 0,
    save: (row, input) => {
      const parsed = fayuWordSchema.safeParse(input);
      if (!parsed.success) throw new Error("词语和别名最多 20 字，别名最多 3 个");
      const word = parsed.data;
      const key = fayuWordKey(word);
      if (rows.some((entry) => entry.id !== row?.id && fayuWordKey(entry.word) === key))
        throw new Error("相同词性中已有这个词语");
      if (row?.original) {
        onChange({ ...library, builtin: { ...library.builtin, [row.key]: { ...library.builtin?.[row.key], word } } });
        return row.id;
      }
      const words = row ? library.words.map((entry) => fayuWordKey(entry) === row.key ? word : entry) : [...library.words, word];
      onChange({ ...library, words });
      return `custom:${key}`;
    },
    remove: (row) => onChange({ ...library, words: library.words.filter((word) => fayuWordKey(word) !== row.key) }),
    system: (items, operation) => onChange({ ...library, builtin: setSystemWords(library.builtin, items, operation) }),
    import: async (file) => {
      const text = await file.text();
      const parsed = file.name.toLowerCase().endsWith(".json") ? parseFayuWords(text) : { words: parseTextWords(text, "noun"), invalid: 0, builtin: undefined };
      const words = mergeFayuWords([...library.words, ...parsed.words]);
      onChange({ ...library, words, ...(parsed.builtin ? { builtin: { ...library.builtin, ...parsed.builtin } } : {}) });
      return `新增 ${words.length - library.words.length} 条，格式无效 ${parsed.invalid} 条`;
    },
    export: (format) => ({
      filename: `fayu-library.${format}`,
      contents: format === "json" ? serializeFayuLibrary(library) : library.words.map((word) => `${word.word},${word.pos}`).join("\n"),
    }),
    sample: () => {
      const sentence = fayuLibraryReady(library) && pickFayuSentence(fayuCombinedPool(library), Math.random);
      if (!sentence) throw new Error("当前搭配不足，请启用更多名词、动词或地点");
      return sentence.text;
    },
    fields: (word, change) => <>
      <label>词性<Select aria-label="词性" value={word.pos} onValueChange={(value) => {
        const parsed = fayuPosSchema.safeParse(value);
        if (!parsed.success || parsed.data === word.pos) return;
        const { word: name, aliases, category, absurd } = word;
        change({ word: name, aliases, category, absurd, pos: parsed.data });
      }}>{Object.entries(posNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
      {(word.pos === "noun" || word.pos === "proper") && <label>名词类别<Select aria-label="名词类别" value={word.classes?.[0] ?? (word.pos === "proper" ? "person" : "object")} onValueChange={(value) => {
        const category = fayuNounClasses.find((item) => item === value);
        if (category) change({ ...word, classes: [category] });
      }}>{fayuNounClasses.map((item) => <option key={item} value={item}>{fayuNounClassNames[item]}</option>)}</Select></label>}
      {word.pos === "verb" && <label>动词搭配<Select aria-label="动词搭配" value={String(verbPresets.findIndex((preset) =>
        (word.patients ?? []).length === preset.patients.length && preset.patients.every((item) => word.patients?.includes(item)) &&
        (!word.agents || (word.agents.length === 2 && word.agents.includes("animal") && word.agents.includes("person")))))}
        onValueChange={(value) => {
          const preset = verbPresets[Number(value)];
          if (preset) change({ ...word, agents: ["person", "animal"], patients: preset.patients, transitive: preset.patients.length > 0 });
        }}><option value="-1" disabled>原有搭配</option>{verbPresets.map((preset, index) => <option key={preset.label} value={String(index)}>{preset.label}</option>)}</Select></label>}
    </>,
  }} />;
}
