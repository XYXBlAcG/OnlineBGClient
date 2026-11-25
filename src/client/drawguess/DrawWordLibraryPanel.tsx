import { useRef, useState } from "react";
import { drawWordSchema, type DrawWord, type DrawWordLibrary } from "../../domain/drawguess/words";
import { loadDrawWordLibrary, mergeDrawWords, parseDrawWords, saveDrawWordLibrary, serializeDrawWordLibrary } from "./library";

export function DrawWordLibraryPanel() {
  const [library, setLibrary] = useState<DrawWordLibrary>(() => loadDrawWordLibrary());
  const [word, setWord] = useState("");
  const [category, setCategory] = useState("物件");
  const [aliases, setAliases] = useState("");
  const [editing, setEditing] = useState<DrawWord | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const change = (next: DrawWordLibrary) => {
    setLibrary(next);
    saveDrawWordLibrary(next);
  };
  const edit = (entry: DrawWord | null) => {
    setEditing(entry);
    setWord(entry?.word ?? "");
    setCategory(entry?.category ?? "物件");
    setAliases(entry?.aliases.join("、") ?? "");
  };
  const add = () => {
    const entry = drawWordSchema.safeParse({
      word: word.trim(),
      aliases: aliases.split(/[、,，/]/).map((value) => value.trim()).filter(Boolean),
      category: category.trim() || "物件",
    });
    if (!entry.success) {
      setNotice("请检查词语、分类和别名的长度。");
      return;
    }
    if (library.words.some((item) => item !== editing && item.word.normalize("NFKC") === entry.data.word.normalize("NFKC"))) {
      setNotice("词库已有这个词语。");
      return;
    }
    change({
      version: 1,
      words: editing ? library.words.map((item) => item === editing ? entry.data : item) : [...library.words, entry.data],
    });
    edit(null);
    setNotice("词条已保存");
  };
  const importFile = async (selected: File) => {
    try {
      const parsed = parseDrawWords(await selected.text());
      change({ version: 1, words: mergeDrawWords([...library.words, ...parsed.words]) });
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
  return (
    <section className="settings-section draw-library">
      <h3>经典词库</h3>
      <div className="draw-library-add">
        <input aria-label="新词语" placeholder="词语" value={word} onChange={(event) => setWord(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") add(); }} />
        <input aria-label="分类" placeholder="分类" value={category} onChange={(event) => setCategory(event.target.value)} />
        <input aria-label="别名" placeholder="别名，用顿号分开" value={aliases} onChange={(event) => setAliases(event.target.value)} />
        <button type="button" onClick={add}>{editing ? "保存修改" : "加入"}</button>
        {editing && <button type="button" onClick={() => edit(null)}>取消</button>}
      </div>
      <div className="draw-library-actions">
        <button type="button" onClick={() => file.current?.click()}>导入</button>
        <button type="button" onClick={() => download(serializeDrawWordLibrary(library), "application/json", "drawguess-library.json")}>导出 JSON</button>
        <button type="button" onClick={() => download(library.words.map((item) => `${item.word},${item.aliases.join("、")},${item.category}`).join("\n"), "text/plain", "drawguess-library.txt")}>导出 TXT</button>
        <input ref={file} type="file" accept="application/json,.json,text/plain,.txt,.csv" hidden onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void importFile(selected); event.target.value = ""; }} />
      </div>
      {notice && <small role="status">{notice}</small>}
      <input aria-label="搜索经典词库" placeholder="搜索词语、分类或别名" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="draw-library-list">
        {library.words.filter((item) => [item.word, item.category, ...item.aliases].some((part) => part.normalize("NFKC").includes(query.trim().normalize("NFKC")))).map((item) => (
          <span key={item.word} className="draw-library-chip">
            {item.word}
            <small>{item.category}</small>
            <button type="button" aria-label={`编辑 ${item.word}`} onClick={() => edit(item)}>编辑</button>
            <button type="button" aria-label={`删除 ${item.word}`} onClick={() => { if (editing === item) edit(null); change({ version: 1, words: library.words.filter((candidate) => candidate !== item) }); }}>×</button>
          </span>
        ))}
      </div>
    </section>
  );
}
