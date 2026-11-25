import { useState } from "react";
import type { DrawFill, DrawStroke } from "../../domain/drawguess/types";
import { Button, Panel } from "../ui/Controls";
import { FayuDrawing } from "./FayuDrawing";

export function DrawingPreview({ strokes, fills }: { strokes: DrawStroke[]; fills: DrawFill[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="drawing-preview">
      <FayuDrawing strokes={strokes} fills={fills} />
      <Button type="button" onClick={() => setOpen(true)}>放大画作</Button>
      <Panel title="画作" className="ui-panel-wide drawing-preview-dialog" open={open} onOpenChange={setOpen}>
        <FayuDrawing strokes={strokes} fills={fills} />
      </Panel>
    </div>
  );
}
