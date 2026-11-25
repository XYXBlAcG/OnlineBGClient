import { useEffect, useState } from "react";
import { FayuLibraryEditor } from "../fayu/FayuLibraryPanel";
import { loadFayuLibrary, saveFayuLibrary, subscribeFayuLibrary } from "../fayu/library";
import { Button } from "../ui/Controls";
import { DrawWordLibraryPanel } from "./DrawWordLibraryPanel";
import "../fayu/fayu.css";

export function DrawingLibrariesSettings() {
  const [mode, setMode] = useState<"classic" | "fayu">("classic");
  const [library, setLibrary] = useState(loadFayuLibrary);
  useEffect(() => subscribeFayuLibrary(() => setLibrary(loadFayuLibrary())), []);
  return (
    <section className="settings-section drawing-libraries">
      <h3>你画我猜词库</h3>
      <div className="fayu-actions">
        <Button aria-pressed={mode === "classic"} variant={mode === "classic" ? "primary" : "secondary"} onClick={() => setMode("classic")}>经典</Button>
        <Button aria-pressed={mode === "fayu"} variant={mode === "fayu" ? "primary" : "secondary"} onClick={() => setMode("fayu")}>法语</Button>
      </div>
      {mode === "classic" ? <DrawWordLibraryPanel /> :
        <FayuLibraryEditor library={library} onChange={saveFayuLibrary} />}
    </section>
  );
}
