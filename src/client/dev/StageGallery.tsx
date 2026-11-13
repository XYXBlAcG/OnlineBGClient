import { useMemo, useState, type CSSProperties } from "react";
import {
  achievementRarityColors,
  achievementRarityNames,
  type AchievementRarity,
} from "../../domain/achievement-types";
import {
  achievementDefinitions,
  type AchievementDefinition,
  type AchievementUnlock,
} from "../../domain/achievements";
import { gameCatalogue, gameKinds } from "../../domain/catalogue";
import {
  partyItems,
  type PartyCategory,
  type PartyEvent,
  type PartyItemId,
} from "../../domain/party";
import { AchievementToasts } from "../Achievements";
import { PartyRuntime } from "../party/PartyRuntime";
import { defaultPreferences } from "../preferences";
import { ChatMessageView } from "../social/ChatMessageView";
import { Button } from "../ui/Controls";
import styles from "./StageGallery.module.css";

const rarities: AchievementRarity[] = ["epic", "legendary", "mythic"];
const categories: PartyCategory[] = ["轰炸", "场景", "装扮", "装备", "观众"];

type Preview =
  | {
      id: number;
      kind: "achievement";
      rarity: AchievementRarity;
      title: string;
      symbol: string;
    }
  | { id: number; kind: "item"; item: PartyItemId };

const hasStage = (rarity: AchievementRarity) => rarities.includes(rarity);

