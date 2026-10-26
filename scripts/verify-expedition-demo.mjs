import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const output =
  process.env.SCREENSHOT_DIR || "artifacts/demo/expedition/screenshots";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH,
});
const errors = [],
  reports = [];
try {
  for (const [name, width, height, touch] of [
    ["desktop", 1440, 900, false],
    ["desktop-low", 1280, 640, false],
    ["mobile", 390, 844, true],
    ["landscape", 844, 390, true],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: touch,
      hasTouch: touch,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${name}: ${error}`));
    await page.goto(
      pathToFileURL(resolve("artifacts/demo/expedition/index.html")).href,
    );
    await expect(
      page.getByRole("heading", { name: "风蚀哨站", exact: true }),
    ).toBeVisible();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(550);
    await page.screenshot({ path: `${output}/${name}.png` });
    const geometry = await page.evaluate(() => {
      const box = (selector) => {
        const b = document.querySelector(selector).getBoundingClientRect();
        return {
          x: b.x,
          y: b.y,
          right: b.right,
          bottom: b.bottom,
          width: b.width,
          height: b.height,
        };
      };
      return {
        viewport: { width: innerWidth, height: innerHeight },
        scene: box(".exp-scene"),
        hand: box(".exp-hand-zone"),
        footer: box(".exp-controls"),
        pageWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight,
      };
    });
    reports.push({ name, geometry });
    if (!process.env.REVIEW_BASELINE) {
      expect(geometry.footer.bottom).toBeLessThanOrEqual(height + 1);
      expect(geometry.pageWidth).toBeLessThanOrEqual(width + 1);
      expect(geometry.scene.bottom).toBeLessThanOrEqual(geometry.hand.y + 1);
    }
    if (!touch && !process.env.REVIEW_BASELINE) {
      await page
        .getByRole("button", { name: "数值与实测", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "规则数值与实测", exact: true }),
      ).toBeVisible();
      await page.waitForTimeout(450);
      await page.screenshot({ path: `${output}/${name}-data.png` });
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "关闭", exact: true })
        .click();
      await page.getByRole("combobox", { name: "外观", exact: true }).click();
      await page.getByRole("option", { name: "浅色", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute(
        "data-color-scheme",
        "light",
      );
      await page.waitForTimeout(450);
      await page.mouse.move(0, 0);
      await page.screenshot({ path: `${output}/${name}-light.png` });
    }
    await context.close();
  }

  if (!process.env.REVIEW_BASELINE) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.on("pageerror", (error) => errors.push(`interaction: ${error}`));
    await page.goto(
      pathToFileURL(resolve("artifacts/demo/expedition/index.html")).href,
    );
    await page
      .getByRole("button", { name: "选择打击", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "目标 铁壳守卫", exact: true })
      .click();
    await expect(page.locator(".exp-enemy .exp-health").first()).toContainText(
      "26",
    );
    await page.screenshot({ path: `${output}/attack.png` });
    await page.getByRole("button", { name: "重新开始", exact: true }).click();
    await page
      .getByRole("switch", { name: "增强游戏动画", exact: true })
      .click();
    await page.getByRole("button", { name: "自动试玩", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "战后奖励", exact: true }),
    ).toBeVisible({ timeout: 45000 });
    await page.getByRole("button", { name: "暂停演示", exact: true }).click();
    await page.screenshot({ path: `${output}/rewards.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/rewards-mobile.png` });
    const rewardBounds = await page.locator(".exp-rewards").boundingBox(),
      headingBounds = await page.locator(".exp-rewards h2").boundingBox();
    expect(headingBounds.y).toBeGreaterThanOrEqual(rewardBounds.y - 1);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "自动试玩", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "守门者已倒下", exact: true }),
    ).toBeVisible({ timeout: 120000 });
    await expect(page.locator(".exp-result")).toContainText("3 / 3 场胜利");
    await page.screenshot({ path: `${output}/victory.png` });
    await page.getByRole("button", { name: "数值与实测", exact: true }).click();
    await page
      .getByRole("button", { name: "在本机重测 300 局", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "停止测试", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "停止测试", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "在本机重测 300 局", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "在本机重测 300 局", exact: true })
      .click();
    await page.screenshot({ path: `${output}/benchmark-running.png` });
    await expect(
      page.getByRole("button", { name: "在本机重测 300 局", exact: true }),
    ).toBeEnabled({ timeout: 60000 });
    await expect(page.locator(".exp-report-table tbody tr")).toHaveCount(3);
    await expect(page.locator(".exp-balance")).toContainText("浏览器 Worker");
    await page.screenshot({ path: `${output}/benchmark-worker.png` });
    await page.close();
  }
  expect(errors).toEqual([]);
} finally {
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ reports, errors }, null, 2),
  );
  await browser.close();
}
console.log(`PASS: ${reports.length} viewports, ${errors.length} page errors`);
