import { useState } from "react";
import { Button, Panel, SearchField } from "../ui/Controls";
import { exportJson, importJson } from "../files";
import {
  canUnlockLegacy,
  journalArchiveLevel,
  journalAvailableKnowledge,
  journalKnowledge,
  journalLegacySpent,
  type ExpeditionJournal,
  type JournalRun,
} from "../../domain/expedition/journal";
import {
  legacyEffectLines,
  legacyNodeById,
  legacyPrerequisitesMet,
  legacyProfile,
  legacyTiers,
  type LegacyEffects,
  type LegacyNode,
  type LegacyNodeId,
} from "../../domain/expedition/legacy";
import {
  heroContent,
  cards,
  cardText,
  type CardId,
} from "../../domain/expedition/content";
import { relics, relicText, type RelicId } from "../../domain/expedition/world";
import { chapterAt } from "../../domain/expedition/chapters";
import "./journal.css";

type JournalTab =
  "overview" | "legacy" | "professions" | "cards" | "relics" | "runs";

interface CatalogEntry {
  id: string;
  name: string;
  icon: string;
  locked: boolean;
  subtitle: string;
  description: string;
  details: string[];
}

const tabLabels: [JournalTab, string][] = [
  ["overview", "总览"],
  ["legacy", "传承"],
  ["professions", "职业"],
  ["cards", "卡牌"],
  ["relics", "遗物"],
  ["runs", "记录"],
];

const professionName = (id: number) =>
  heroContent[id]?.name ?? `职业 ${id + 1}`;
const chapterName = (id: number) => chapterAt(id).name;
const cardTargetName = (target: string) =>
  target === "enemy"
    ? "敌方"
    : target === "ally"
      ? "队友"
      : target === "all-enemies"
        ? "全体敌人"
        : "自身";
const relicTriggerNames: Record<string, string> = {
  start: "开局",
  round: "每轮",
  card: "出牌",
  kill: "击杀",
  victory: "胜利",
  sealed: "封牌",
  silenced: "沉默",
  loot: "拾取",
};
const percent = (value: number, total: number) =>
  total ? Math.round((value / total) * 100) : 0;

function profileText(profile: LegacyEffects) {
  return (
    legacyEffectLines({
      ...profile,
      campHealing: profile.campHealing - 1,
    }).join(" · ") || "尚未获得传承加成"
  );
}

function runEntry(id: string, run: JournalRun): CatalogEntry {
  const result = run.settled ? (run.won ? "通关" : "结束") : "进行中";
  const professions = run.professions.map(professionName);
  const bosses = [...new Set(run.bosses)].map(chapterName);
  return {
    id,
    name: chapterName(run.chapter),
    icon: `N${run.ascension}`,
    locked: false,
    subtitle: `${result} · ${professions.join(" / ") || "尚未选择职业"}`,
    description: run.settled
      ? `本次远征在${chapterName(run.chapter)}结束，获得 ${run.knowledge} 秘塔学识。`
      : "这次远征仍在进行中，结算后才会获得秘塔学识。",
    details: [
      `职业：${professions.join("、") || "尚未选择"}`,
      `已击败首领：${bosses.join("、") || "无"}`,
      `发现卡牌：${run.cards.length} 张`,
      `发现遗物：${run.relics.length} 件`,
      `学识：${run.settled ? run.knowledge : 0}`,
    ],
  };
}

