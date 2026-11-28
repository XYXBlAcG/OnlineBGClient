import { useState } from "react";
import type { DrawFill, DrawLayer, DrawStroke } from "../../domain/drawguess/types";
import { Button, Panel } from "../ui/Controls";
import { FayuDrawing } from "./FayuDrawing";

export function DrawingPreview({ strokes, fills, layers }: { strokes: DrawStroke[]; fills: DrawFill[]; layers?: DrawLayer[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="drawing-preview">
      <FayuDrawing strokes={strokes} fills={fills} layers={layers} />
      <Button type="button" onClick={() => setOpen(true)}>放大画作</Button>
      <Panel title="画作" className="ui-panel-wide drawing-preview-dialog" open={open} onOpenChange={setOpen}>
        <FayuDrawing strokes={strokes} fills={fills} layers={layers} />
      </Panel>
    </div>
  );
}
