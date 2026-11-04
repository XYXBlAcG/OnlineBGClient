import { useState } from "react";
import { ExpeditionOptionsControl } from "./expedition/ExpeditionOptionsControl";
import {
  mahjongModeNames,
  type MahjongMode,
  type MahjongOptions,
} from "../domain/mahjong/types";
import type { ResolvedExpeditionOptions } from "../domain/expedition/adventure-types";

export function GameOpeningChoice({
  kind,
  expedition,
  mahjong,
  onConfirm,
  onCancel,
}: {
  kind: "scmj" | "expedition";
  expedition: ResolvedExpeditionOptions;
  mahjong: MahjongOptions;
  onConfirm: (
    expedition: ResolvedExpeditionOptions,
    mahjong: MahjongOptions,
  ) => void;
  onCancel: () => void;
}) {
  const [run, setRun] = useState(expedition);
  const [mode, setMode] = useState<MahjongMode | undefined>(mahjong.mode);
  return (
    <fieldset className="opening-choice">
      <legend>
        {kind === "expedition" ? "选择远征难度与阶位" : "选择麻将模式"}
      </legend>
      {kind === "expedition" ? (
        <ExpeditionOptionsControl value={run} onChange={setRun} />
      ) : (
        <div className="opening-modes">
          {(Object.keys(mahjongModeNames) as MahjongMode[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              className={mode === value ? "primary-button" : ""}
              onClick={() => setMode(value)}
            >
              <strong>{mahjongModeNames[value]}</strong>
              <small>
                {value === "sichuan"
                  ? "换三张、定缺、血战到底"
                  : "四人透明立直 · 单局"}
              </small>
            </button>
          ))}
        </div>
      )}
      <div className="setting-row">
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={kind === "scmj" && !mode}
          onClick={() =>
            onConfirm(run, kind === "scmj" ? { ...mahjong, mode } : mahjong)
          }
        >
          确认选择
        </button>
      </div>
    </fieldset>
  );
}
