import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  fayuBuiltinWords,
  fayuNounClasses,
  fayuNounClassNames,
  fayuPosSchema,
  fayuWordSchema,
  type FayuNounClass,
  type FayuPos,
  type FayuWord,
} from "../../domain/fayu/words";
import {
  fayuCombinedPool,
  fayuWordKey,
  fayuLibraryReady,
  mergeFayuWords,
  parseFayuWords,
  parseTextWords,
  serializeFayuLibrary,
  type FayuLibrary,
} from "./library";

const posNames: Record<FayuPos, string> = {
  noun: "名词",
  proper: "角色",
  place: "地点",
  verb: "动词",
  adj: "形容词",
  adv: "副词",
};

const verbPresets = [
  { key: "intransitive", label: "自己做一个动作", agents: ["person", "animal"] as FayuNounClass[], patients: [] as FayuNounClass[] },
  { key: "food", label: "对食物或物品做", agents: ["person", "animal"] as FayuNounClass[], patients: ["food", "object"] as FayuNounClass[] },
  { key: "peer", label: "对人或动物做", agents: ["person", "animal"] as FayuNounClass[], patients: ["person", "animal"] as FayuNounClass[] },
  { key: "thing", label: "对任何东西做", agents: ["person", "animal"] as FayuNounClass[], patients: ["object", "food", "person", "animal"] as FayuNounClass[] },
] as const;

type Tab = "browse" | "builtin" | "add" | "transfer";

type EditorProps = {
  library: FayuLibrary;
  onChange: (library: FayuLibrary) => void;
  onClose?: () => void;
};

export function FayuLibraryPanel({ open, library, onChange, onClose }: EditorProps & { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fayu-library-backdrop" onClick={onClose}>
      <FayuLibraryEditor library={library} onChange={onChange} onClose={onClose} />
    </div>,
    document.body,
  );
}

