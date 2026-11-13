import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const fixtureRoot = resolve(".tmp/ui-audit/fixtures");
const fixtureEntries = [
  "src/domain/room.ts",
  "src/domain/catalogue.ts",
  "src/server/storage.ts",
];

let fixtureModulesPromise;

export function loadFixtureModules() {
  fixtureModulesPromise ??= buildFixtureModules();
  return fixtureModulesPromise;
}

async function buildFixtureModules() {
  await mkdir(fixtureRoot, { recursive: true });
  await build({
    entryPoints: fixtureEntries,
    outdir: fixtureRoot,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "error",
  });
  const load = (file) => import(pathToFileURL(join(fixtureRoot, file)).href);
  const [roomModule, catalogueModule, storageModule] = await Promise.all([
    load("domain/room.js"),
    load("domain/catalogue.js"),
    load("server/storage.js"),
  ]);
  return {
    Room: roomModule.Room,
    RoomStore: storageModule.RoomStore,
    catalogue: catalogueModule.gameCatalogue,
    gameKinds: [...catalogueModule.gameKinds],
  };
}

export function seatPlan(definition) {
  const seats = Math.max(2, definition.minPlayers);
  return {
    humans: 1,
    ai: Array.from({ length: seats - 1 }, () => ({
      difficulty: "normal",
    })),
  };
}

export const fixtureRoomId = (kind) => `u-${kind}`;

export async function createRoomFixtures({ directory, kinds, catalogue }) {
  const { Room, RoomStore } = await loadFixtureModules();
  const store = new RoomStore(join(directory, "rooms.sqlite"));
  const fixtures = new Map();
  try {
    for (const kind of kinds) {
      const definition = catalogue[kind];
      const plan = seatPlan(definition);
      const id = fixtureRoomId(kind);
      const room = new Room(
        id,
        {
          kind,
          humans: plan.humans,
          ai: plan.ai,
          team: false,
          training: false,
          aiDelayMs: 5000,
        },
        id,
      );
      const tokens = Array.from({ length: plan.humans }, (_, index) =>
        room.claim(`玩家${index + 1}`),
      );
      room.seats.forEach((seat) => {
        seat.ready = true;
      });
      room.start(tokens[0]);
      store.save(room);
      fixtures.set(id, {
        kind,
        token: tokens[0],
        humans: plan.humans,
        seats: room.seats.length,
      });
    }
  } finally {
    store.close();
  }
  return fixtures;
}
