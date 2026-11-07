import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const outputRoot = "artifacts/expedition-difficulty";
await mkdir(".tmp/expedition-difficulty", { recursive: true });
await mkdir(join(outputRoot, "charts"), { recursive: true });
await build({
  stdin: {
    contents: `
      export { ExpeditionAdventure } from './src/domain/expedition/adventure';
      export { ExpeditionStrategy } from './src/domain/expedition/ai';
      export { allCards } from './src/domain/expedition/rules';
      export { chapters } from './src/domain/expedition/chapters';
      export { evaluateExpeditionRun, conditionalValueAtRisk } from './analysis/expedition-experience/model';
    `,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/expedition-difficulty/report.mjs",
  logLevel: "error",
});

const {
    ExpeditionAdventure,
    ExpeditionStrategy,
    allCards,
    chapters,
    evaluateExpeditionRun,
    conditionalValueAtRisk,
  } = await import(
    pathToFileURL(`${process.cwd()}/.tmp/expedition-difficulty/report.mjs`)
  ),
  readArg = (name, fallback) =>
    process.env[name] ??
    process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1] ??
    fallback,
  difficulties = readArg(
    "EXPEDITION_DIFFICULTY_MODES",
    "story,standard,challenge",
  ).split(","),
  ascensions = readArg("EXPEDITION_DIFFICULTY_ASCENSIONS", "0,1,2,3,4,5,6,7,8,9,10")
    .split(",")
    .map(Number),
  playersList = readArg("EXPEDITION_DIFFICULTY_PLAYERS", "1")
    .split(",")
    .map(Number),
  seedCount = Number(readArg("EXPEDITION_DIFFICULTY_SEEDS", "16")),
  style = readArg("EXPEDITION_DIFFICULTY_STYLE", "adaptive"),
  difficultyNames = {
    story: "旅途",
    standard: "标准",
    challenge: "挑战",
  },
  difficultyColors = {
    story: "#3a8f72",
    standard: "#4169aa",
    challenge: "#b44d46",
  };

const mean = (values) =>
    values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0,
  percentile = (values, ratio) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((left, right) => left - right),
      index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.floor((sorted.length - 1) * ratio)),
      );
    return sorted[index];
  },
  round = (value, digits = 1) => Number(value.toFixed(digits)),
  escapeXml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;"),
  progressOf = (view) =>
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
      10;

const runs = [],
  startedAt = new Date();