export function FayuLibraryEditor({ library, onChange, onClose }: EditorProps) {
  const [builtinKey, setBuiltinKey] = useState<string>();
  const [filterPos, setFilterPos] = useState<FayuPos | "">("");
  const [limit, setLimit] = useState(60);
  const [editing, setEditing] = useState<FayuWord | null>(null);
  const [originalVerb, setOriginalVerb] = useState(true);
  const [tab, setTab] = useState<Tab>("browse");
  const [word, setWord] = useState("");
  const [pos, setPos] = useState<FayuPos>("noun");
  const [nounClass, setNounClass] = useState<FayuNounClass>("object");
  const [verbPreset, setVerbPreset] = useState<(typeof verbPresets)[number]["key"]>("intransitive");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const pool = useMemo(() => fayuCombinedPool(library), [library]);
  const counts = fayuPosSchema.options.map((option) => ({
    pos: option,
    count: pool.words.filter((item) => item.pos === option).length,
  }));
  const ready = fayuLibraryReady(library);
  const editWord = (entry: FayuWord | null, key?: string) => {
    setBuiltinKey(key);
    setEditing(entry);
    setWord(entry?.word ?? "");
    setPos(entry?.pos ?? "noun");
    setNounClass(entry?.classes?.[0] ?? "object");
    setVerbPreset("intransitive");
    setOriginalVerb(true);
    setTab("add");
  };
  const add = () => {
    const preset = verbPresets.find((item) => item.key === verbPreset)!;
    const nounClasses = editing?.pos === "noun" && editing.classes?.[0] === nounClass
      ? editing.classes : [nounClass];
    const verb = editing?.pos === "verb" && originalVerb ? editing : {
      agents: [...preset.agents], patients: [...preset.patients], transitive: preset.patients.length > 0,
    };
    const entry = fayuWordSchema.safeParse({
      word: word.trim(),
      pos,
      aliases: editing?.aliases ?? [],
      category: editing?.category ?? "",
      absurd: editing?.absurd,
      targets: pos === "adj" ? editing?.targets : undefined,
      ...(pos === "noun" ? { classes: nounClasses } : {}),
      ...(pos === "verb" ? { agents: verb.agents, patients: verb.patients, transitive: verb.transitive } : {}),
    });
    if (!entry.success) {
      setNotice("请检查词语长度和词性。");
      return;
    }
    if (pool.words.some((item) => fayuWordKey(item) === fayuWordKey(entry.data) &&
        (!editing || fayuWordKey(item) !== fayuWordKey(editing)))) {
      setNotice("词库已有这个词语。");
      return;
    }
    if (builtinKey) {
      onChange({ ...library, builtin: { ...library.builtin, [builtinKey]: { ...library.builtin?.[builtinKey], word: entry.data } } });
    } else {
      onChange({ ...library, words: editing
        ? library.words.map((item) => item === editing ? entry.data : item)
        : mergeFayuWords([...library.words, entry.data]) });
    }
    setNotice("词条已保存");
    editWord(null);
    setTab(builtinKey ? "builtin" : "browse");
  };
  const importFile = async (selected: File) => {
    try {
      const text = await selected.text();
      const parsed = selected.name.endsWith(".json")
        ? parseFayuWords(text)
        : { words: parseTextWords(text, pos), invalid: 0, builtin: undefined };
      onChange({ ...library, words: mergeFayuWords([...library.words, ...parsed.words]),
        builtin: parsed.builtin ? { ...library.builtin, ...parsed.builtin } : library.builtin });
      setNotice(`导入 ${parsed.words.length} 个，忽略 ${parsed.invalid} 个`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "导入失败");
    }
  };
  const download = (text: string, type: string, name: string) => {
    const blob = new Blob([text], { type });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };
  const system = tab === "builtin";
  const filtered = (system ? fayuBuiltinWords : library.words).flatMap((source) => {
    const key = fayuWordKey(source);
    const preference = system ? library.builtin?.[key] : undefined;
    const item = preference?.word ?? source;
    if ((filterPos && item.pos !== filterPos) ||
        (query.trim() && ![item.word, source.word, posNames[item.pos]].some((text) => text.includes(query.trim())))) return [];
    return [{ key, item, preference }];
  });
  const toggleBuiltin = (keys: string[], disabled: boolean) => {
    const builtin = { ...library.builtin };
    for (const key of keys) {
      if (disabled || builtin[key]?.word)
        builtin[key] = { ...builtin[key], disabled };
      else delete builtin[key];
    }
    onChange({ ...library, builtin });
  };
  return (
      <section
        className="fayu-library"
        data-inline={!onClose}
        role={onClose ? "dialog" : undefined}
        aria-modal={onClose ? true : undefined}
        aria-label="法语词库"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <strong>法语词库</strong>
          <span className="fayu-library-state" data-ready={ready}>{ready ? "可以开局" : "请启用更多词条"}</span>
          {onClose && <button type="button" onClick={onClose} aria-label="关闭">×</button>}
        </header>
        <div className="fayu-library-counts">
          {counts.map((item) => (
            <span key={item.pos} data-ready={item.count > 0}>{posNames[item.pos]} {item.count}</span>
          ))}
        </div>
        <nav className="fayu-library-tabs" role="tablist">
          {([["browse", "我的词"], ["builtin", "系统词"], ["add", "添加"], ["transfer", "导入导出"]] as [Tab, string][]).map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} data-active={tab === key} onClick={() => { if (key === "add") editWord(null); else { setTab(key); setLimit(60); } }}>{label}</button>
          ))}
        </nav>
        {tab === "add" && (
          <div className="fayu-library-add">
            <input
              aria-label="新词语"
              placeholder="例如：仓鼠"
              value={word}
              onChange={(event) => setWord(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") add(); }}
            />
            <select aria-label="词性" value={pos} onChange={(event) => setPos(event.target.value as FayuPos)}>
              {fayuPosSchema.options.map((option) => <option key={option} value={option}>{posNames[option]}</option>)}
            </select>
            {pos === "noun" && (
              <select aria-label="名词类别" value={nounClass} onChange={(event) => setNounClass(event.target.value as FayuNounClass)}>
                {fayuNounClasses.map((item) => <option key={item} value={item}>{fayuNounClassNames[item]}</option>)}
              </select>
            )}
            {pos === "verb" && (
              <select aria-label="动词搭配" value={editing?.pos === "verb" && originalVerb ? "original" : verbPreset} onChange={(event) => {
                if (event.target.value === "original") setOriginalVerb(true);
                else { setOriginalVerb(false); setVerbPreset(event.target.value as typeof verbPreset); }
              }}>
                {editing?.pos === "verb" && <option value="original">沿用当前搭配</option>}
                {verbPresets.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            )}
            <button type="button" className="primary-button" onClick={add}>{editing ? "保存修改" : "加入"}</button>
            {editing && <button type="button" onClick={() => { editWord(null); setTab(builtinKey ? "builtin" : "browse"); }}>取消</button>}
          </div>
        )}
        {tab === "add" && (
          <p className="fayu-library-hint">名词类别决定它能放进哪些句子成分；动词搭配决定它和谁、对什么作动。</p>
        )}
        {tab === "transfer" && (
          <div className="fayu-library-actions">
            <button type="button" onClick={() => file.current?.click()}>导入文件</button>
            <button type="button" onClick={() => download(serializeFayuLibrary(library), "application/json", "fayu-library.json")}>导出 JSON</button>
            <button type="button" onClick={() => download(library.words.map((item) => `${item.word},${item.pos}`).join("\n"), "text/plain", "fayu-library.txt")}>导出 TXT</button>
            <input ref={file} type="file" accept="application/json,.json,text/plain,.txt,.csv" hidden onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void importFile(selected); event.target.value = ""; }} />
          </div>
        )}
        {notice && <small role="status" className="fayu-library-notice">{notice}</small>}
        {(system || tab === "browse") && <>
          <div className="fayu-library-search">
            <input aria-label="搜索词条" placeholder="搜索词条" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(60); }} />
            <select aria-label="筛选词性" value={filterPos} onChange={(event) => { setFilterPos(event.target.value as FayuPos | ""); setLimit(60); }}>
              <option value="">全部词性</option>
              {fayuPosSchema.options.map((value) => <option key={value} value={value}>{posNames[value]}</option>)}
            </select>
          </div>
          {system && <div className="fayu-library-actions">
            <button type="button" disabled={!filtered.some(({ preference }) => preference?.disabled)} onClick={() => toggleBuiltin(filtered.map(({ key }) => key), false)}>启用筛选结果</button>
            <button type="button" disabled={!filtered.some(({ preference }) => !preference?.disabled)} onClick={() => toggleBuiltin(filtered.map(({ key }) => key), true)}>停用筛选结果</button>
            <button type="button" disabled={!Object.keys(library.builtin ?? {}).length} onClick={() => onChange({ ...library, builtin: undefined })}>恢复系统默认</button>
          </div>}
          <div className="fayu-library-list">
            {filtered.length === 0 && <p className="fayu-library-empty">没有匹配词条</p>}
            {filtered.slice(0, limit).map(({ key, item, preference }) => (
              <span key={key} className="fayu-word-chip" data-pos={item.pos}>
                {item.word}
                <small>{posNames[item.pos]}{item.classes?.length ? ` · ${fayuNounClassNames[item.classes[0]!]}` : ""}</small>
                <button type="button" aria-label={`编辑 ${item.word}`} onClick={() => editWord(item, system ? key : undefined)}>编辑</button>
                {system ? <>
                  <button type="button" aria-pressed={!preference?.disabled} onClick={() => toggleBuiltin([key], !preference?.disabled)}>{preference?.disabled ? "启用" : "停用"}</button>
                  {preference && <button type="button" onClick={() => {
                    const builtin = { ...library.builtin };
                    delete builtin[key];
                    onChange({ ...library, builtin });
                  }}>恢复</button>}
                </> : <button type="button" aria-label={`删除 ${item.word}`} onClick={() => onChange({ ...library, words: library.words.filter((entry) => fayuWordKey(entry) !== key) })}>×</button>}
              </span>
            ))}
            {filtered.length > limit && <button type="button" onClick={() => setLimit(limit + 60)}>显示更多</button>}
          </div>
        </>}
      </section>
  );
}
