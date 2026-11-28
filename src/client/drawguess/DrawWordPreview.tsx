import { useEffect, useState } from "react";
import { drawguessBuiltinWords, normalizeDrawWord } from "../../domain/drawguess/words";
import { auxiliaryView } from "../native/contract";
import { Button, Panel } from "../ui/Controls";
import { loadDrawWordLibrary, subscribeDrawWordLibrary } from "./library";
import { makeWordRows } from "./word-library-model";
import { WordLibraryWorkspace } from "./WordLibraryWorkspace";

export function DrawWordPreview() {
  const [library, setLibrary] = useState(loadDrawWordLibrary);
  useEffect(() => subscribeDrawWordLibrary(() => setLibrary(loadDrawWordLibrary())), []);
  const [open, setOpen] = useState(false);
  return (
    <>
      <span>本局词库 · {library.words.length} 个自定义词</span>
      <Button type="button" onClick={() => { setLibrary(loadDrawWordLibrary()); setOpen(true); }}>预览词库</Button>
      <Panel title="经典词库预览" className="ui-panel-wide" open={open} onOpenChange={setOpen}>
        {open && <WordLibraryWorkspace rows={makeWordRows(library.words, drawguessBuiltinWords, library.builtin, normalizeDrawWord)} />}
        {auxiliaryView && <Button type="button" onClick={() => setOpen(false)}>关闭预览</Button>}
      </Panel>
    </>
  );
}
