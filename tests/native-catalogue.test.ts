import { describe, expect, it } from "vitest";
import { gameCatalogue, gameKinds } from "../src/domain/catalogue";
import { nativeCatalogue } from "../scripts/native-catalogue";
import { localRoomConfigFromParams } from "../src/client/mobile/local-room";

describe("native game catalogue", () => {
  it("derives every game and its capabilities from the shared catalogue", () => {
    expect(nativeCatalogue.map((game) => game.id)).toEqual(gameKinds);
    for (const game of nativeCatalogue) {
      expect(game).toMatchObject({
        ...gameCatalogue[game.id],
        subtitle: gameCatalogue[game.id].description,
      });
    }
    expect(nativeCatalogue.find((game) => game.id === "ddz")?.ai).toBe(true);
    expect(nativeCatalogue.find((game) => game.id === "pool")?.category).toBe(
      "体育",
    );
  });

  it("passes every generated choice through the actual room schema", () => {
    for (const game of nativeCatalogue) {
      for (const field of game.fields) {
        for (const choice of field.choices) {
          const options = structuredClone(game.defaults) as Record<
            string,
            Record<string, unknown>
          >;
          options[field.group][field.key] =
            field.format === "number"
              ? Number(choice.value)
              : field.format === "boolean"
                ? choice.value === "true"
                : field.format === "strings"
                  ? choice.value.split(",")
                  : choice.value;
          if (field.format === "strings") continue;
          const params = new URLSearchParams({
            gameOptions: JSON.stringify(options),
          });
          const config = localRoomConfigFromParams(game.id, params);
          expect(
            (config[field.group] as Record<string, unknown>)[field.key],
          ).toEqual(options[field.group][field.key]);
        }
      }
    }
  });

  it("rejects invalid native options instead of silently starting another mode", () => {
    expect(() =>
      localRoomConfigFromParams(
        "scmj",
        new URLSearchParams({
          gameOptions: JSON.stringify({ mahjong: { mode: "invalid" } }),
        }),
      ),
    ).toThrow();
  });
});

it.skipIf(process.platform !== "darwin")(
  "decodes the generated resource in Swift and returns typed game options",
  async () => {
    const { execFileSync } = await import("node:child_process");
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const root = await mkdtemp(join(tmpdir(), "native-catalogue-"));
    try {
      const resource = join(root, "catalogue.json");
      await writeFile(resource, JSON.stringify(nativeCatalogue));
      const binary = join(root, "catalogue");
      execFileSync(
        "xcrun",
        [
          "swiftc",
          "-module-cache-path",
          join(root, "cache"),
          "ios-native/OnlineBGShell/ShellCatalogue.swift",
          "tests/swift/native-catalogue.swift",
          "-o",
          binary,
        ],
        { stdio: "pipe", timeout: 120000 },
      );
      const payloads = JSON.parse(
        execFileSync(binary, [resource], { encoding: "utf8" }),
      ) as { kind: (typeof gameKinds)[number]; options: string }[];
      for (const payload of payloads) {
        const config = localRoomConfigFromParams(
          payload.kind,
          new URLSearchParams({ gameOptions: payload.options }),
        );
        for (const [group, options] of Object.entries(
          JSON.parse(payload.options),
        )) {
          expect(config[group as "pool"]).toMatchObject(options as object);
        }
      }
      expect(payloads.length).toBeGreaterThan(50);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  150000,
);

it("starts native-selected modes in authoritative rooms with matching seats", async () => {
  const { Room } = await import("../src/domain/room");
  for (const [kind, group, mode] of [
    ["pool", "pool", "eight-ball"],
    ["pool", "pool", "nine-ball"],
    ["pool", "pool", "party"],
    ["scmj", "mahjong", "riichi"],
    ["scmj", "mahjong", "washizu"],
    ["scmj", "mahjong", "sichuan"],
  ] as const) {
    const game = nativeCatalogue.find((game) => game.id === kind)!;
    const range = game.seatRanges.find((range) => range.when.mode === mode)!;
    const config = localRoomConfigFromParams(
      kind,
      new URLSearchParams({
        humans: "1",
        ai: String(range.min - 1),
        gameOptions: JSON.stringify({ [group]: { mode } }),
      }),
    );
    const room = new Room(`native-${mode}`, config);
    const token = room.claim("玩家");
    room.seats.forEach((seat) => {
      seat.ready = true;
    });
    room.start(token);
    expect(room.state?.kind).toBe(kind);
    expect(room.seats.length).toBe(range.min);
    expect(config[group].mode).toBe(mode);
  }
});
