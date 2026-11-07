import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const outputRoot = "artifacts/expedition-experience";
await mkdir(".tmp/expedition-experience", { recursive: true });
await mkdir(outputRoot, { recursive: true });
await build({
  stdin: {
    contents: `
      export { ExpeditionAdventure } from './src/domain/expedition/adventure';
      export { ExpeditionStrategy } from './src/domain/expedition/ai';
      export { allCards } from './src/domain/expedition/rules';
      export { evaluateExpeditionRun, conditionalValueAtRisk } from './analysis/expedition-experience/model';
    `,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/expedition-experience/model.mjs",
  logLevel: "error",
});

const {
    ExpeditionAdventure,
    ExpeditionStrategy,
    allCards,
    evaluateExpeditionRun,
    conditionalValueAtRisk,
  } = await import(
    pathToFileURL(`${process.cwd()}/.tmp/expedition-experience/model.mjs`)
  ),
  styles = (
    process.env.EXPEDITION_ANALYSIS_STYLES ??
    "balanced,explorer,aggressive,cautious,gambler,recruiter,adaptive"
  ).split(","),
  ascensions = (
    process.env.EXPEDITION_ANALYSIS_ASCENSIONS ?? "0,5,10"
  )
    .split(",")
    .map(Number),
  seedCount = Number(process.env.EXPEDITION_ANALYSIS_SEEDS ?? 3),
  players = Number(process.env.EXPEDITION_ANALYSIS_PLAYERS ?? 1),
  difficulty = process.env.EXPEDITION_ANALYSIS_DIFFICULTY ?? "standard",
  styleNames = {
    balanced: "均衡",
    explorer: "裂隙回溯",
    aggressive: "精英猎杀",
    cautious: "稳健求生",
    gambler: "赌博爆发",
    recruiter: "招募伙伴",
    adaptive: "风险适应",
  },
  colors = {
    balanced: "#2c7a68",
    explorer: "#4c62a6",
    aggressive: "#b34a43",
    cautious: "#9a7a2f",
    gambler: "#84529a",
    recruiter: "#2e7f9f",
    adaptive: "#c16b2e",
  },
  samples = [];

const resourceValue = (snapshot) =>
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
  mean = (values) =>
    values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0,
  round = (value, digits = 1) => Number(value.toFixed(digits));

for (const style of styles)
  for (const ascension of ascensions)
    for (let seed = 0; seed < seedCount; seed++) {
      let serial = 0;
      const rules = new ExpeditionAdventure(() => {
          serial++;
          return (
            (((seed + ascension * 17 + 1) * 9301 + serial * 49297) %
              233280) /
            233280
          );
        }),
        strategy = new ExpeditionStrategy(style),
        state = rules.create(players, false, {
          expedition: { difficulty, ascension },
        }),
        nodeValues = [],
        routeKinds = [];
      let current = state,
        steps = 0,
        previousResult = -1;
      while (!rules.finished(current) && steps++ < 7000) {
        const actor = rules.actors(current)[0];
        if (actor === undefined) break;
        const request = {
            observation: rules.project(current, actor),
            actor,
            difficulty: "hard",
            seed: `analysis:${style}:${ascension}:${seed}:${steps}`,
            audit: false,
          },
          decision = strategy
            .score(request, strategy.candidates(request))
            .sort((left, right) => right.score - left.score)[0];
        if (!decision) break;
        current = rules.apply(current, actor, decision.action);
        if (
          current.view.lastNodeResult &&
          current.view.lastNodeResult.sequence !== previousResult
        ) {
          const result = current.view.lastNodeResult;
          nodeValues.push(
            resourceValue(result.after) - resourceValue(result.before),
          );
          routeKinds.push(result.nodeKind);
          previousResult = result.sequence;
        }
      }
      if (!rules.finished(current))
        throw new Error(
          `analysis run did not finish: ${style} N${ascension} seed ${seed}`,
        );
      samples.push({
        style,
        ascension,
        players,
        seed,
        won: current.view.phase === "won",
        chapter: current.view.chapter,
        floor: current.view.floor,
        heroHp: current.view.combat.heroes.reduce(
          (sum, hero) => sum + hero.hp,
          0,
        ),
        heroMaxHp: current.view.combat.heroes.reduce(
          (sum, hero) => sum + hero.maxHp,
          0,
        ),
        gold: current.view.combat.heroes.reduce(
          (sum, hero) => sum + hero.gold,
          0,
        ),
        cards: current.view.combat.heroes.reduce(
          (sum, hero) => sum + allCards(hero).length,
          0,
        ),
        upgrades: current.view.combat.heroes.reduce(
          (sum, hero) =>
            sum +
            allCards(hero).reduce(
              (cards, card) => cards + card.upgradeLevel,
              0,
            ),
          0,
        ),
        relics: current.view.combat.heroes.reduce(
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
        battlesWon: current.view.combat.metrics.battlesWon,
        rounds: current.view.combat.metrics.rounds,
        nodeValues,
        routeKinds,
      });
    }

const scored = samples.map((sample) => ({
    sample,
    score: evaluateExpeditionRun(sample),
  })),
  groups = new Map();
for (const item of scored) {
  const key = `${item.sample.style}:${item.sample.ascension}`,
    group = groups.get(key) ?? [];
  group.push(item);
  groups.set(key, group);
}
const summaries = [...groups].map(([key, entries]) => {
  const [style, ascension] = key.split(":"),
    utilities = entries.map((entry) => entry.score.utility);
  return {
    style,
    styleName: styleNames[style] ?? style,
    ascension: Number(ascension),
    samples: entries.length,
    reward: round(mean(entries.map((entry) => entry.score.reward))),
    risk: round(mean(entries.map((entry) => entry.score.risk))),
    utility: round(mean(utilities)),
    cvar: round(conditionalValueAtRisk(utilities)),
    winRate: round(
      entries.filter((entry) => entry.sample.won).length / entries.length,
      2,
    ),
    rounds: round(
      mean(entries.map((entry) => entry.sample.rounds)),
    ),
    healthLost: round(
      mean(entries.map((entry) => entry.sample.healthLost)),
    ),
    relics: round(mean(entries.map((entry) => entry.sample.relics))),
    companions: round(
      mean(entries.map((entry) => entry.sample.companions)),
    ),
    shopSealed: round(
      entries.filter((entry) => entry.sample.shopSealed).length /
        entries.length,
      2,
    ),
  };
});

const leaders = ascensions.map((ascension) => {
  const rows = summaries.filter((item) => item.ascension === ascension);
  return {
    ascension,
    utility: [...rows].sort((left, right) => right.utility - left.utility)[0],
    reward: [...rows].sort((left, right) => right.reward - left.reward)[0],
    risk: [...rows].sort((left, right) => left.risk - right.risk)[0],
  };
});

const escapeXml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;"),
  scatterSvg = () => {
    const width = 920,
      height = 460,
      padding = 58,
      minReward = Math.floor(Math.min(...summaries.map((item) => item.reward)) / 10) * 10 - 10,
      maxReward = Math.ceil(Math.max(...summaries.map((item) => item.reward)) / 10) * 10 + 10,
      maxRisk = Math.ceil(Math.max(...summaries.map((item) => item.risk)) / 10) * 10 + 10,
      x = (value) =>
        padding + ((value - minReward) / (maxReward - minReward)) * (width - padding * 2),
      y = (value) => height - padding - (value / maxRisk) * (height - padding * 2),
      points = summaries
        .map(
          (item) => `<g>
            <circle cx="${round(x(item.reward))}" cy="${round(y(item.risk))}" r="7" fill="${colors[item.style] ?? "#555"}" />
            <text x="${round(x(item.reward) + 9)}" y="${round(y(item.risk) - 7)}">${escapeXml(item.styleName)} N${item.ascension}</text>
          </g>`,
        )
        .join(""),
      grid = Array.from({ length: 6 }, (_, index) => {
        const value = index / 5,
          gx = padding + value * (width - padding * 2),
          gy = height - padding - value * (height - padding * 2);
        return `<line x1="${round(gx)}" y1="${padding}" x2="${round(gx)}" y2="${height - padding}" stroke="#d9dedb" />
          <line x1="${padding}" y1="${round(gy)}" x2="${width - padding}" y2="${round(gy)}" stroke="#d9dedb" />`;
      }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="收益风险散点图">
      <rect width="${width}" height="${height}" fill="#f7f5ef"/>
      ${grid}
      ${points}
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#53605c"/>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#53605c"/>
      <text x="${width / 2}" y="${height - 18}" text-anchor="middle" fill="#53605c">期望收益</text>
      <text x="18" y="${height / 2}" text-anchor="middle" transform="rotate(-90 18 ${height / 2})" fill="#53605c">风险</text>
    </svg>`;
  },
  lineSvg = () => {
    const width = 920,
      height = 430,
      padding = 58,
      maxIndex = Math.max(
        ...samples.map((sample) => sample.nodeValues.length),
        1,
      ),
      valuesByStyle = styles.map((style) => {
        const styleSamples = samples.filter((sample) => sample.style === style);
        return {
          style,
          values: Array.from({ length: maxIndex }, (_, index) =>
            round(
              mean(
                styleSamples
                  .map((sample) => sample.nodeValues[index])
                  .filter((value) => value !== undefined),
              ),
            ),
          ),
        };
      }),
      min = Math.min(...valuesByStyle.flatMap((entry) => entry.values), -5),
      max = Math.max(...valuesByStyle.flatMap((entry) => entry.values), 5),
      x = (index) =>
        padding + (index / Math.max(1, maxIndex - 1)) * (width - padding * 2),
      y = (value) =>
        height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2),
      zero = y(0),
      paths = valuesByStyle
        .map(
          (entry) =>
            `<polyline fill="none" stroke="${colors[entry.style] ?? "#555"}" stroke-width="3" points="${entry.values
              .map((value, index) => `${round(x(index))},${round(y(value))}`)
              .join(" ")}" />
            <text x="${width - padding + 4}" y="${round(y(entry.values.at(-1) ?? 0))}" fill="${colors[entry.style] ?? "#555"}">${escapeXml(styleNames[entry.style] ?? entry.style)}</text>`,
        )
        .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="节点收益脉冲曲线">
      <rect width="${width}" height="${height}" fill="#f7f5ef"/>
      <line x1="${padding}" y1="${round(zero)}" x2="${width - padding}" y2="${round(zero)}" stroke="#aab2ae" stroke-dasharray="5 5"/>
      ${paths}
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#53605c"/>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#53605c"/>
      <text x="${width / 2}" y="${height - 18}" text-anchor="middle" fill="#53605c">已结算节点序号</text>
      <text x="18" y="${height / 2}" text-anchor="middle" transform="rotate(-90 18 ${height / 2})" fill="#53605c">平均资源变化</text>
    </svg>`;
  },
  barSvg = () => {
    const width = 920,
      height = 460,
      padding = 54,
      labelMap = new Map(
        summaries.map((item) => [
          `${item.style}:${item.ascension}`,
          `${item.styleName} N${item.ascension}`,
        ]),
      ),
      max = Math.max(...summaries.map((item) => item.reward), 1),
      barWidth = (width - padding * 2) / summaries.length;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="方案收益柱状图">
      <rect width="${width}" height="${height}" fill="#f7f5ef"/>
      ${summaries
        .map((item, index) => {
          const barHeight = (item.reward / max) * (height - padding * 2),
            x = padding + index * barWidth + 4,
            y = height - padding - barHeight;
          return `<rect x="${round(x)}" y="${round(y)}" width="${round(barWidth - 8)}" height="${round(barHeight)}" fill="${colors[item.style] ?? "#555"}"/>
            <text x="${round(x + barWidth / 2)}" y="${height - padding + 18}" text-anchor="end" transform="rotate(-55 ${round(x + barWidth / 2)} ${height - padding + 18})" font-size="10">${escapeXml(labelMap.get(`${item.style}:${item.ascension}`))}</text>
            <text x="${round(x + barWidth / 2)}" y="${round(y - 5)}" text-anchor="middle" font-size="10">${item.reward}</text>`;
        })
        .join("")}
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#53605c"/>
    </svg>`;
  };

const rewardRisk = scatterSvg(),
  experienceCurve = lineSvg(),
  rewardBars = barSvg(),
  report = {
    generatedAt: new Date().toISOString(),
    model: {
      reward:
        "100 * weighted(survival, deck growth, upgrades, relics, companions, economy, progress) + win bonus",
      risk:
        "100 * weighted(health deficit, attrition, failure, volatility, irreversible loss)",
      utility: "reward - 0.35 * risk",
      cvar: "negative mean of the worst 25% utility outcomes",
    },
    configuration: {
      styles,
      ascensions,
      seedCount,
      players,
      difficulty,
    },
    summaries,
    leaders,
    samples,
  };

await Promise.all([
  writeFile(join(outputRoot, "run-data.json"), JSON.stringify(report, null, 2)),
  writeFile(join(outputRoot, "reward-risk.svg"), rewardRisk),
  writeFile(join(outputRoot, "experience-curve.svg"), experienceCurve),
  writeFile(join(outputRoot, "reward-bars.svg"), rewardBars),
]);

const tableRows = summaries
  .map(
    (item) =>
      `<tr><td>${escapeXml(item.styleName)}</td><td>N${item.ascension}</td><td>${item.reward}</td><td>${item.risk}</td><td>${item.utility}</td><td>${item.cvar}</td><td>${Math.round(item.winRate * 100)}%</td><td>${item.rounds}</td></tr>`,
  )
  .join("");
await writeFile(
  join(outputRoot, "summary.md"),
  `# 秘塔远征体验量化摘要

样本：${samples.length} 个固定种子运行，${styles.length} 种 AI 路线，N${ascensions.join(" / N")}，${players} 人，${difficulty} 难度。

| 方案 | 阶位 | 收益 | 风险 | 效用 | CVaR | 胜率 | 平均轮数 |
|---|---:|---:|---:|---:|---:|---:|---:|
${summaries
  .map(
    (item) =>
      `| ${item.styleName} | N${item.ascension} | ${item.reward} | ${item.risk} | ${item.utility} | ${item.cvar} | ${Math.round(item.winRate * 100)}% | ${item.rounds} |`,
  )
  .join("\n")}

## 自动结论

${leaders
  .map(
    (leader) =>
      `- N${leader.ascension}：综合效用最高为 ${leader.utility.styleName}，收益最高为 ${leader.reward.styleName}，风险最低为 ${leader.risk.styleName}。`,
  )
  .join("\n")}

## 模型

- 收益：${report.model.reward}
- 风险：${report.model.risk}
- 效用：${report.model.utility}
- CVaR：${report.model.cvar}
`,
);
await writeFile(
  join(outputRoot, "report.html"),
  `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>秘塔远征体验量化报告</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#26332f;background:#ece9e1}
body{max-width:1080px;margin:0 auto;padding:32px 22px 60px}
h1{font-size:34px;margin:0 0 6px}h2{margin-top:36px}small,p{color:#5e6b66}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:22px}
.metric{padding:18px;border-radius:16px;background:#f7f5ef}
.metric strong{display:block;font-size:26px;margin-top:4px}
section{padding:24px;border-radius:20px;background:#fffdf8;margin-top:20px}
img,svg{display:block;width:100%;height:auto;border-radius:14px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:9px 7px;text-align:left;border-bottom:1px solid #dde1de}
th{color:#5e6b66;font-weight:600}code{background:#ece9e1;padding:2px 5px;border-radius:4px}
</style>
</head>
<body>
<h1>秘塔远征体验量化报告</h1>
<p>固定种子模拟，用于比较 AI 路线风格的收益、风险与波动。该报告独立于游戏，不进入客户端 bundle。</p>
<div class="grid">
<div class="metric"><small>方案组合</small><strong>${summaries.length}</strong></div>
<div class="metric"><small>固定种子</small><strong>${samples.length}</strong></div>
<div class="metric"><small>难度</small><strong>${escapeXml(difficulty)}</strong></div>
</div>
<section><h2>收益—风险分布</h2>${rewardRisk}</section>
<section><h2>逐节点收益脉冲</h2>${experienceCurve}</section>
<section><h2>方案期望收益</h2>${rewardBars}</section>
<section><h2>自动结论</h2>
<ul>${leaders
  .map(
    (leader) =>
      `<li>N${leader.ascension}：综合效用最高为 ${escapeXml(leader.utility.styleName)}（${leader.utility.utility}），收益最高为 ${escapeXml(leader.reward.styleName)}（${leader.reward.reward}），风险最低为 ${escapeXml(leader.risk.styleName)}（${leader.risk.risk}）。</li>`,
  )
  .join("")}</ul>
</section>
<section><h2>数据表</h2>
<table><thead><tr><th>方案</th><th>阶位</th><th>收益</th><th>风险</th><th>效用</th><th>CVaR</th><th>胜率</th><th>平均轮数</th></tr></thead><tbody>${tableRows}</tbody></table>
</section>
<section><h2>数学模型</h2>
<p><code>${escapeXml(report.model.reward)}</code></p>
<p><code>${escapeXml(report.model.risk)}</code></p>
<p><code>${escapeXml(report.model.utility)}</code></p>
<p><code>${escapeXml(report.model.cvar)}</code></p>
</section>
</body>
</html>`,
);

for (const style of styles) {
  const rows = summaries.filter((item) => item.style === style);
  process.stdout.write(
    `${styleNames[style] ?? style}: ${rows
      .map(
        (item) =>
          `N${item.ascension} reward=${item.reward} risk=${item.risk} utility=${item.utility} win=${Math.round(item.winRate * 100)}%`,
      )
      .join(" | ")}\n`,
  );
}
process.stdout.write(`${outputRoot}/report.html\n`);