function catalogEntries(
  tab: "professions" | "cards" | "relics",
  journal: ExpeditionJournal,
): CatalogEntry[] {
  const discoveredProfessions = new Set(
      Object.values(journal.runs).flatMap((run) => run.professions),
    ),
    discoveredCards = new Set(
      Object.values(journal.runs).flatMap((run) => run.cards),
    ),
    discoveredRelics = new Set(
      Object.values(journal.runs).flatMap((run) => run.relics),
    );
  if (tab === "professions")
    return heroContent.map((hero, id) => {
      const found = discoveredProfessions.has(id);
      return {
        id: String(id),
        name: found ? hero.name : "未发现职业",
        icon: found ? hero.icon : "?",
        locked: !found,
        subtitle: found ? hero.title : "在远征中选择该职业后解锁",
        description: found
          ? hero.description
          : "职业图鉴会在第一次选择该职业时记录。",
        details: found
          ? [`最大生命：${hero.maxHp}`, hero.resourceHint]
          : ["选择职业后解锁完整说明。"],
      };
    });
  if (tab === "cards")
    return Object.entries(cards).map(([id, card]) => {
      const found = discoveredCards.has(id);
      return {
        id,
        name: found ? card.name : "未发现卡牌",
        icon: found ? card.icon : "?",
        locked: !found,
        subtitle: found
          ? `${card.cost} 费 · ${cardTargetName(card.target)}`
          : `${card.cost} 费 · ${cardTargetName(card.target)} · 未发现`,
        description: found
          ? cardText({ id: "journal", card: id as CardId, upgradeLevel: 0 })
          : "卡牌图鉴会在远征中获得或打出该牌时记录。",
        details: found
          ? [
              `${card.cost} 费`,
              "exhaust" in card && card.exhaust ? "消耗" : "不消耗",
              "curse" in card && card.curse ? "诅咒牌" : "普通牌",
            ]
          : ["获得或打出后解锁完整效果。"],
      };
    });
  return Object.entries(relics).map(([id, relic]) => {
    const found = discoveredRelics.has(id);
    return {
      id,
      name: found ? relic.name : "未发现遗物",
      icon: found ? relic.icon : "?",
      locked: !found,
      subtitle: found
        ? `触发：${relicTriggerNames[relic.trigger] ?? relic.trigger}`
        : `触发：${relicTriggerNames[relic.trigger] ?? relic.trigger} · 未发现`,
      description: found
        ? relicText(id as RelicId)
        : "遗物图鉴会在远征中获得这件遗物时记录。",
      details: found
        ? [`效果：${relicText(id as RelicId)}`]
        : ["获得遗物后解锁完整效果。"],
    };
  });
}

export function ExpeditionJournalPanel({
  journal,
  error,
  loading,
  onUpgrade,
  onImport,
  onRefresh,
}: {
  journal: ExpeditionJournal;
  error: string;
  loading: boolean;
  onUpgrade: (id: LegacyNodeId) => Promise<void>;
  onImport: (input: unknown) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className="expedition-journal-trigger"
        onClick={() => {
          setOpen(true);
          void onRefresh();
        }}
      >
        远征档案
      </Button>
      <Panel
        title="远征档案"
        open={open}
        onOpenChange={setOpen}
        className="exp-journal-panel"
      >
        {error ? <p role="alert">{error}</p> : null}
        {loading ? <p className="exp-journal-loading">正在读取档案…</p> : null}
        <ExpeditionJournalGallery
          journal={journal}
          onUpgrade={onUpgrade}
          onExport={() =>
            exportJson(journal, "expedition-journal.json").catch(() => {})
          }
          onImport={async () => {
            const input = await importJson();
            if (input) await onImport(input);
          }}
        />
      </Panel>
    </>
  );
}

