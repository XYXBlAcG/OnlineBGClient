import { pathToFileURL } from "node:url";

const config = JSON.parse(process.argv[2]);
const {
  ExpeditionAdventure,
  ExpeditionStrategy,
  allCards,
  chapters,
  evaluateExpeditionRun,
} = await import(
  pathToFileURL(`${process.cwd()}/.tmp/expedition-difficulty/runtime.mjs`)
);

const progressOf = (view) =>
    chapters
      .slice(0, view.chapter)
      .reduce((sum, chapter) => sum + chapter.depth, 0) +
    Math.max(0, view.floor + 1),
  resourceValue = (snapshot) =>
    snapshot.heroes.reduce(
      (sum, hero) =>
        sum +
        (hero.maxHp ? (hero.hp / hero.maxHp) * 36 : 0) +
        hero.cards * 1.8 +
        hero.relics.length * 4.5 +
        hero.gold * 0.05,
      0,
    ) +
    snapshot.compass * 4 +
    snapshot.companions.filter((companion) => companion.status === "active")
      .length *
      10,
  runs = [];

for (const seed of config.seeds) {
  let serial = 0;
  const rules = new ExpeditionAdventure(() => {
      serial++;
      return (
        ((((seed + 1) * 9301 +
          (config.ascension + 1) * 271 +
          (config.modeIndex + 1) * 7919 +
          serial * 49297) %
          233280) +
          233280) %
        233280 /
        233280
      );
    }),
    strategy = new ExpeditionStrategy(config.style),
    nodeValues = [],
    nodeKinds = [];
  let current = rules.create(config.players, false, {
      expedition: {
        difficulty: config.difficulty,
        ascension: config.ascension,
      },
    }),
    steps = 0,
    previousResult = -1,
    stalled = false;
  const runStarted = performance.now();
  while (!rules.finished(current) && steps++ < config.maxSteps) {
    const actor = rules.actors(current)[0];
    if (actor === undefined) {
      stalled = true;
      break;
    }
    const request = {
        observation: rules.project(current, actor),
        actor,
        difficulty: "hard",
        seed: `difficulty:${config.difficulty}:${config.ascension}:${config.players}:${seed}:${steps}`,
        audit: false,
      },
      decision = strategy
        .score(request, strategy.candidates(request))
        .sort((left, right) => right.score - left.score)[0];
    if (!decision) {
      stalled = true;
      break;
    }
    current = rules.apply(current, actor, decision.action);
    if (
      current.view.lastNodeResult &&
      current.view.lastNodeResult.sequence !== previousResult
    ) {
      const result = current.view.lastNodeResult;
      nodeValues.push(
        resourceValue(result.after) - resourceValue(result.before),
      );
      nodeKinds.push(result.nodeKind);
      previousResult = result.sequence;
    }
  }
  const heroes = current.view.combat.heroes,
    sample = {
      difficulty: config.difficulty,
      ascension: config.ascension,
      players: config.players,
      seed,
      won: current.view.phase === "won",
      stalled,
      steps,
      elapsedMs: Math.round(performance.now() - runStarted),
      chapter: current.view.chapter,
      floor: current.view.floor,
      progress: progressOf(current.view),
      phase: current.view.phase,
      heroHp: heroes.reduce((sum, hero) => sum + hero.hp, 0),
      heroMaxHp: heroes.reduce((sum, hero) => sum + hero.maxHp, 0),
      gold: heroes.reduce((sum, hero) => sum + hero.gold, 0),
      cards: heroes.reduce((sum, hero) => sum + allCards(hero).length, 0),
      upgrades: heroes.reduce(
        (sum, hero) =>
          sum +
          allCards(hero).reduce(
            (cards, card) => cards + card.upgradeLevel,
            0,
          ),
        0,
      ),
      relics: heroes.reduce((sum, hero) => sum + hero.relics.length, 0),
      companions: current.view.companions.filter(
        (companion) => companion.active,
      ).length,
      companionsLost: current.view.companions.filter(
        (companion) => !companion.active,
      ).length,
      shopSealed: current.view.shopsSealed,
      compass: current.view.compass,
      healthLost: current.view.combat.metrics.healthLost,
      damage: current.view.combat.metrics.damage,
      battlesWon: current.view.combat.metrics.battlesWon,
      rounds: current.view.combat.metrics.rounds,
      nodeValues,
      nodeKinds,
    };
  sample.score = evaluateExpeditionRun(sample);
  runs.push(sample);
}

process.stdout.write(JSON.stringify({ runs }));
