import { expect, it } from "vitest";
import { preferencesSchema } from "../src/client/preferences";
it("disables achievement stage by default without disabling sharing", () => {
  const preferences = preferencesSchema.parse({
    theme: "dark",
    shareAchievements: true,
  });
  expect(preferences.achievementStage).toBe(false);
  expect(preferences.shareAchievements).toBe(true);
});

import { createPracticeSession } from "../src/client/practice-room";
import {
  advanceMahjongLesson,
  initialMahjongLesson,
  mahjongLesson,
} from "../src/client/mahjong/practice-lesson";
import { configSchema } from "../src/domain/protocol";
it("advances the Sichuan lesson only after successful actual exchange and lack actions", () => {
  const session = createPracticeSession(
    configSchema.parse({
      kind: "scmj",
      team: false,
      training: false,
      humans: 1,
      ai: [
        { difficulty: "easy" },
        { difficulty: "easy" },
        { difficulty: "easy" },
      ],
    }),
  );
  let progress = initialMahjongLesson;
  expect(
    mahjongLesson(session.room.snapshot(session.token), progress)?.stage,
  ).toBe(0);
  const action = session.room.snapshot(session.token).candidates[0].action;
  session.room.act(session.token, "exchange", session.room.version, action);
  progress = advanceMahjongLesson(progress, action);
  expect(progress.exchange).toBe(true);
  expect(
    mahjongLesson(session.room.snapshot(session.token), progress)?.stage,
  ).toBe(1);
  expect(initialMahjongLesson.exchange).toBe(false);
});