for (const difficulty of difficulties)
  for (const ascension of ascensions)
    for (const players of playersList) {
      const configRuns = [];
      for (let seed = 0; seed < seedCount; seed++) {
        let serial = 0;
        const rules = new ExpeditionAdventure(() => {
            serial++;
            return (
              ((((seed + 1) * 9301 +
                (ascension + 1) * 271 +
                (difficulties.indexOf(difficulty) + 1) * 7919 +
                serial * 49297) %
                233280) +
                233280) %
              233280 /
              233280
            );
          }),
          strategy = new ExpeditionStrategy(style),
          initial = rules.create(players, false, {
            expedition: { difficulty, ascension },
          }),
          nodeValues = [],
          nodeKinds = [];
        let current = initial,
          steps = 0,
          previousResult = -1,
          stalled = false;
        const runStarted = performance.now();
        while (!rules.finished(current) && steps++ < 12000) {
          const actor = rules.actors(current)[0];
          if (actor === undefined) {
            stalled = true;
            break;
          }
          const request = {
              observation: rules.project(current, actor),
              actor,
              difficulty: "hard",
              seed: `difficulty:${difficulty}:${ascension}:${players}:${seed}:${steps}`,
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
        const elapsedMs = performance.now() - runStarted,
          heroes = current.view.combat.heroes,
          heroHp = heroes.reduce((sum, hero) => sum + hero.hp, 0),
          heroMaxHp = heroes.reduce((sum, hero) => sum + hero.maxHp, 0),
          sample = {
            difficulty,
            ascension,
            players,
            seed,
            won: current.view.phase === "won",
            stalled,
            steps,
            elapsedMs: round(elapsedMs, 0),
            chapter: current.view.chapter,
            floor: current.view.floor,
            progress: progressOf(current.view),
            phase: current.view.phase,
            heroHp,
            heroMaxHp,
            gold: heroes.reduce((sum, hero) => sum + hero.gold, 0),
            cards: heroes.reduce(
              (sum, hero) => sum + allCards(hero).length,
              0,
            ),
            upgrades: heroes.reduce(
              (sum, hero) =>
                sum +
                allCards(hero).reduce(
                  (cards, card) => cards + card.upgradeLevel,
                  0,
                ),
              0,
            ),
            relics: heroes.reduce(
              (sum, hero) => sum + hero.relics.length,
              0,
            ),
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
        configRuns.push(sample);
      }
      process.stdout.write(
        `${difficultyNames[difficulty]} N${ascension} ${players}p: ${configRuns.filter((run) => run.won).length}/${configRuns.length} 胜利\n`,
      );
    }

const grouped = new Map();
for (const run of runs) {
  const key = `${run.difficulty}:${run.ascension}:${run.players}`,
    group = grouped.get(key) ?? [];
  group.push(run);
  grouped.set(key, group);
}
const summaries = [...grouped].map(([key, group]) => {
  const [difficulty, ascension, players] = key.split(":"),
    utilities = group.map((run) => run.score.utility),
    losses = group.filter((run) => !run.won);
  return {
    difficulty,
    difficultyName: difficultyNames[difficulty],
    ascension: Number(ascension),
    players: Number(players),
    runs: group.length,
    wins: group.filter((run) => run.won).length,
    winRate: round(
      group.filter((run) => run.won).length / Math.max(1, group.length),
      3,
    ),
    stalled: group.filter((run) => run.stalled).length,
    reward: round(mean(group.map((run) => run.score.reward))),
    risk: round(mean(group.map((run) => run.score.risk))),
    utility: round(mean(utilities)),
    cvar: round(conditionalValueAtRisk(utilities)),
    progress: round(mean(group.map((run) => run.progress))),
    progressP50: percentile(
      group.map((run) => run.progress),
      0.5,
    ),
    progressP90: percentile(
      group.map((run) => run.progress),
      0.9,
    ),
    healthRatio: round(
      mean(
        group.map((run) =>
          run.heroMaxHp ? run.heroHp / run.heroMaxHp : 0,
        ),
      ),
      3,
    ),
    healthLost: round(mean(group.map((run) => run.healthLost))),
    rounds: round(mean(group.map((run) => run.rounds))),
    battles: round(mean(group.map((run) => run.battlesWon))),
    relics: round(mean(group.map((run) => run.relics))),
    cards: round(mean(group.map((run) => run.cards))),
    upgrades: round(mean(group.map((run) => run.upgrades))),
    gold: round(mean(group.map((run) => run.gold))),
    companions: round(mean(group.map((run) => run.companions))),
    shopSealed: round(
      group.filter((run) => run.shopSealed).length / Math.max(1, group.length),
      3,
    ),
    lossProgress: round(
      mean(losses.map((run) => run.progress)),
    ),
    elapsedMs: round(mean(group.map((run) => run.elapsedMs)), 0),
  };
});

const dimensions = [
    ...new Set(
      summaries.map((item) => `${item.difficulty}:${item.players}`),
    ),
  ],
  lineChart = ({
    title,
    value,
    suffix = "",
    maximum,
    minimum,
  }) => {
    const width = 980,
      height = 470,
      padding = 62,
      max = maximum ?? Math.max(...summaries.map(value), 1),
      min = minimum ?? Math.min(...summaries.map(value), 0),
      range = Math.max(1, max - min),
      x = (ascension) =>
        padding +
        (ascension / Math.max(1, Math.max(...ascensions))) *
          (width - padding * 2),
      y = (number) =>
        height -
        padding -
        ((number - min) / range) * (height - padding * 2),
      grids = Array.from({ length: 6 }, (_, index) => {
        const ratio = index / 5,
          gy = height - padding - ratio * (height - padding * 2),
          gridValue = min + ratio * range;
        return `<line x1="${padding}" y1="${round(gy)}" x2="${width - padding}" y2="${round(gy)}" stroke="#dfe4e1"/>
          <text x="${padding - 10}" y="${round(gy + 4)}" text-anchor="end" font-size="10">${round(gridValue)}${suffix}</text>`;
      }).join(""),
      lines = dimensions
        .map((dimension) => {
          const [difficulty, players] = dimension.split(":"),
            playerIndex = playersList.indexOf(Number(players)),
            rows = summaries
              .filter(
                (item) =>
                  item.difficulty === difficulty &&
                  String(item.players) === players,
              )
              .sort((left, right) => left.ascension - right.ascension);
          return `<polyline fill="none" stroke="${difficultyColors[difficulty]}" stroke-width="3" ${playerIndex ? 'stroke-dasharray="8 5"' : ""} points="${rows
            .map(
              (item) =>
                `${round(x(item.ascension))},${round(y(value(item)))}`,
            )
            .join(" ")}"/>
            ${rows
              .map(
                (item) =>
                  `<circle cx="${round(x(item.ascension))}" cy="${round(y(value(item)))}" r="4" fill="${difficultyColors[difficulty]}"/>`,
              )
              .join("")}`;
        })
        .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">
      <rect width="${width}" height="${height}" fill="#f8f6f0"/>
      ${grids}
      ${lines}
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#59645f"/>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#59645f"/>
      ${ascensions
        .map(
          (ascension) =>
            `<text x="${round(x(ascension))}" y="${height - padding + 22}" text-anchor="middle" font-size="10">N${ascension}</text>`,
        )
        .join("")}
      ${Object.entries(difficultyNames)
        .map(
          ([difficulty, name], index) =>
            `<circle cx="${padding + 100 + index * 100}" cy="24" r="5" fill="${difficultyColors[difficulty]}"/><text x="${padding + 111 + index * 100}" y="28" font-size="12">${name}</text>`,
        )
        .join("")}
      <text x="${width - padding}" y="28" text-anchor="end" font-size="10">${playersList.map((players, index) => `${players}人 ${index ? "虚线" : "实线"}`).join(" · ")}</text>
    </svg>`;
  },
  matrixChart = (metric, title, display = (value) => round(value)) => {
    const width = 1040,
      cellWidth = 78,
      cellHeight = 50,
      left = 95,
      top = 48,
      max = Math.max(
        ...summaries
          .filter((item) => item.players === playersList[0])
          .map((item) => item[metric]),
        0.001,
      );
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${top + difficulties.length * cellHeight + 30}" role="img" aria-label="${escapeXml(title)}">
      <rect width="${width}" height="${top + difficulties.length * cellHeight + 30}" fill="#f8f6f0"/>
      ${ascensions
        .map(
          (ascension, index) =>
            `<text x="${left + index * cellWidth + cellWidth / 2}" y="28" text-anchor="middle" font-size="11">N${ascension}</text>`,
        )
        .join("")}
      ${difficulties
        .map((difficulty, row) => {
          const labelY = top + row * cellHeight + 31;
          return `<text x="${left - 12}" y="${labelY}" text-anchor="end" font-size="12">${difficultyNames[difficulty]}</text>
            ${ascensions
              .map((ascension, column) => {
                const item = summaries.find(
                    (candidate) =>
                      candidate.difficulty === difficulty &&
                      candidate.ascension === ascension &&
                      candidate.players === playersList[0],
                  ),
                  rawValue = item?.[metric] ?? 0,
                  value = display(rawValue),
                  alpha = 0.12 + (rawValue / Math.max(0.001, max)) * 0.78;
                return `<rect x="${left + column * cellWidth}" y="${top + row * cellHeight}" width="${cellWidth - 4}" height="${cellHeight - 4}" rx="5" fill="${difficultyColors[difficulty]}" fill-opacity="${round(alpha, 3)}"/>
                  <text x="${left + column * cellWidth + cellWidth / 2 - 2}" y="${top + row * cellHeight + 29}" text-anchor="middle" font-size="11" fill="${alpha > 0.55 ? "#fff" : "#26332f"}">${value}</text>`;
              })
              .join("")}`;
        })
        .join("")}
    </svg>`;
  };

const charts = {
    "win-rate.svg": lineChart({
      title: "N0-N10 胜率",
      value: (item) => item.winRate * 100,
      suffix: "%",
      maximum: 100,
    }),
    "progress.svg": lineChart({
      title: "N0-N10 平均推进层数",
      value: (item) => item.progress,
    }),
    "utility.svg": lineChart({
      title: "N0-N10 综合效用",
      value: (item) => item.utility,
    }),
    "risk.svg": lineChart({
      title: "N0-N10 平均风险",
      value: (item) => item.risk,
      maximum: 100,
    }),
    "win-rate-matrix.svg": matrixChart(
      "winRate",
      "N0-N10 难度胜率矩阵",
      (value) => `${Math.round(value * 100)}%`,
    ),
    "risk-matrix.svg": matrixChart("risk", "N0-N10 难度风险矩阵"),
  },
  generatedAt = new Date();
for (const [file, source] of Object.entries(charts))
  await writeFile(join(outputRoot, "charts", file), source);

const markdownRows = summaries
    .map(
      (item) =>
        `| ${item.difficultyName} | N${item.ascension} | ${item.players} | ${item.wins}/${item.runs} | ${Math.round(item.winRate * 100)}% | ${item.reward} | ${item.risk} | ${item.utility} | ${item.cvar} | ${item.progress} | ${item.healthLost} | ${item.rounds} | ${item.relics} |`,
    )
    .join("\n"),
  winRateMatrix = difficulties
    .map((difficulty) => {
      const cells = ascensions.map((ascension) => {
        const item = summaries.find(
          (candidate) =>
            candidate.difficulty === difficulty &&
            candidate.ascension === ascension &&
            candidate.players === playersList[0],
        );
        return `${Math.round((item?.winRate ?? 0) * 100)}%`;
      });
      return `| ${difficultyNames[difficulty]} | ${cells.join(" | ")} |`;
    })
    .join("\n"),
  utilityMatrix = difficulties
    .map((difficulty) => {
      const cells = ascensions.map((ascension) => {
        const item = summaries.find(
          (candidate) =>
            candidate.difficulty === difficulty &&
            candidate.ascension === ascension &&
            candidate.players === playersList[0],
        );
        return String(item?.utility ?? 0);
      });
      return `| ${difficultyNames[difficulty]} | ${cells.join(" | ")} |`;
    })
    .join("\n"),
  anomalies = difficulties.flatMap((difficulty) => {
    const rows = summaries
      .filter(
        (item) =>
          item.difficulty === difficulty && item.players === playersList[0],
      )
      .sort((left, right) => left.ascension - right.ascension);
    return rows.flatMap((item, index) => {
      if (!index) return [];
      const previous = rows[index - 1],
        flags = [];
      if (item.winRate > previous.winRate + 0.05)
        flags.push(
          `胜率从 N${previous.ascension} 的 ${Math.round(previous.winRate * 100)}% 回升到 ${Math.round(item.winRate * 100)}%`,
        );
      if (item.utility > previous.utility + 3)
        flags.push("综合效用逆势上升");
      return flags.map(
        (flag) => `- ${difficultyName(difficulty)} N${item.ascension}：${flag}`,
      );
    });
  }),
  easiest = [...summaries].sort(
    (left, right) => right.utility - left.utility,
  )[0],
  hardest = [...summaries].sort(
    (left, right) => left.utility - right.utility,
  )[0];

function difficultyName(difficulty) {
  return difficultyNames[difficulty] ?? difficulty;
}

const report = `# 秘塔远征 N0–N10 难度报告

生成时间：${generatedAt.toISOString()}

- AI 策略：\`${style}\`
- 难度：${difficulties.map(difficultyName).join("、")}
- 阶位：N0–N10
- 玩家人数：${playersList.join("、")}
- 每组固定种子：${seedCount}
- 总运行数：${runs.length}

## 胜率矩阵

| 难度 | ${ascensions.map((ascension) => `N${ascension}`).join(" | ")} |
|---|${ascensions.map(() => "---:").join("|")}|
${winRateMatrix}

## 综合效用矩阵

效用 = 收益 − 0.35 × 风险。

| 难度 | ${ascensions.map((ascension) => `N${ascension}`).join(" | ")} |
|---|${ascensions.map(() => "---:").join("|")}|
${utilityMatrix}

## 图表

### 胜率

![N0-N10 胜率](charts/win-rate.svg)

### 推进深度

![N0-N10 平均推进深度](charts/progress.svg)

### 综合效用

![N0-N10 综合效用](charts/utility.svg)

### 风险

![N0-N10 风险](charts/risk.svg)

### 胜率热力图

![胜率热力图](charts/win-rate-matrix.svg)

### 风险热力图

![风险热力图](charts/risk-matrix.svg)

## 详细数据

| 难度 | 阶位 | 人数 | 胜利 | 胜率 | 收益 | 风险 | 效用 | CVaR | 平均推进 | 平均承伤 | 战斗轮数 | 遗物 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${markdownRows}

## 自动结论

- 综合体验最高：${easiest.difficultyName} N${easiest.ascension}，效用 ${easiest.utility}。
- 综合体验最低：${hardest.difficultyName} N${hardest.ascension}，效用 ${hardest.utility}。
- 停滞运行：${runs.filter((run) => run.stalled).length} 次。
${anomalies.length ? `\n### 非单调或异常回升\n\n${anomalies.join("\n")}` : "\n未检测到超过阈值的胜率或效用逆势上升。"}

## 复现

默认运行：

\`\`\`bash
npm run analyze:expedition-difficulty
\`\`\`

扩大样本：

\`\`\`bash
EXPEDITION_DIFFICULTY_SEEDS=64 \\
EXPEDITION_DIFFICULTY_PLAYERS=1,2 \\
npm run analyze:expedition-difficulty
\`\`\`

指定范围：

\`\`\`bash
EXPEDITION_DIFFICULTY_MODES=standard,challenge \\
EXPEDITION_DIFFICULTY_ASCENSIONS=0,5,10 \\
EXPEDITION_DIFFICULTY_SEEDS=32 \\
npm run analyze:expedition-difficulty
\`\`\`

## 解释边界

本报告使用公开信息的启发式 AI 和固定种子，不等同于真人胜率。主要用于发现难度断层、非单调阶位、资源膨胀、战斗拖长和路线偏差。真人操作、动画观感与触控体验仍需手动验收。
`;

await Promise.all([
  writeFile(
    join(outputRoot, "results.json"),
    JSON.stringify(
      {
        generatedAt: generatedAt.toISOString(),
        configuration: {
          style,
          difficulties,
          ascensions,
          players: playersList,
          seedCount,
        },
        summaries,
        runs,
      },
      null,
      2,
    ),
  ),
  writeFile(join(outputRoot, "report.md"), report),
]);
process.stdout.write(`\n${join(outputRoot, "report.md")}\n`);