export function ExpeditionJournalGallery({
  journal,
  onUpgrade,
  onExport,
  onImport,
}: {
  journal: ExpeditionJournal;
  onUpgrade: (id: LegacyNodeId) => Promise<void>;
  onExport: () => void;
  onImport: () => Promise<void>;
}) {
  const [tab, setTab] = useState<JournalTab>("overview");
  const [filter, setFilter] = useState<"all" | "found" | "locked">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>();
  const knowledge = journalKnowledge(journal),
    spent = journalLegacySpent(journal),
    available = journalAvailableKnowledge(journal),
    level = journalArchiveLevel(journal);
  const runs = Object.entries(journal.runs).reverse();
  const won = runs.filter(([, run]) => run.won).length;
  const bosses = runs.reduce((sum, [, run]) => sum + run.bosses.length, 0);
  const maxChapter = runs.reduce(
    (max, [, run]) => Math.max(max, run.chapter),
    0,
  );
  const professions = new Set(
    Object.values(journal.runs).flatMap((run) => run.professions),
  );
  const discoveredCards = new Set(
    Object.values(journal.runs).flatMap((run) => run.cards),
  );
  const discoveredRelics = new Set(
    Object.values(journal.runs).flatMap((run) => run.relics),
  );
  const catalog =
      tab === "professions" || tab === "cards" || tab === "relics"
        ? catalogEntries(tab, journal)
        : [],
    search = query.trim().toLowerCase(),
    source =
      tab === "runs" ? runs.map(([id, run]) => runEntry(id, run)) : catalog,
    filtered = source.filter(
      (entry) =>
        (filter === "all" ||
          (filter === "found" ? !entry.locked : entry.locked)) &&
        (!search ||
          `${entry.name} ${entry.subtitle} ${entry.description}`
            .toLowerCase()
            .includes(search)),
    );
  const selectedEntry =
    filtered.find((entry) => entry.id === selected) ?? filtered[0];

  return (
    <section className="exp-journal">
      <header className="exp-journal-header">
        <div className="exp-journal-title">
          <strong>秘塔学识</strong>
          <span>档案等级 {level}</span>
        </div>
        <div className="exp-journal-currency">
          <article>
            <b>{knowledge}</b>
            <span>总学识</span>
          </article>
          <article>
            <b>{available}</b>
            <span>可用</span>
          </article>
          <article>
            <b>{spent}</b>
            <span>已使用</span>
          </article>
        </div>
        <div className="exp-journal-actions">
          <Button onClick={onExport}>导出档案</Button>
          <Button onClick={() => void onImport()}>合并导入</Button>
        </div>
      </header>
      <nav className="exp-journal-tabs" aria-label="远征档案分类">
        {tabLabels.map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            aria-pressed={tab === value}
            onClick={() => {
              setTab(value);
              setSelected(undefined);
              if (["overview", "legacy", "runs"].includes(value)) {
                setFilter("all");
                setQuery("");
              }
            }}
          >
            {label}
            {value === "professions"
              ? ` ${professions.size}/${heroContent.length}`
              : value === "cards"
                ? ` ${discoveredCards.size}/${Object.keys(cards).length}`
                : value === "relics"
                  ? ` ${discoveredRelics.size}/${Object.keys(relics).length}`
                  : ""}
          </button>
        ))}
      </nav>
      {tab === "overview" ? (
        <div className="exp-journal-overview">
          <div className="exp-journal-metrics">
            {[
              [runs.length, "探索次数"],
              [won, "通关次数"],
              [`${percent(won, runs.length)}%`, "胜率"],
              [runs.length ? chapterName(maxChapter) : "—", "最深层"],
              [bosses, "首领击败"],
              [level, "档案等级"],
            ].map(([value, label]) => (
              <article key={String(label)}>
                <b>{value}</b>
                <span>{label}</span>
              </article>
            ))}
          </div>
          <div className="exp-journal-progress">
            {[
              ["职业", professions.size, heroContent.length],
              ["卡牌", discoveredCards.size, Object.keys(cards).length],
              ["遗物", discoveredRelics.size, Object.keys(relics).length],
            ].map(([label, value, total]) => (
              <article key={String(label)}>
                <div>
                  <strong>{label}</strong>
                  <span>
                    {value} / {total}
                  </span>
                </div>
                <progress
                  value={Number(value)}
                  max={Number(total)}
                  aria-label={`${label}发现进度`}
                />
              </article>
            ))}
          </div>
          <div className="exp-journal-explain">
            <article>
              <h3>局外传承</h3>
              <p>档案学识解锁永久开局加成；联机时使用房主档案，对全队生效。</p>
            </article>
            <article>
              <h3>单局成长</h3>
              <p>
                职业、卡牌、遗物、强化、金币、幸运筹码与罗盘只影响当前远征。
              </p>
            </article>
            <article>
              <h3>N 阶挑战</h3>
              <p>N0–N10 提高敌人强度和规则压力，并用补偿资源抵消部分难度。</p>
            </article>
          </div>
          <div className="exp-journal-milestones">
            {[
              [
                "初探者",
                runs.length > 0,
                runs.length ? "已完成第一次远征" : "开始一次远征",
              ],
              [
                "破关者",
                bosses > 0,
                bosses ? `已击败 ${bosses} 位首领` : "击败一位首领",
              ],
              [
                "归途见证者",
                won > 0,
                won ? `已通关 ${won} 次` : "通关一次远征",
              ],
              [
                "百艺旅人",
                professions.size >= 3,
                `已探索 ${professions.size} / 3 个职业`,
              ],
            ].map(([title, unlocked, detail]) => (
              <article key={String(title)} data-unlocked={unlocked}>
                <strong>{title}</strong>
                <span>{unlocked ? "已解锁" : "未解锁"}</span>
                <small>{detail}</small>
              </article>
            ))}
          </div>
          <section className="exp-journal-recent">
            <div>
              <h3>最近远征</h3>
              <span>{runs.length} 条记录</span>
            </div>
            {runs.slice(0, 4).map(([id, run]) => {
              const entry = runEntry(id, run);
              return (
                <button
                  key={id}
                  onClick={() => {
                    setTab("runs");
                    setFilter("all");
                    setQuery("");
                    setSelected(id);
                  }}
                >
                  <span>{entry.icon}</span>
                  <div>
                    <strong>{entry.name}</strong>
                    <small>{entry.subtitle}</small>
                  </div>
                  <b>{run.settled ? run.knowledge : 0} 学识</b>
                </button>
              );
            })}
            {!runs.length ? <p>还没有远征记录。</p> : null}
          </section>
        </div>
      ) : tab === "legacy" ? (
        <LegacyTree
          journal={journal}
          knowledge={knowledge}
          available={available}
          onUpgrade={onUpgrade}
        />
      ) : (
        <div className="exp-journal-catalog">
          <div className="exp-journal-main">
            <div className="exp-journal-filters">
              <SearchField
                label="搜索档案"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="segmented exp-journal-state-filter">
                {[
                  ["all", "全部"],
                  ["found", "已发现"],
                  ["locked", "未发现"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={filter === value ? "active" : ""}
                    onClick={() =>
                      setFilter(value as "all" | "found" | "locked")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="exp-journal-grid">
              {filtered.map((entry) => (
                <button
                  key={entry.id}
                  className="exp-journal-card"
                  data-locked={entry.locked}
                  data-selected={selectedEntry?.id === entry.id}
                  onClick={() => setSelected(entry.id)}
                >
                  <span>{entry.icon}</span>
                  <strong>{entry.name}</strong>
                  <small>{entry.subtitle}</small>
                </button>
              ))}
            </div>
            {!filtered.length ? (
              <div className="exp-journal-empty">没有符合条件的记录。</div>
            ) : null}
          </div>
          {selectedEntry ? (
            <aside className="exp-journal-detail">
              <div>
                <span>{selectedEntry.icon}</span>
                <div>
                  <h3>{selectedEntry.name}</h3>
                  <small>{selectedEntry.subtitle}</small>
                </div>
              </div>
              <p>{selectedEntry.description}</p>
              <dl>
                {selectedEntry.details.map((detail) => (
                  <div key={detail}>
                    <dt>记录</dt>
                    <dd>{detail}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          ) : null}
        </div>
      )}
    </section>
  );
}

function LegacyTree({
  journal,
  knowledge,
  available,
  onUpgrade,
}: {
  journal: ExpeditionJournal;
  knowledge: number;
  available: number;
  onUpgrade: (id: LegacyNodeId) => Promise<void>;
}) {
  const profile = legacyProfile(journal.legacy);
  return (
    <div className="exp-journal-legacy">
      <aside className="exp-journal-legacy-summary">
        <strong>秘塔学识</strong>
        <b>{available}</b>
        <span>可用 / 共 {knowledge}</span>
        <p>{profileText(profile)}</p>
        <small>联机时使用房主档案，全队生效。</small>
      </aside>
      <div className="exp-journal-tree">
        {legacyTiers.map(({ tier, nodes }) => (
          <section key={tier} className="exp-journal-tier">
            <header>阶段 {tier}</header>
            <div>
              {nodes.map((node) => (
                <LegacyCard
                  key={node.id}
                  node={node}
                  journal={journal}
                  available={available}
                  onUpgrade={onUpgrade}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function LegacyCard({
  node,
  journal,
  available,
  onUpgrade,
}: {
  node: LegacyNode;
  journal: ExpeditionJournal;
  available: number;
  onUpgrade: (id: LegacyNodeId) => Promise<void>;
}) {
  const [pending, setPending] = useState(false),
    unlocked = journal.legacy.includes(node.id),
    prerequisites = legacyPrerequisitesMet(journal.legacy, node.id),
    canUnlock = canUnlockLegacy(journal, node.id);
  return (
    <article
      className="exp-journal-node"
      data-unlocked={unlocked}
      data-ready={canUnlock}
    >
      <header>
        <span>{node.icon}</span>
        <strong>{node.name}</strong>
        <b>{node.cost}</b>
      </header>
      <p>{node.description}</p>
      <small>{legacyEffectLines(node.effects).join(" · ")}</small>
      {node.requires.length ? (
        <em>
          前置：
          {node.requires.map((id) => legacyNodeById.get(id)?.name).join("、")}
        </em>
      ) : null}
      <Button
        variant={canUnlock ? "primary" : "secondary"}
        disabled={!canUnlock || pending}
        onClick={() => {
          if (!canUnlock || pending) return;
          setPending(true);
          void onUpgrade(node.id).finally(() => setPending(false));
        }}
      >
        {pending
          ? "解锁中…"
          : unlocked
            ? "已解锁"
            : !prerequisites
              ? "前置未解锁"
              : available < node.cost
                ? "学识不足"
                : "解锁"}
      </Button>
    </article>
  );
}
