import { useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Select } from "../ui/Controls";
import { filterWordRows, type LibraryWord, type WordRow, type WordSource, type WordStatus } from "./word-library-model";
import "./word-library.css";

type Operations<Word extends LibraryWord> = {
  add: () => Word;
  save: (row: WordRow<Word> | null, word: Word) => string;
  remove: (row: WordRow<Word>) => void;
  system: (rows: WordRow<Word>[], operation: "enable" | "disable" | "reset") => void;
  import: (file: File) => Promise<string>;
  export: (format: "json" | "txt") => { contents: string; filename: string };
  sample: () => string;
  fields?: (word: Word, change: (word: Word) => void) => ReactNode;
  canReset: boolean;
};

const pageSize = 24;
const sources: WordSource[] = ["all", "system", "custom"];
const sourceLabels = { all: "全部词条", system: "系统词", custom: "我的词" };
const statusLabels: Record<WordStatus, string> = { all: "全部状态", enabled: "已启用", disabled: "已停用", modified: "已修改" };
const sortLabels = { original: "默认顺序", word: "按词语", pos: "按词性", category: "按类别", status: "按状态" };
const collator = new Intl.Collator("zh-CN");

export function WordLibraryWorkspace<Word extends LibraryWord>({
  rows, positions, operations,
}: { rows: WordRow<Word>[]; positions?: Record<string, string>; operations?: Operations<Word> }) {
  const [source, setSource] = useState<WordSource>("all");
  const [status, setStatus] = useState<WordStatus>("all");
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<keyof typeof sortLabels>("original");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [editor, setEditor] = useState<{ row: WordRow<Word> | null; word: Word; aliases: string }>();
  const [notice, setNotice] = useState("");
  const [sample, setSample] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const categories = useMemo(() => [...new Set(rows.map(({ word }) => word.category).filter(Boolean))].sort(collator.compare), [rows]);
  const filtered = useMemo(() => {
    const list = filterWordRows(rows, query, source, status, pos, category);
    if (sort === "word") list.sort((a, b) => collator.compare(a.word.word, b.word.word));
    if (sort === "pos") list.sort((a, b) => collator.compare(positions?.[a.word.pos ?? ""] ?? "", positions?.[b.word.pos ?? ""] ?? ""));
    if (sort === "category") list.sort((a, b) => collator.compare(a.word.category, b.word.category));
    if (sort === "status") list.sort((a, b) => Number(a.disabled) - Number(b.disabled) || Number(b.modified) - Number(a.modified));
    return list;
  }, [rows, query, source, status, pos, category, sort, positions]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const shown = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const chosen = rows.filter((row) => !!row.original && selected.includes(row.id));
  const changeFilter = () => { setPage(0); setSelected([]); };
  const applySystem = (items: WordRow<Word>[], operation: Parameters<Operations<Word>["system"]>[1]) => {
    operations?.system(items, operation);
    setSelected([]);
    setSample("");
    if (editor?.row?.original && items.some((row) => row.id === editor.row?.id)) {
      if (operation === "reset") {
        const current = editor.row.original;
        setEditor({ row: editor.row, word: current, aliases: current.aliases.join("、") });
      }
    }
    setNotice(`${items.length} 条词已${operation === "reset" ? "恢复默认" : operation === "enable" ? "启用" : "停用"}`);
  };
  const save = () => {
    if (!editor || !operations) return;
    try {
      const word = { ...editor.word, aliases: editor.aliases.split(/[、,，/]/).map((alias) => alias.trim()).filter(Boolean) };
      const id = operations.save(liveRow ?? editor.row, word);
      setEditor({ row: { ...editor.row, id, key: id.slice(id.indexOf(":") + 1), word, disabled: editor.row?.disabled ?? false, modified: editor.row?.modified ?? false }, word, aliases: word.aliases.join("、") });
      setSample("");
      setNotice("已保存");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败");
    }
  };
  const download = (format: "json" | "txt") => {
    if (!operations) return;
    const { contents, filename } = operations.export(format);
    const url = URL.createObjectURL(new Blob([contents], { type: format === "json" ? "application/json" : "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };
  const liveRow = editor?.row && rows.find(({ id }) => id === editor.row?.id);
  const editable = !!operations;
  return (
    <section className="word-workspace" data-editing={!!editor} data-editable={editable}>
      {operations && <div className="word-toolbar">
        <Button type="button" onClick={() => { setEditor({ row: null, word: operations.add(), aliases: "" }); setNotice(""); }}>新增词条</Button>
        <Button type="button" onClick={() => {
          try { setSample(operations.sample()); setNotice(""); }
          catch (error) { setSample(""); setNotice(error instanceof Error ? error.message : "无法试出题词"); }
        }}>试出一题</Button>
        <Button type="button" onClick={() => file.current?.click()}>导入</Button>
        <details className="word-export">
          <summary>导出</summary>
          <div><Button type="button" onClick={() => download("json")}>词库备份 JSON</Button><Button type="button" onClick={() => download("txt")}>自定义词 TXT</Button></div>
        </details>
        <input ref={file} type="file" accept="application/json,.json,text/plain,.txt,.csv" hidden onChange={async (event) => {
          const selectedFile = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!selectedFile) return;
          try { setNotice(await operations.import(selectedFile)); setSample(""); }
          catch (error) { setNotice(error instanceof Error ? error.message : "导入失败"); }
        }} />
      </div>}
      {notice && <p className="word-notice" role="status">{notice}</p>}
      {sample && <output className="word-sample" aria-label="题目预览">{sample}</output>}
      <div className="word-columns">
        <aside className="word-filters" aria-label="词库筛选">
          <input aria-label="搜索题词、原词或别名" placeholder="搜索题词、原词或别名" value={query} onChange={(event) => { setQuery(event.target.value); changeFilter(); }} />
          <div className="word-sources" aria-label="词条来源">
            {sources.map((item) => <Button key={item} type="button" variant={source === item ? "primary" : "secondary"} aria-pressed={source === item} onClick={() => { setSource(item); changeFilter(); }}>{sourceLabels[item]}</Button>)}
          </div>
          {positions && <Select aria-label="词性筛选" value={pos || "all"} onValueChange={(value) => { setPos(value === "all" ? "" : value); changeFilter(); }}><option value="all">全部词性</option>{Object.entries(positions).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select>}
          <Select aria-label="类别筛选" value={category || "all"} onValueChange={(value) => { setCategory(value === "all" ? "" : value); changeFilter(); }}><option value="all">全部类别</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
          <Select aria-label="状态筛选" value={status} onValueChange={(value) => { if (value in statusLabels) setStatus(value as WordStatus); changeFilter(); }}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
          {operations?.canReset && <Button type="button" onClick={() => { if (window.confirm("恢复全部系统词默认设置？")) applySystem(rows.filter((row) => !!row.original && (row.disabled || row.modified)), "reset"); }}>恢复系统默认</Button>}
        </aside>
        <div className="word-results">
          <div className="word-list-tools">
            <span>{filtered.length} 条</span>
            <Select aria-label="排序词条" value={sort} onValueChange={(value) => { if (value in sortLabels) setSort(value as keyof typeof sortLabels); setPage(0); }}>{Object.entries(sortLabels).filter(([key]) => key !== "pos" || positions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
            {operations && shown.some((row) => row.original) && <Button type="button" onClick={() => setSelected([...new Set([...selected, ...shown.filter((row) => row.original).map(({ id }) => id)])])}>选中本页系统词</Button>}
            {operations && filtered.some((row) => row.original) && filtered.length > pageSize && <Button type="button" onClick={() => setSelected(filtered.filter((row) => row.original).map(({ id }) => id))}>选中全部匹配的系统词</Button>}
          </div>
          {!!chosen.length && <div className="word-bulk">
            <strong>已选 {chosen.length} 条</strong>
            <Button type="button" onClick={() => applySystem(chosen, "enable")}>启用</Button>
            <Button type="button" onClick={() => applySystem(chosen, "disable")}>停用</Button>
            <Button type="button" onClick={() => applySystem(chosen, "reset")}>恢复默认</Button>
            <Button type="button" onClick={() => setSelected([])}>取消选择</Button>
          </div>}
          <ul className="word-rows" aria-label="词条">
            {shown.map((row) => {
              const details = [row.original?.word !== row.word.word ? row.original?.word : "", ...row.word.aliases].filter(Boolean).join("、");
              const tag = row.disabled ? "停用" : row.modified ? "已修改" : row.original ? "系统" : "自定义";
              const description = row.word.pos && positions ? positions[row.word.pos] : row.word.category;
              return <li key={row.id} data-active={editor?.row?.id === row.id}>
                {operations && <span>{row.original && <input type="checkbox" aria-label={`选择 ${row.word.word}`} checked={selected.includes(row.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))} />}</span>}
                {operations ? <button className="word-row-target" type="button" onClick={() => { setEditor({ row, word: row.word, aliases: row.word.aliases.join("、") }); setNotice(""); }}>
                  <strong>{row.word.word}</strong>{details && <small>{details}</small>}
                </button> : <div className="word-row-target"><strong>{row.word.word}</strong>{details && <small>{details}</small>}</div>}
                <span className="word-category">{description}</span><small>{tag}</small>
              </li>;
            })}
          </ul>
          {!filtered.length && <p className="word-notice">没有匹配词条</p>}
          <div className="word-pagination">
            <Button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>上一页</Button>
            <span>{currentPage + 1} / {pages}</span>
            <Button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>下一页</Button>
          </div>
        </div>
        {operations && editor && <form className="word-editor" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <div className="word-editor-head">
            <strong>{editor.row ? "编辑词条" : "新增词条"}</strong>
            <Button type="button" aria-label="返回词条列表" onClick={() => setEditor(undefined)}>返回列表</Button>
          </div>
          {editor.row?.original && <small>原词 {editor.row.original.word}</small>}
          <label>词语<input maxLength={20} required value={editor.word.word} onChange={(event) => setEditor({ ...editor, word: { ...editor.word, word: event.target.value } })} /></label>
          <label>别名<input placeholder="用顿号分隔" value={editor.aliases} onChange={(event) => setEditor({ ...editor, aliases: event.target.value })} /></label>
          <label>类别<input maxLength={12} value={editor.word.category} onChange={(event) => setEditor({ ...editor, word: { ...editor.word, category: event.target.value } })} /></label>
          {operations.fields?.(editor.word, (word) => setEditor({ ...editor, word }))}
          <div className="word-toolbar">
            <Button type="submit" variant="primary">保存</Button>
            {liveRow?.original && <>
              <Button type="button" onClick={() => applySystem([liveRow], liveRow.disabled ? "enable" : "disable")}>{liveRow.disabled ? "启用" : "停用"}</Button>
              {(liveRow.disabled || liveRow.modified) && <Button type="button" onClick={() => applySystem([liveRow], "reset")}>恢复默认</Button>}
            </>}
            {liveRow && !liveRow.original && <Button type="button" onClick={() => {
              if (!window.confirm(`删除「${liveRow.word.word}」？`)) return;
              operations.remove(liveRow);
              setEditor(undefined);
              setSample("");
              setNotice("已删除");
            }}>删除词条</Button>}
          </div>
        </form>}
      </div>
    </section>
  );
}
