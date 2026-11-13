import { useMemo, useRef, useState } from "react";
import { Button, Select, TextField } from "../ui/Controls";
import type { Effect } from "../../domain/expedition/card-types";
import { cards } from "../../domain/expedition/content";
import type { RelicDefinition } from "../../domain/expedition/world";
import {
  applyExpeditionData,
  clearExpeditionOverrides,
  defaultExpeditionData,
  readExpeditionOverrides,
  snapshotExpeditionData,
  writeExpeditionOverrides,
  type ExpeditionDataOverrides,
  type ProfessionOverride,
} from "./expedition-overrides";
import "./expedition-editor.css";

const effectKinds: Effect["kind"][] = [
  "damage",
  "block",
  "draw",
  "poison",
  "vulnerable",
  "energy",
  "heal",
  "strength",
  "weak",
  "dexterity",
  "thorns",
  "regen",
  "cleanse",
  "heat",
  "cool",
  "device",
  "focus",
  "echo",
  "blessing",
  "dice",
];
const effectTargets = ["self", "selected", "party"] as const;
const effectScales = [
  "block",
  "poison",
  "played",
  "marked",
  "heat",
  "turret",
  "dice",
] as const;
const triggers: RelicDefinition["trigger"][] = [
  "start",
  "round",
  "card",
  "kill",
  "victory",
  "sealed",
  "silenced",
  "loot",
];

function copy(data: ExpeditionDataOverrides): ExpeditionDataOverrides {
  return structuredClone(data);
}

