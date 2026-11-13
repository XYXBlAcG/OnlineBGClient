import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { TestService } from "./service-harness.mjs";
import {
  createRoomFixtures,
  fixtureRoomId,
  loadFixtureModules,
} from "./lib/room-fixtures.mjs";
import {
  compareBaseline,
  renderMarkdown,
  summarize,
} from "./lib/ui-audit-report.mjs";
import {
  readBaselineFindings,
  writeBaseline,
} from "./lib/ui-audit-baseline.mjs";
import {
  auditPaths,
  captureScreen,
  checkBuildOutputs,
  collectBuildInfo,
  decideExit,
  launchBrowser,
  parseArgs,
  resolveBaselinePath,
  selectScope,
  usage,
} from "./lib/ui-audit-runner.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return 0;
  }
  checkBuildOutputs();
  const buildInfo = await collectBuildInfo();
  const { catalogue, gameKinds } = await loadFixtureModules();
  const scope = selectScope(options, gameKinds);
  const baselinePath = resolveBaselinePath(options);
  const baselineFindings = baselinePath
    ? (await readBaselineFindings(baselinePath)).filter(
        (finding) =>
          scope.games.includes(finding.game) &&
          scope.viewports.some((viewport) => viewport.key === finding.viewport),
      )
    : null;
  await rm(auditPaths.screenshotDir, { recursive: true, force: true });
  await mkdir(auditPaths.screenshotDir, { recursive: true });
  const dataDirectory = await mkdtemp(join(tmpdir(), "onlinebg-ui-audit-"));
  const service = new TestService(dataDirectory, {
    entry: relative(auditPaths.root, auditPaths.hostingEntry),
    staticRoot: auditPaths.hostingWeb,
  });
  let browser;
  let endpoint;
  const contexts = new Map();
  try {
    const fixtures = await createRoomFixtures({
      directory: dataDirectory,
      kinds: scope.games,
      catalogue,
    });
    endpoint = await service.start();
    browser = await launchBrowser();
    const contextFor = async (viewport) => {
      if (!contexts.has(viewport.key))
        contexts.set(
          viewport.key,
          await browser.newContext({
            isMobile: viewport.isMobile,
            hasTouch: viewport.hasTouch,
            viewport: { width: viewport.width, height: viewport.height },
          }),
        );
      return contexts.get(viewport.key);
    };
    const screens = [];
    for (const game of scope.games) {
      for (const viewport of scope.viewports) {
        const screen = await captureScreen({
          game,
          viewport,
          endpoint,
          fixture: fixtures.get(fixtureRoomId(game)),
          context: await contextFor(viewport),
        });
        screens.push(screen);
        console.log(
          `SCREEN ${game}/${viewport.key} ${screen.status} 遮挡=${screen.probe?.counts.blocked ?? 0} 裁切=${screen.probe?.counts.clipped ?? 0} 重叠=${screen.probe?.counts.overlaps ?? 0} 溢出=${screen.probe?.documentOverflow.overflowX || screen.probe?.documentOverflow.overflowY ? "是" : "否"}`,
        );
      }
    }
    const findings = screens.flatMap((screen) => screen.findings ?? []);
    const summary = summarize(findings, screens, scope.games, scope.viewports);
    const diff = baselineFindings
      ? compareBaseline(findings, baselineFindings)
      : null;
    const report = {
      generatedAt: new Date().toISOString(),
      command: `node scripts/audit-ui.mjs${process.argv.slice(2).length ? ` ${process.argv.slice(2).join(" ")}` : ""}`,
      catalogueSource: "src/domain/catalogue.ts",
      build: buildInfo,
      fixtures: {
        note: "总席位 = max(2, minPlayers)：1 名真人 + 其余 AI，避免多真人离线横幅",
        humans: 1,
        aiDelayMs: 5000,
      },
      selection: {
        games: scope.games.map((kind) => ({
          kind,
          name: catalogue[kind].name,
          seats: fixtures.get(fixtureRoomId(kind)).seats,
        })),
        viewports: scope.viewports.map((viewport) => ({
          key: viewport.key,
          label: viewport.label,
          width: viewport.width,
          height: viewport.height,
        })),
      },
      screens: screens.map((screen) =>
        Object.fromEntries(
          Object.entries(screen).filter(([key]) => key !== "findings"),
        ),
      ),
      findings,
      summary,
      baseline: baselinePath
        ? {
            path: relative(auditPaths.root, baselinePath),
            added: diff.added,
            removed: diff.removed,
            persisted: diff.persisted,
          }
        : null,
    };
    await mkdir(auditPaths.outputRoot, { recursive: true });
    await writeFile(
      join(auditPaths.outputRoot, "report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await writeFile(
      join(auditPaths.outputRoot, "report.md"),
      renderMarkdown(report),
    );
    if (options.updateBaseline) {
      const written = await writeBaseline(findings, report.generatedAt);
      console.log(`基线已更新：${relative(auditPaths.root, written)}`);
    }
    console.log(
      `UI 审计：${scope.games.length} 游戏 × ${scope.viewports.length} 视口，共 ${screens.length} 屏`,
    );
    for (const kind of scope.games) {
      const counts = summary.byGame[kind];
      console.log(
        `  ${kind}（${catalogue[kind].name}） P0 ${counts.P0} / P1 ${counts.P1} / P2 ${counts.P2}`,
      );
    }
    console.log(
      `合计：P0 ${summary.totals.P0} / P1 ${summary.totals.P1} / P2 ${summary.totals.P2}；运行时错误 pageerror ${summary.runtime.pageErrors} / console ${summary.runtime.consoleErrors}；采集失败 ${summary.screens.failed} 屏`,
    );
    if (diff)
      console.log(
        `基线对比：新增 ${diff.added.length}、消失 ${diff.removed.length}、沿用 ${diff.persisted}`,
      );
    console.log(
      `报告：${relative(auditPaths.root, join(auditPaths.outputRoot, "report.md"))}（JSON：${relative(auditPaths.root, join(auditPaths.outputRoot, "report.json"))}）`,
    );
    const exit = decideExit(options, findings, diff);
    console.log(`退出码 ${exit.code}：${exit.reason}`);
    return exit.code;
  } finally {
    await service.stop().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await rm(dataDirectory, { recursive: true, force: true }).catch(() => {});
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(
      `错误：${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
