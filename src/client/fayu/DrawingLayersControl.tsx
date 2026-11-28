import { useState } from "react";
import type { DrawEdit } from "../../domain/actions";
import { drawLayerLimit, type DrawLayer } from "../../domain/drawguess/types";
import { Button } from "../ui/Controls";

type LayerMove = Extract<DrawEdit, { type: "draw-layer" }>["move"];

function LayerName({ name, disabled, rename }: { name: string; disabled: boolean; rename: (name: string) => void }) {
  const [text, setText] = useState(name);
  return <div className="fayu-layer-name">
    <input aria-label="图层名称" maxLength={12} value={text} disabled={disabled} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => {
      if (event.key === "Enter" && text.trim() && text.trim() !== name) {
        event.preventDefault();
        rename(text.trim());
      }
    }} />
    <Button type="button" disabled={disabled || !text.trim() || text.trim() === name} onClick={() => rename(text.trim())}>重命名</Button>
  </div>;
}

export function DrawingLayersControl({ layers, active, select, change, clear, disabled, canClear }: {
  layers: DrawLayer[];
  active: DrawLayer;
  select: (id: number) => void;
  change: (move: LayerMove) => void;
  clear: () => void;
  disabled: boolean;
  canClear: boolean;
}) {
  const index = layers.findIndex(({ id }) => id === active.id);
  const free = Array.from({ length: drawLayerLimit }, (_, id) => id).find((id) => !layers.some((layer) => layer.id === id));
  return <section className="fayu-layer-controls" aria-label="图层">
    <div className="fayu-layer-list">
      {[...layers].reverse().map((layer) => <Button key={layer.id} type="button" aria-pressed={layer.id === active.id} variant={layer.id === active.id ? "primary" : "secondary"} onClick={() => select(layer.id)}>
        {layer.name}{layer.hidden ? "（已隐藏）" : ""}
      </Button>)}
      <Button type="button" disabled={disabled || free === undefined} onClick={() => {
        if (free !== undefined) { change({ type: "add", layer: free }); select(free); }
      }}>新增图层</Button>
    </div>
    <LayerName key={`${active.id}:${active.name}`} name={active.name} disabled={disabled} rename={(name) => change({ type: "rename", layer: active.id, name })} />
    <div className="fayu-layer-list">
      <Button type="button" disabled={disabled || index === layers.length - 1} onClick={() => change({ type: "move", layer: active.id, by: 1 })}>上移</Button>
      <Button type="button" disabled={disabled || index === 0} onClick={() => change({ type: "move", layer: active.id, by: -1 })}>下移</Button>
      <Button type="button" disabled={disabled} onClick={() => change({ type: "visibility", layer: active.id, hidden: !active.hidden })}>{active.hidden ? "显示" : "隐藏"}</Button>
      <Button type="button" disabled={disabled || !canClear} onClick={() => { if (window.confirm(`清空「${active.name}」？`)) clear(); }}>清空</Button>
      <Button type="button" disabled={disabled || layers.length <= 1} onClick={() => {
        if (!canClear || window.confirm(`删除「${active.name}」及其内容？`)) change({ type: "remove", layer: active.id });
      }}>删除</Button>
    </div>
  </section>;
}
