import { useEffect, useMemo, useRef, useState } from "react";
import {
  achievementById,
  achievementDefinitions,
  achievementsForGame,
  defaultAppStats,
  type AchievementDefinition,
  type AchievementGame,
  type AchievementRarity,
  type AchievementUnlock,
  type AppStats,
} from "../domain/achievements";
import { gameCatalogue, gameKinds } from "../domain/catalogue";
import { ClientStore } from "./storage";
import { Button, SearchField, Select } from "./ui/Controls";
import "./achievements.css";

const rarityNames: Record<AchievementRarity, string> = {
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
  mythic: "神话",
};
export const achievementToastDurations: Record<AchievementRarity, number> = {
  common: 6500,
  rare: 7500,
  epic: 9000,
  legendary: 11000,
  mythic: 14000,
};
const appMeta = { name: "OnlineBGClient", symbol: "◎" };
const metaFor = (game: AchievementGame) =>
  game === "app" ? appMeta : gameCatalogue[game];
const time = (value: number) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
const duration = (seconds: number) => {
  if (seconds < 60) return "0 分钟";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟`;
  return `${Math.floor(seconds / 3600)} 小时`;
};

export function previewAchievementUnlock(): AchievementUnlock | undefined {
  const definition =
    achievementById.get("fxq.three-sixes") ?? achievementDefinitions[0];
  if (!definition) return undefined;
  const now = Date.now();
  return {
    profileId: "preview",
    achievementId: definition.id,
    firstAt: now,
    lastAt: now,
    count: 1,
    evidence: {
      room: "preview",
      startedAt: now,
      rulesVersion: "preview",
      actor: 0,
      seatName: "预览",
      replayFingerprint: `preview:${now}`,
      summary: "成就弹窗预览",
    },
  };
}

export function AchievementToasts({
  items,
  onDismiss,
}: {
  items: AchievementUnlock[];
  onDismiss: (id: string) => void;
}) {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    const timers = items.map((item) => {
      const rarity = achievementById.get(item.achievementId)?.rarity;
      return setTimeout(
        () => dismiss.current(item.achievementId),
        rarity ? achievementToastDurations[rarity] : 6500,
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [items]);
  if (!items.length) return null;
  return (
    <div
      className="achievement-toasts"
      aria-live="polite"
      aria-label="成就解锁"
    >
      {items.map((item, index) => {
        const definition = achievementById.get(item.achievementId);
        if (!definition) return null;
        return (
          <button
            type="button"
            className="achievement-toast"
            data-rarity={definition.rarity}
            aria-label={`${definition.title} · ${definition.description} · ${metaFor(definition.game).name}`}
            key={`${item.achievementId}:${item.lastAt}:${index}`}
            onClick={() => onDismiss(item.achievementId)}
          >
            <span className="achievement-toast-symbol" aria-hidden="true">
              {definition.symbol}
            </span>
            <span className="achievement-toast-copy">
              <strong>{definition.title}</strong>
              <small>{definition.description}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AchievementCard({
  definition,
  unlock,
  selected,
  onSelect,
}: {
  definition: AchievementDefinition;
  unlock?: AchievementUnlock;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="achievement-card"
      data-rarity={definition.rarity}
      data-unlocked={unlock ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
      aria-pressed={selected}
      title={definition.description}
      onClick={onSelect}
    >
      <span className="achievement-card-glow" aria-hidden="true" />
      <span className="achievement-card-symbol" aria-hidden="true">
        {definition.symbol}
      </span>
      <strong>{definition.title}</strong>
      {unlock && (unlock.count > 1 || unlock.lastAt > unlock.firstAt) && (
        <b className="achievement-card-count">×{unlock.count}</b>
      )}
    </button>
  );
}

export function AchievementGallery({
  onTestToast,
}: {
  onTestToast?: () => void;
}) {
  const [store] = useState(() => new ClientStore());
  const [unlocks, setUnlocks] = useState<AchievementUnlock[]>([]);
  const [stats, setStats] = useState<AppStats>(() =>
    defaultAppStats(store.achievementProfileId()),
  );
  const [game, setGame] = useState<AchievementGame | "all">("all");
  const [rarity, setRarity] = useState<AchievementRarity | "all">("all");
  const [state, setState] = useState<"all" | "unlocked" | "locked">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>();
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;
    const load = () => {
      void Promise.all([store.achievements(), store.appStats()]).then(
        ([nextUnlocks, nextStats]) => {
          if (!active) return;
          setUnlocks(nextUnlocks);
          setStats(nextStats);
        },
      );
    };
    load();
    window.addEventListener("onlinebg-achievements", load);
    window.addEventListener("onlinebg-app-stats", load);
    return () => {
      active = false;
      window.removeEventListener("onlinebg-achievements", load);
      window.removeEventListener("onlinebg-app-stats", load);
    };
  }, [store]);
  const validUnlocks = useMemo(
    () => unlocks.filter((item) => achievementById.has(item.achievementId)),
    [unlocks],
  );
  const byAchievement = useMemo(
    () => new Map(validUnlocks.map((item) => [item.achievementId, item])),
    [validUnlocks],
  );
  const search = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      achievementDefinitions.filter(
        (definition) =>
          (game === "all" || definition.game === game) &&
          (rarity === "all" || definition.rarity === rarity) &&
          (state === "all" ||
            (state === "unlocked"
              ? byAchievement.has(definition.id)
              : !byAchievement.has(definition.id))) &&
          (!search ||
            `${definition.title} ${definition.description} ${metaFor(definition.game).name} ${rarityNames[definition.rarity]}`
              .toLowerCase()
              .includes(search)),
      ),
    [byAchievement, game, rarity, search, state],
  );
  const latestUnlock = validUnlocks.reduce<AchievementUnlock | undefined>(
    (latest, item) => (!latest || item.lastAt > latest.lastAt ? item : latest),
    undefined,
  );
  const selectedId =
    selected ?? latestUnlock?.achievementId ?? achievementDefinitions[0]?.id;
  const selectedDefinition = selectedId
    ? achievementById.get(selectedId)
    : undefined;
  const selectedUnlock = selectedId ? byAchievement.get(selectedId) : undefined;
  useEffect(() => {
    if (filtered.length && !filtered.some((item) => item.id === selectedId))
      setSelected(filtered[0].id);
  }, [filtered, selectedId]);
  useEffect(() => {
    const list = listRef.current;
    const detail = detailRef.current;
    if (!list || !detail) return;
    const sync = () =>
      list.style.setProperty(
        "--achievement-detail-space",
        `${detail.offsetHeight + 16}px`,
      );
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(detail);
    return () => {
      observer.disconnect();
      list.style.removeProperty("--achievement-detail-space");
    };
  }, [selectedDefinition]);
  const order: AchievementGame[] =
    game === "all" ? ["app", ...gameKinds] : [game];
  const groups = order
    .map((kind) => ({
      kind,
      definitions: filtered.filter((item) => item.game === kind),
    }))
    .filter((group) => group.definitions.length);
  const unlockedCount = validUnlocks.length;
  const total = achievementDefinitions.length;
  return (
    <section className="achievement-gallery" aria-label="成就">
      <div className="achievement-list" ref={listRef}>
        <header className="achievement-overview">
          <div className="achievement-overview-title">
            <h2>成就</h2>
            <div className="achievement-overview-actions">
              {onTestToast && (
                <Button
                  className="achievement-test-button"
                  onClick={onTestToast}
                >
                  测试成就弹窗
                </Button>
              )}
              <strong>
                {unlockedCount} / {total}
              </strong>
            </div>
          </div>
          <div className="achievement-metrics">
            <article>
              <b>{stats.launches}</b>
              <span>启动</span>
            </article>
            <article>
              <b>{duration(stats.playSeconds)}</b>
              <span>游玩</span>
            </article>
            <article>
              <b>{stats.multiplayer}</b>
              <span>联机</span>
            </article>
            <article>
              <b>{stats.completions}</b>
              <span>通关</span>
            </article>
          </div>
        </header>
        <div className="achievement-filters">
          <SearchField
            className="achievement-search"
            label="搜索成就"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select
            aria-label="筛选游戏"
            value={game}
            onValueChange={(value) => setGame(value as AchievementGame | "all")}
          >
            <option value="all">全部</option>
            <option value="app">软件</option>
            {gameKinds.map((kind) => (
              <option value={kind} key={kind}>
                {gameCatalogue[kind].name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="筛选稀有度"
            value={rarity}
            onValueChange={(value) =>
              setRarity(value as AchievementRarity | "all")
            }
          >
            <option value="all">全部稀有度</option>
            {Object.entries(rarityNames).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <div className="segmented achievement-state-filter">
            {[
              ["all", "全部"],
              ["unlocked", "已解锁"],
              ["locked", "未解锁"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={state === value ? "active" : ""}
                onClick={() => setState(value as "all" | "unlocked" | "locked")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {groups.map((group) => {
          const all = achievementsForGame(group.kind);
          const count = all.filter((item) => byAchievement.has(item.id)).length;
          const meta = metaFor(group.kind);
          return (
            <section className="achievement-shelf" key={group.kind}>
              <header>
                <span className="achievement-game-symbol" aria-hidden="true">
                  {meta.symbol}
                </span>
                <strong>{meta.name}</strong>
                <span className="achievement-shelf-count">
                  {count} / {all.length}
                </span>
                <progress value={count} max={all.length} aria-label="完成度" />
              </header>
              <div className="achievement-grid">
                {group.definitions.map((definition) => (
                  <AchievementCard
                    key={definition.id}
                    definition={definition}
                    unlock={byAchievement.get(definition.id)}
                    selected={selectedId === definition.id}
                    onSelect={() => setSelected(definition.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {!groups.length && (
          <div className="achievement-empty">
            <strong>
              {search ? "没有找到匹配的成就" : "没有符合条件的成就"}
            </strong>
          </div>
        )}
      </div>
      {selectedDefinition && (
        <aside
          className="achievement-detail"
          data-rarity={selectedDefinition.rarity}
          ref={detailRef}
        >
          <div>
            <div className="achievement-detail-heading">
              <span aria-hidden="true">{selectedDefinition.symbol}</span>
              <h3>{selectedDefinition.title}</h3>
            </div>
            <p>{selectedDefinition.description}</p>
            <dl>
              <div>
                <dt>游戏</dt>
                <dd>{metaFor(selectedDefinition.game).name}</dd>
              </div>
              <div>
                <dt>稀有度</dt>
                <dd>{rarityNames[selectedDefinition.rarity]}</dd>
              </div>
              {selectedUnlock ? (
                <>
                  <div>
                    <dt>首次解锁</dt>
                    <dd>{time(selectedUnlock.firstAt)}</dd>
                  </div>
                  <div>
                    <dt>最近解锁</dt>
                    <dd>{time(selectedUnlock.lastAt)}</dd>
                  </div>
                  <div>
                    <dt>达成次数</dt>
                    <dd>{selectedUnlock.count}</dd>
                  </div>
                  <div>
                    <dt>当时席位</dt>
                    <dd>{selectedUnlock.evidence.seatName}</dd>
                  </div>
                </>
              ) : (
                <div>
                  <dt>状态</dt>
                  <dd>未解锁</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      )}
    </section>
  );
}