export function StageGallery() {
  const [preview, setPreview] = useState<Preview | null>({
    id: 0,
    kind: "achievement",
    rarity: "legendary",
    title: "传说成就",
    symbol: "🏆",
  });
  const [card, setCard] = useState<AchievementDefinition | null>(null);
  const [toasts, setToasts] = useState<AchievementUnlock[]>([]);
  const seats = useMemo(
    () => [
      {
        id: "preview-0",
        name: "甲",
        difficulty: null,
        online: true,
        ready: true,
      },
      {
        id: "preview-1",
        name: "乙",
        difficulty: null,
        online: true,
        ready: true,
      },
    ],
    [],
  );
  const snapshot = useMemo(() => {
    const now = Date.now();
    const achievement = preview?.kind === "achievement" ? preview : undefined;
    return {
      actor: 0,
      partyActor: 0,
      seats,
      spectators: [],
      serverTime: now,
      chat: achievement
        ? [
            {
              type: "achievement" as const,
              id: `preview:${achievement.id}`,
              sequence: 1,
              sender: "preview-0",
              name: "甲",
              time: now,
              text: `甲 达成了「${achievement.title}」成就`,
              achievementId: `preview.${achievement.id}`,
              title: achievement.title,
              symbol: achievement.symbol,
              rarity: achievement.rarity,
              game: "app" as const,
            },
          ]
        : [],
      party: { enabled: true, events: [], minigames: [] },
    };
  }, [preview, seats]);
  const stageEvents = useMemo<PartyEvent[]>(() => {
    if (preview?.kind !== "item") return [];
    const item = partyItems[preview.item];
    const now = Date.now();
    return [
      {
        id: `preview-item:${preview.id}`,
        item: preview.item,
        from: "preview-0",
        target: "preview-1",
        time: now,
        createdAt: now,
        duration: item.duration,
        seed: preview.id,
        density: 1,
        caption: item.name,
      },
    ];
  }, [preview]);
  const toast = (definition: AchievementDefinition) => {
    const now = Date.now();
    setToasts([
      {
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
          seatName: "甲",
          replayFingerprint: `preview:${definition.id}:${now}`,
          summary: "成就验收",
        },
      },
    ]);
  };
  const stage = (definition: AchievementDefinition) =>
    setPreview((value) => ({
      id: (value?.id ?? 0) + 1,
      kind: "achievement",
      rarity: definition.rarity,
      title: definition.title,
      symbol: definition.symbol,
    }));
  const selected = preview;
  const groups = [
    ...gameKinds.map((kind) => ({
      key: kind,
      label: gameCatalogue[kind].name,
      items: achievementDefinitions.filter(
        (definition) => definition.game === kind,
      ),
    })),
    {
      key: "app",
      label: "软件",
      items: achievementDefinitions.filter(
        (definition) => definition.game === "app",
      ),
    },
  ];
  return (
    <main className={`app-shell ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <h1>舞台与成就验收</h1>
          <p>
            普通和稀有成就只显示聊天卡片；史诗、传说、神话触发舞台动画。
            下面可以逐个验收所有成就、弹窗、聊天卡片和派对特效。
          </p>
        </div>
        <Button onClick={() => setPreview(null)}>清空舞台</Button>
      </header>

      <section className={styles.section}>
        <h2>成就舞台</h2>
        <div className={styles.actions}>
          {rarities.map((rarity) => (
            <Button
              key={rarity}
              variant={
                selected?.kind === "achievement" && selected.rarity === rarity
                  ? "primary"
                  : "secondary"
              }
              onClick={() =>
                setPreview((value) => ({
                  id: (value?.id ?? 0) + 1,
                  kind: "achievement",
                  rarity,
                  title: `${achievementRarityNames[rarity]}成就`,
                  symbol: "🏆",
                }))
              }
            >
              {achievementRarityNames[rarity]}
            </Button>
          ))}
        </div>
      </section>

      {card && (
        <section className={styles.section}>
          <h2>聊天卡片预览</h2>
          <div className={styles.cardPreview}>
            <ChatMessageView
              message={{
                type: "achievement",
                text: `甲 达成了「${card.title}」成就`,
                achievementId: card.id,
                title: card.title,
                symbol: card.symbol,
                rarity: card.rarity,
                game: card.game,
                id: `card:${card.id}`,
                sequence: 1,
                sender: "preview-0",
                name: "甲",
                time: Date.now(),
              }}
              ownId="preview-0"
              serverTime={Date.now()}
            />
          </div>
        </section>
      )}

      {groups.map((group) => (
        <section className={styles.section} key={group.key}>
          <h2>{group.label}</h2>
          <div className={styles.achievementList}>
            {group.items.map((definition) => (
              <article
                className={styles.achievementRow}
                key={definition.id}
                data-rarity={definition.rarity}
                style={
                  {
                    "--rarity-color":
                      achievementRarityColors[definition.rarity],
                  } as CSSProperties
                }
              >
                <span className={styles.achievementSymbol} aria-hidden="true">
                  {definition.symbol}
                </span>
                <div className={styles.achievementCopy}>
                  <strong>{definition.title}</strong>
                  <small>
                    {achievementRarityNames[definition.rarity]} ·{" "}
                    {definition.description}
                  </small>
                </div>
                <div className={styles.achievementActions}>
                  <Button onClick={() => toast(definition)}>弹窗</Button>
                  <Button onClick={() => setCard(definition)}>卡片</Button>
                  <Button
                    disabled={!hasStage(definition.rarity)}
                    onClick={() => stage(definition)}
                  >
                    舞台
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {categories.map((category) => {
        const items = Object.entries(partyItems).filter(
          ([, item]) => item.category === category,
        );
        return (
          <section className={styles.section} key={category}>
            <h2>{category}</h2>
            <div className={styles.grid}>
              {items.map(([id, item]) => (
                <Button
                  key={id}
                  variant={
                    selected?.kind === "item" && selected.item === id
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() =>
                    setPreview((value) => ({
                      id: (value?.id ?? 0) + 1,
                      kind: "item",
                      item: id as PartyItemId,
                    }))
                  }
                >
                  <span aria-hidden="true">{item.emoji}</span> {item.name}
                </Button>
              ))}
            </div>
          </section>
        );
      })}

      <AchievementToasts
        items={toasts}
        onDismiss={(id) =>
          setToasts((value) =>
            value.filter((item) => item.achievementId !== id),
          )
        }
      />
      <PartyRuntime
        snapshot={snapshot}
        stageEvents={stageEvents}
        preferences={defaultPreferences}
        mobile={false}
        preview
      />
    </main>
  );
}