export function ExpeditionDataEditor() {
  const baseline = useRef(defaultExpeditionData());
  const [data, setData] = useState<ExpeditionDataOverrides>(() => {
    const stored = readExpeditionOverrides();
    if (!stored) return snapshotExpeditionData();
    applyExpeditionData(stored);
    return copy(stored);
  });
  const [status, setStatus] = useState("");
  const [importText, setImportText] = useState("");
  const customIds = useMemo(
    () => new Set(baseline.current.relics.map((entry) => entry.id)),
    [],
  );
  const patchRelic = (
    index: number,
    update: (definition: RelicDefinition) => RelicDefinition,
  ) =>
    setData((current) => {
      const next = copy(current);
      next.relics[index] = {
        ...next.relics[index],
        definition: update(next.relics[index].definition),
      };
      return next;
    });
  const patchProfession = (
    index: number,
    patch: Partial<ProfessionOverride>,
  ) =>
    setData((current) => {
      const next = copy(current);
      next.professions[index] = { ...next.professions[index], ...patch };
      return next;
    });
  const save = () => {
    const known = new Set(Object.keys(cards));
    for (const profession of data.professions) {
      const missing = [...profession.deck, ...profession.rewards].filter(
        (id) => !known.has(id),
      );
      if (missing.length) {
        setStatus(`未知卡牌：${missing.join("、")}`);
        return;
      }
    }
    try {
      writeExpeditionOverrides(data);
      applyExpeditionData(data);
      setStatus("已保存并应用：新开的远征使用新数据");
    } catch (error) {
      setStatus(`保存失败：${String(error)}`);
    }
  };
  const reset = () => {
    clearExpeditionOverrides();
    applyExpeditionData(baseline.current);
    setData(copy(baseline.current));
    setStatus("已恢复默认数据");
  };
  const exportData = () => setImportText(JSON.stringify(data, null, 2));
  const importData = () => {
    try {
      const value = JSON.parse(importText) as ExpeditionDataOverrides;
      if (value.version !== 1 || !Array.isArray(value.relics))
        throw new Error("格式不正确");
      applyExpeditionData(value);
      setData(copy(value));
      writeExpeditionOverrides(value);
      setStatus("已导入并应用");
    } catch (error) {
      setStatus(`导入失败：${String(error)}`);
    }
  };
  return (
    <main className="app-shell exp-editor">
      <header className="exp-editor-header">
        <h1>远征数据编辑器</h1>
        <div className="exp-editor-actions">
          <Button variant="primary" onClick={save}>
            保存并应用
          </Button>
          <Button onClick={reset}>恢复默认</Button>
          <Button onClick={exportData}>导出 JSON</Button>
        </div>
      </header>
      <p className="exp-editor-status" role="status">
        {status ||
          "编辑遗物与职业数值；保存后新开的远征生效，已有对局不受影响。"}
      </p>
      <section className="exp-editor-section">
        <h2>遗物（{data.relics.length}）</h2>
        {data.relics.map((entry, index) => (
          <details key={entry.id} className="exp-editor-row">
            <summary>
              <strong>{entry.definition.name}</strong>
              <span>{entry.id}</span>
            </summary>
            <div className="exp-editor-grid">
              <TextField
                label="名称"
                value={entry.definition.name}
                onChange={(event) =>
                  patchRelic(index, (definition) => ({
                    ...definition,
                    name: event.target.value,
                  }))
                }
              />
              <TextField
                label="图标"
                value={entry.definition.icon}
                onChange={(event) =>
                  patchRelic(index, (definition) => ({
                    ...definition,
                    icon: event.target.value,
                  }))
                }
              />
              <label className="exp-editor-field">
                触发
                <Select
                  value={entry.definition.trigger}
                  onValueChange={(trigger) =>
                    patchRelic(index, (definition) => ({
                      ...definition,
                      trigger: trigger as RelicDefinition["trigger"],
                    }))
                  }
                >
                  {triggers.map((trigger) => (
                    <option key={trigger} value={trigger}>
                      {trigger}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="exp-editor-effects">
              {entry.definition.effects.map((effect, effectIndex) => (
                <div className="exp-editor-effect" key={effectIndex}>
                  <Select
                    value={effect.kind}
                    onValueChange={(kind) =>
                      patchRelic(index, (definition) => {
                        const effects = [...definition.effects];
                        effects[effectIndex] = {
                          ...effects[effectIndex],
                          kind: kind as Effect["kind"],
                        };
                        return { ...definition, effects };
                      })
                    }
                  >
                    {effectKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </Select>
                  <TextField
                    label="数值"
                    type="number"
                    value={effect.amount}
                    onChange={(event) =>
                      patchRelic(index, (definition) => {
                        const effects = [...definition.effects];
                        effects[effectIndex] = {
                          ...effects[effectIndex],
                          amount: Number(event.target.value),
                        };
                        return { ...definition, effects };
                      })
                    }
                  />
                  <Select
                    value={effect.target ?? ""}
                    onValueChange={(target) =>
                      patchRelic(index, (definition) => {
                        const effects = [...definition.effects];
                        effects[effectIndex] = {
                          ...effects[effectIndex],
                          target:
                            target === ""
                              ? undefined
                              : (target as Effect["target"]),
                        };
                        return { ...definition, effects };
                      })
                    }
                  >
                    <option value="">默认</option>
                    {effectTargets.map((target) => (
                      <option key={target} value={target}>
                        {target}
                      </option>
                    ))}
                  </Select>
                  {effect.kind === "damage" && (
                    <>
                      <TextField
                        label="段数"
                        type="number"
                        value={effect.hits ?? ""}
                        onChange={(event) =>
                          patchRelic(index, (definition) => {
                            const effects = [...definition.effects];
                            effects[effectIndex] = {
                              ...effects[effectIndex],
                              hits:
                                event.target.value === ""
                                  ? undefined
                                  : Number(event.target.value),
                            };
                            return { ...definition, effects };
                          })
                        }
                      />
                      <Select
                        value={effect.scale ?? ""}
                        onValueChange={(scale) =>
                          patchRelic(index, (definition) => {
                            const effects = [...definition.effects];
                            effects[effectIndex] = {
                              ...effects[effectIndex],
                              scale:
                                scale === ""
                                  ? undefined
                                  : (scale as Effect["scale"]),
                            };
                            return { ...definition, effects };
                          })
                        }
                      >
                        <option value="">无成长</option>
                        {effectScales.map((scale) => (
                          <option key={scale} value={scale}>
                            {scale}
                          </option>
                        ))}
                      </Select>
                    </>
                  )}
                  <Button
                    onClick={() =>
                      patchRelic(index, (definition) => ({
                        ...definition,
                        effects: definition.effects.filter(
                          (_, itemIndex) => itemIndex !== effectIndex,
                        ),
                      }))
                    }
                  >
                    删除效果
                  </Button>
                </div>
              ))}
              <div className="exp-editor-actions">
                <Button
                  onClick={() =>
                    patchRelic(index, (definition) => ({
                      ...definition,
                      effects: [
                        ...definition.effects,
                        { kind: "strength", amount: 1 },
                      ],
                    }))
                  }
                >
                  添加效果
                </Button>
                {!customIds.has(entry.id) && (
                  <Button
                    variant="danger"
                    onClick={() =>
                      setData((current) => ({
                        ...current,
                        relics: current.relics.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                  >
                    移除此遗物
                  </Button>
                )}
              </div>
            </div>
          </details>
        ))}
        <div className="exp-editor-actions">
          <Button
            onClick={() =>
              setData((current) => ({
                ...current,
                relics: [
                  ...current.relics,
                  {
                    id: `custom_${Date.now().toString(36)}`,
                    definition: {
                      name: "新遗物",
                      icon: "✦︎",
                      trigger: "start",
                      effects: [{ kind: "strength", amount: 1 }],
                    },
                  },
                ],
              }))
            }
          >
            新增遗物
          </Button>
        </div>
      </section>
      <section className="exp-editor-section">
        <h2>职业（{data.professions.length}）</h2>
        {data.professions.map((profession, index) => (
          <details key={`${profession.name}-${index}`} className="exp-editor-row">
            <summary>
              <strong>{profession.name}</strong>
              <span>生命 {profession.maxHp}</span>
            </summary>
            <div className="exp-editor-grid">
              <TextField
                label="名称"
                value={profession.name}
                onChange={(event) =>
                  patchProfession(index, { name: event.target.value })
                }
              />
              <TextField
                label="称号"
                value={profession.title}
                onChange={(event) =>
                  patchProfession(index, { title: event.target.value })
                }
              />
              <TextField
                label="最大生命"
                type="number"
                value={profession.maxHp}
                onChange={(event) =>
                  patchProfession(index, { maxHp: Number(event.target.value) })
                }
              />
              <TextField
                label="图标"
                value={profession.icon}
                onChange={(event) =>
                  patchProfession(index, { icon: event.target.value })
                }
              />
              <label className="exp-editor-field">
                开局遗物
                <Select
                  value={data.startingRelics[index] ?? ""}
                  onValueChange={(relic) =>
                    setData((current) => {
                      const next = copy(current);
                      next.startingRelics[index] = relic;
                      return next;
                    })
                  }
                >
                  {data.relics.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.definition.name}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="exp-editor-grid">
              <TextField
                label="描述"
                value={profession.description}
                onChange={(event) =>
                  patchProfession(index, { description: event.target.value })
                }
              />
              <TextField
                label="定位说明"
                value={profession.resourceHint}
                onChange={(event) =>
                  patchProfession(index, { resourceHint: event.target.value })
                }
              />
              <TextField
                label="牌组（逗号分隔）"
                value={profession.deck.join(",")}
                onChange={(event) =>
                  patchProfession(index, {
                    deck: splitIds(event.target.value),
                  })
                }
              />
              <TextField
                label="奖励池（逗号分隔）"
                value={profession.rewards.join(",")}
                onChange={(event) =>
                  patchProfession(index, {
                    rewards: splitIds(event.target.value),
                  })
                }
              />
            </div>
          </details>
        ))}
      </section>
      <section className="exp-editor-section">
        <h2>导入 / 导出</h2>
        <textarea
          className="exp-editor-json"
          aria-label="导入导出 JSON"
          value={importText}
          placeholder="先点导出 JSON，或粘贴整份 JSON 后导入"
          onChange={(event) => setImportText(event.target.value)}
        />
        <div className="exp-editor-actions">
          <Button onClick={importData}>导入并应用</Button>
        </div>
      </section>
    </main>
  );
}

function splitIds(value: string): string[] {
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
