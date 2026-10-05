import { useEffect, useState } from "react";
import {
  defaultPhraseGroups,
  phraseGroupsSchema,
  type PhraseGroup,
} from "../domain/phrases";
export function PhraseSettings({
  groups,
  onChange,
  onError,
}: {
  groups: PhraseGroup[];
  onChange: (groups: PhraseGroup[]) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState(() =>
    groups.map((group) => ({ name: group.name, text: group.items.join("\n") })),
  );
  useEffect(
    () =>
      setDraft(
        groups.map((group) => ({
          name: group.name,
          text: group.items.join("\n"),
        })),
      ),
    [groups],
  );
  return (
    <section className="settings-section phrase-settings">
      <h3>常用语</h3>
      {draft.map((group, index) => (
        <details key={index}>
          <summary>{group.name || "新分组"}</summary>
          <input
            aria-label={`常用语分组 ${index + 1}`}
            maxLength={24}
            value={group.name}
            onChange={(event) =>
              setDraft(
                draft.map((row, i) =>
                  i === index ? { ...row, name: event.target.value } : row,
                ),
              )
            }
          />
          <textarea
            aria-label={`常用语内容 ${index + 1}`}
            value={group.text}
            placeholder="每行一句，可调整行的顺序"
            onChange={(event) =>
              setDraft(
                draft.map((row, i) =>
                  i === index ? { ...row, text: event.target.value } : row,
                ),
              )
            }
          />
          <div className="phrase-edit-actions">
            <button
              disabled={!index}
              aria-label={`上移分组 ${index + 1}`}
              onClick={() => {
                const rows = [...draft];
                [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]];
                setDraft(rows);
              }}
            >
              ↑
            </button>
            <button
              disabled={index === draft.length - 1}
              aria-label={`下移分组 ${index + 1}`}
              onClick={() => {
                const rows = [...draft];
                [rows[index + 1], rows[index]] = [rows[index], rows[index + 1]];
                setDraft(rows);
              }}
            >
              ↓
            </button>
            <button
              onClick={() => setDraft(draft.filter((_, i) => i !== index))}
            >
              删除分组
            </button>
          </div>
        </details>
      ))}
      <div className="phrase-edit-actions">
        <button
          disabled={draft.length >= 12}
          onClick={() => setDraft([...draft, { name: "我的常用语", text: "" }])}
        >
          添加分组
        </button>
        <button onClick={() => onChange(structuredClone(defaultPhraseGroups))}>
          恢复预设
        </button>
        <button
          className="primary-button"
          onClick={() => {
            const parsed = phraseGroupsSchema.safeParse(
              draft.map((group) => ({
                name: group.name,
                items: group.text
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
              })),
            );
            if (!parsed.success)
              onError("分组名限 24 字，每组最多 60 句，每句最多 500 字。");
            else onChange(parsed.data);
          }}
        >
          保存常用语
        </button>
      </div>
    </section>
  );
}
