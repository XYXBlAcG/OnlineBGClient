import { existsSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { probePage } from "./ui-audit-probe.mjs";
import { classifyScreen } from "./ui-audit-report.mjs";
import { fixtureRoomId } from "./room-fixtures.mjs";
import { defaultBaselinePath } from "./ui-audit-baseline.mjs";

const root = process.cwd();

export const auditPaths = {
  root,
  outputRoot: join(root, "artifacts/ui-audit"),
  screenshotDir: join(root, "artifacts/ui-audit/screenshots"),
  hostingEntry: join(root, "src-tauri/resources/hosting/main.mjs"),
  hostingWeb: join(root, "src-tauri/resources/hosting/web"),
  hostingIndex: join(root, "src-tauri/resources/hosting/web/index.html"),
  sourceDirectory: join(root, "src"),
};

export const viewports = [
  {
    key: "desktop",
    label: "桌面",
    width: 1280,
    height: 720,
    isMobile: false,
    hasTouch: false,
  },
  {
    key: "landscape",
    label: "手机横屏",
    width: 844,
    height: 390,
    isMobile: true,
    hasTouch: true,
  },
];

export const usage = `用法：node scripts/audit-ui.mjs [选项]

对 src/domain/catalogue.ts 中的全部游戏建立夹具房间，在桌面 1280×720 与手机横屏 844×390 下截图并执行机器判定。

选项：
  --games <列表>      只审计指定游戏，逗号分隔（默认全部）
  --viewports <列表>  只审计指定视口：desktop,landscape（默认两者）
  --baseline <文件>   读取基线 JSON（默认 scripts/ui-audit.baseline.json，也可传上次 report.json）
  --update-baseline   把本次问题指纹写入 scripts/ui-audit.baseline.json
  --fail-on new       仅当相对基线新增 P0/P1 时 exit 1（无基线时无法判定，exit 0）
  -h, --help          显示本帮助

产物：
  artifacts/ui-audit/report.md
  artifacts/ui-audit/report.json
  artifacts/ui-audit/screenshots/*.png`;

export const fail = (message) => {
  throw new Error(message);
};

export function parseArgs(argv) {
  const options = {
    games: null,
    viewports: null,
    baseline: null,
    updateBaseline: false,
    failOn: null,
    help: false,
  };
  const takeValue = (index, name) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`参数 ${name} 缺少取值`);
    return value;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--games") {
      options.games = takeValue(index, arg)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
    } else if (arg === "--viewports") {
      options.viewports = takeValue(index, arg)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
    } else if (arg === "--baseline") {
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        options.baseline = next;
        index += 1;
      } else options.baseline = defaultBaselinePath;
    } else if (arg === "--update-baseline") {
      options.updateBaseline = true;
    } else if (arg === "--fail-on") {
      options.failOn = takeValue(index, arg);
      if (options.failOn !== "new") fail("--fail-on 目前只支持 new");
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      fail(`未知参数：${arg}`);
    }
  }
  return options;
}

export function selectScope(options, gameKinds) {
  let games = [...gameKinds];
  if (options.games) {
    const unknown = options.games.filter((kind) => !gameKinds.includes(kind));
    if (unknown.length)
      fail(`未知游戏：${unknown.join("、")}（可用：${gameKinds.join("、")}）`);
    const wanted = new Set(options.games);
    games = gameKinds.filter((kind) => wanted.has(kind));
  }
  let selectedViewports = [...viewports];
  if (options.viewports) {
    const keys = viewports.map((viewport) => viewport.key);
    const unknown = options.viewports.filter((key) => !keys.includes(key));
    if (unknown.length)
      fail(`未知视口：${unknown.join("、")}（可用：${keys.join("、")}）`);
    const wanted = new Set(options.viewports);
    selectedViewports = viewports.filter((viewport) =>
      wanted.has(viewport.key),
    );
  }
  return { games, viewports: selectedViewports };
}

export function checkBuildOutputs() {
  const missing = [
    [auditPaths.hostingEntry, "服务入口"],
    [auditPaths.hostingIndex, "静态页面"],
  ].filter(([path]) => !existsSync(path));
  if (!missing.length) return;
  fail(
    [
      "缺少构建产物：",
      ...missing.map(
        ([path, label]) => `  - ${label}：${relative(root, path)}`,
      ),
      "请先运行 npm run desktop:prepare（或先 npm run build 再 npm run hosting:build）",
    ].join("\n"),
  );
}

async function latestMtime(directory) {
  let latest = 0;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) latest = Math.max(latest, await latestMtime(path));
    else latest = Math.max(latest, statSync(path).mtimeMs);
  }
  return latest;
}

