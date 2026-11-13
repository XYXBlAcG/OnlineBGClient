import type { ChatMessage } from "../../domain/social";
import type { PartyEvent, PartyPattern } from "../../domain/party";
import type { AchievementRarity } from "../../domain/achievement-types";
import {
  achievementRarityColors,
  achievementRarityNames,
} from "../../domain/achievement-types";
import type { PartySceneId } from "../../domain/party/stage";

type AchievementMessage = Extract<ChatMessage, { type: "achievement" }>;
type StageRarity = Exclude<AchievementRarity, "common" | "rare">;

function hasStage(rarity: AchievementRarity): rarity is StageRarity {
  return rarity !== "common" && rarity !== "rare";
}

const stageStyle: Record<
  StageRarity,
  {
    scene: PartySceneId;
    item: PartyEvent["item"];
    pattern: PartyPattern;
    duration: number;
    density: number;
    scale: number;
    room: boolean;
  }
> = {
  epic: {
    scene: "achievementEpic",
    item: "rainbowRocket",
    pattern: "orbit",
    duration: 6000,
    density: 1.1,
    scale: 1.1,
    room: false,
  },
  legendary: {
    scene: "achievementLegendary",
    item: "dominionCrown",
    pattern: "beam",
    duration: 7200,
    density: 1.2,
    scale: 1.15,
    room: true,
  },
  mythic: {
    scene: "achievementMythic",
    item: "meteors",
    pattern: "waves",
    duration: 9000,
    density: 1.4,
    scale: 1.25,
    room: true,
  },
};

function seedOf(value: string): number {
  let seed = 2166136261;
  for (const character of value)
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  return seed;
}

function isAchievement(
  message: ChatMessage,
): message is AchievementMessage & { rarity: StageRarity } {
  return message.type === "achievement" && hasStage(message.rarity);
}

export function achievementStageEvents(
  chat: ChatMessage[],
  serverTime: number,
): PartyEvent[] {
  const recent = chat
    .filter(
      (message): message is AchievementMessage & { rarity: StageRarity } =>
        isAchievement(message) &&
        message.time <= serverTime + 5000 &&
        serverTime - message.time <= 15000,
    )
    .slice(-4);
  let cursor = 0;
  return recent.map((message) => {
    const style = stageStyle[message.rarity];
    const time = Math.max(message.time, cursor ? cursor + 350 : message.time);
    cursor = time + style.duration;
    return {
      id: `achievement-stage:${message.id}`,
      item: style.item,
      from: message.sender,
      target: message.sender,
      time,
      createdAt: message.time,
      duration: style.duration,
      seed: seedOf(message.id),
      density: style.density,
      caption: `${message.name} · ${achievementRarityNames[message.rarity]}`,
      audience: style.room ? "table" : undefined,
      visual: {
        scope: style.room ? "room" : "target",
        scene: style.scene,
        particle: "emoji",
        name: message.title.slice(0, 32),
        emoji: message.symbol,
        color: achievementRarityColors[message.rarity],
        duration: style.duration,
        pattern: style.pattern,
        density: style.density,
        scale: style.scale,
        speed: 1,
      },
      plugin: {
        id: "achievement",
        version: "1",
        effect: message.rarity,
      },
    };
  });
}