export async function collectBuildInfo() {
  const buildInfo = {
    hostingEntry: relative(root, auditPaths.hostingEntry),
    hostingEntryMtime: statSync(auditPaths.hostingEntry).mtime.toISOString(),
    hostingIndex: relative(root, auditPaths.hostingIndex),
    hostingIndexMtime: statSync(auditPaths.hostingIndex).mtime.toISOString(),
    latestSourceMtime: new Date(
      await latestMtime(auditPaths.sourceDirectory),
    ).toISOString(),
  };
  if (
    new Date(buildInfo.latestSourceMtime) >
    new Date(buildInfo.hostingIndexMtime)
  )
    console.warn(
      `警告：静态资源构建于 ${buildInfo.hostingIndexMtime}，早于 src 最近修改 ${buildInfo.latestSourceMtime}；结果可能不含最新 UI，建议先运行 npm run desktop:prepare`,
    );
  return buildInfo;
}

export function resolveBaselinePath(options) {
  let baselinePath = options.baseline ? resolve(options.baseline) : null;
  if (
    !baselinePath &&
    options.failOn === "new" &&
    existsSync(defaultBaselinePath)
  )
    baselinePath = defaultBaselinePath;
  if (baselinePath && !existsSync(baselinePath))
    fail(`基线文件不存在：${relative(root, baselinePath)}`);
  return baselinePath;
}

function chromeExecutablePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

export async function launchBrowser() {
  const executablePath = chromeExecutablePath();
  try {
    return await chromium.launch({ executablePath, headless: true });
  } catch (error) {
    fail(
      `无法启动浏览器：${error instanceof Error ? error.message : String(error)}\n请设置 CHROME_PATH 指向本机 Chrome，或运行 npx playwright install chromium`,
    );
  }
}

const runtimeMessage = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

const pushUnique = (list, message) => {
  if (message && !list.includes(message)) list.push(message);
};

export async function captureScreen({
  game,
  viewport,
  endpoint,
  fixture,
  context,
}) {
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const screen = {
    game,
    viewport: viewport.key,
    viewportLabel: viewport.label,
    width: viewport.width,
    height: viewport.height,
    screenshot: `screenshots/${game}-${viewport.key}-${viewport.width}x${viewport.height}.png`,
    status: "ok",
    error: null,
    runtime: { pageErrors: [], consoleErrors: [] },
    probe: null,
  };
  page.on("pageerror", (error) =>
    pushUnique(screen.runtime.pageErrors, runtimeMessage(error)),
  );
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location();
    if (location.url.endsWith("/favicon.ico")) return;
    pushUnique(
      screen.runtime.consoleErrors,
      runtimeMessage(
        location.url ? `${message.text()}（${location.url}）` : message.text(),
      ),
    );
  });
  try {
    await page.addInitScript(
      ({ room, token }) =>
        localStorage.setItem(`room:${location.origin}:${room}`, token),
      { room: fixtureRoomId(game), token: fixture.token },
    );
    await page.goto(`${endpoint}/?room=${fixtureRoomId(game)}`, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    await page
      .locator(`.original-game[data-game="${game}"]`)
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await page.waitForTimeout(1200);
    screen.probe = await page.evaluate(probePage);
  } catch (error) {
    screen.status = "error";
    screen.error = runtimeMessage(
      error instanceof Error ? error.message : error,
    );
  }
  try {
    await page.screenshot({
      path: join(auditPaths.outputRoot, screen.screenshot),
      animations: "disabled",
      timeout: 15000,
    });
  } catch {
    screen.status = "error";
    screen.error = screen.error ?? "截图失败";
  }
  await page.close().catch(() => {});
  if (screen.probe) screen.findings = classifyScreen(screen);
  return screen;
}

export function decideExit(options, findings, diff) {
  const currentP0 = findings.filter((finding) => finding.severity === "P0");
  if (options.failOn === "new") {
    if (!diff)
      return {
        code: 0,
        reason: "未找到基线，--fail-on new 无法判定新增问题（exit 0）",
      };
    const addedP0 = diff.added.filter((finding) => finding.severity === "P0");
    const addedP1 = diff.added.filter((finding) => finding.severity === "P1");
    if (addedP0.length || addedP1.length)
      return {
        code: 1,
        reason: `新增 P0 ${addedP0.length} / P1 ${addedP1.length} 个问题`,
      };
    return {
      code: 0,
      reason: `无新增 P0/P1（沿用 ${diff.persisted} 个历史问题）`,
    };
  }
  const blocking = diff
    ? diff.added.filter((finding) => finding.severity === "P0")
    : currentP0;
  if (blocking.length)
    return {
      code: 1,
      reason: `${diff ? "新增" : "存在"} P0 ${blocking.length} 个阻断级问题`,
    };
  if (diff && currentP0.length)
    return {
      code: 0,
      reason: `P0 ${currentP0.length} 个均在基线内，不因历史问题失败`,
    };
  return { code: 0, reason: "无阻断级问题" };
}
