(async () => {
  const waitFor = async (find) => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const value = find();
      if (value) {
        await new Promise((resolve) => setTimeout(resolve, 120));
        return value;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Timed out: " + String(find));
  };
  const button = (text) =>
    [...document.querySelectorAll("button")].find(
      (button) => button.textContent.trim() === text,
    );
  const choose = async (label, text) => {
    document.querySelector(`[role=combobox][aria-label="${label}"]`).click();
    const option = await waitFor(() =>
      [...document.querySelectorAll("[role=option]")].find(
        (option) => option.textContent.replace(/✓/g, "").trim() === text,
      ),
    );
    option.click();
    await waitFor(() => !document.querySelector("[role=listbox]"));
  };
  try {
    await waitFor(() => button("创建房间"));
    if (document.querySelectorAll(".game-card").length !== 8)
      throw new Error("Missing games");
    const contextMenu = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    if (document.querySelector(".app-mark").dispatchEvent(contextMenu))
      throw new Error("Desktop context menu is enabled");
    if (button("策略审核")) throw new Error("Audit visible by default");
    button("设置").click();
    await waitFor(() => document.querySelector('[aria-label="外观主题"]'));
    await choose("外观主题", "深色");
    await waitFor(() => document.documentElement.dataset.theme === "dark");
    document.querySelector('.ui-panel [aria-label="关闭"]').click();
    button("创建房间").click();
    await waitFor(() => button("开始对局"));
    button("开始对局").click();
    await waitFor(() => button("我先出牌"));
    button("我先出牌").click();
    await waitFor(() => document.querySelectorAll(".uno").length > 7);
    button("结束游戏").click();
    await waitFor(() =>
      document.querySelector('.confirmation-dialog[data-state="open"]'),
    );
    button("取消").click();
    await waitFor(
      () => !document.querySelector('.confirmation-dialog[data-state="open"]'),
    );
    if (button("开始对局")) throw new Error("Cancel ended the game");
    button("结束游戏").click();
    await waitFor(() =>
      document.querySelector('.confirmation-dialog[data-state="open"]'),
    );
    button("确认结束").click();
    await waitFor(() => button("开始对局"));
    button("对局记录").click();
    await waitFor(() => document.querySelector(".record-row > button"));
    document.querySelector(".record-row > button").click();
    await waitFor(() => document.querySelector(".ui-panel-wide .uno"));
    if (
      [...document.querySelectorAll(".ui-panel-wide button")].some(
        (node) => node.textContent === "结束游戏",
      )
    )
      throw new Error("Replay exposes end control");
    document.querySelector('.ui-panel-wide [aria-label="关闭"]').click();
    button("开始对局").click();
    await waitFor(() => button("我先出牌"));
    button("关闭房间").click();
    await waitFor(() =>
      document.querySelector('.confirmation-dialog[data-state="open"]'),
    );
    document
      .querySelector(
        '.confirmation-dialog[data-state="open"] .confirmation-actions button:last-child',
      )
      .click();
    await waitFor(() => document.querySelector(".game-picker"));
    [...document.querySelectorAll(".game-card button")]
      .find((button) => button.textContent.includes("身份与武将"))
      .click();
    await waitFor(() =>
      document
        .querySelector(".game-card.active")
        ?.textContent.includes("身份与武将"),
    );
    button("创建房间").click();
    await waitFor(() => button("开始对局"));
    button("开始对局").click();
    await waitFor(() => document.querySelectorAll(".sgs-hero").length > 0);
    const detail = await waitFor(() =>
      document.querySelector(".hero-detail-button"),
    );
    detail.click();
    await waitFor(() => document.querySelector(".ui-panel .hero-description"));
    document.querySelector('.ui-panel [aria-label="关闭"]').click();
    button("关闭房间").click();
    await waitFor(() =>
      document.querySelector('.confirmation-dialog[data-state="open"]'),
    );
    document
      .querySelector(
        '.confirmation-dialog[data-state="open"] .confirmation-actions button:last-child',
      )
      .click();
    await waitFor(() => document.querySelector(".game-picker"));
    [...document.querySelectorAll(".game-card button")]
      .find((node) => node.textContent.includes("资源、贸易与建设"))
      .click();
    await waitFor(() =>
      document
        .querySelector(".game-card.active")
        ?.textContent.includes("资源、贸易与建设"),
    );
    await choose("真人人数", "3 人");
    await choose("总席位", "3 人");
    button("创建房间").click();
    await waitFor(() => button("开始对局"));
    button("开始对局").click();
    for (const actor of [0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0]) {
      await choose("当前本地玩家", `玩家 ${actor + 1}`);
      const target = await waitFor(() =>
        document.querySelector(
          '.original-game svg circle.cursor-pointer[opacity="0.5"]',
        ),
      );
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const dice = await waitFor(() =>
      [...document.querySelectorAll("button")].find(
        (node) => node.textContent.includes("掷骰子") && !node.disabled,
      ),
    );
    dice.click();
    await waitFor(() => dice.disabled);
    button("结束游戏").click();
    await waitFor(() => button("确认结束"));
    button("确认结束").click();
    button("关闭房间").click();
    await waitFor(() =>
      document.querySelector('.confirmation-dialog[data-state="open"]'),
    );
    document
      .querySelector(
        '.confirmation-dialog[data-state="open"] .confirmation-actions button:last-child',
      )
      .click();
    await waitFor(() => document.querySelector(".game-picker"));
    [...document.querySelectorAll(".game-card button")]
      .find((node) => node.textContent.includes("宝石、发展与贵族"))
      .click();
    await waitFor(() =>
      document
        .querySelector(".game-card.active")
        ?.textContent.includes("宝石、发展与贵族"),
    );
    button("创建房间").click();
    await waitFor(() => button("开始对局"));
    button("开始对局").click();
    await waitFor(() => document.querySelector(".ccbs-card"));
    if (!document.querySelector('.beginner-guide button[aria-pressed="true"]'))
      button("新手引导").click();
    await waitFor(() => document.querySelector(".beginner-guide-content"));
    button("下一步").click();
    await waitFor(
      () =>
        document.querySelector(".beginner-guide-content h3")?.textContent ===
        "取宝石",
    );
    button("定位到牌桌").click();
    await waitFor(() =>
      document.querySelector(".original-game [data-guide-focus]"),
    );
    await waitFor(() => button("返回引导"));
    button("返回引导").click();
    if (document.documentElement.scrollHeight > innerHeight + 1)
      throw new Error("Room exceeds viewport height");
    if (!document.querySelector(".room-guide-slot .beginner-guide-content"))
      throw new Error("Guide is outside sidebar");
    button("专注模式").click();
    await waitFor(() => document.querySelector(".room-sidebar")?.hidden);
    button("恢复界面").click();
    await waitFor(() => !document.querySelector(".room-sidebar")?.hidden);
    const take = await waitFor(() =>
      [...document.querySelectorAll("button")].find((node) =>
        node.textContent.includes("取宝石"),
      ),
    );
    take.click();
    await waitFor(
      () => document.querySelectorAll("button.ccbs-circle").length >= 3,
    );
    const coins = [...document.querySelectorAll("button.ccbs-circle")];
    for (const coin of coins.slice(0, 3)) {
      coin.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (
      [...document.querySelectorAll("button.ccbs-circle")].some(
        (node) =>
          !getComputedStyle(node).backgroundImage.includes("radial-gradient"),
      )
    )
      throw new Error("Gem color missing");
    await waitFor(() => button("确认拿这些"));
    button("确认拿这些").click();
    await waitFor(() =>
      [...document.querySelectorAll("button")].some(
        (node) => node.textContent.includes("取宝石") && node.disabled,
      ),
    );
    await waitFor(() =>
      [...document.querySelectorAll("button")].some(
        (node) => node.textContent.includes("取宝石") && !node.disabled,
      ),
    );
    button("关闭房间").click();
    await waitFor(() =>
      document.querySelector('.confirmation-dialog[data-state="open"]'),
    );
    document
      .querySelector(
        '.confirmation-dialog[data-state="open"] .confirmation-actions button:last-child',
      )
      .click();
    await waitFor(() => document.querySelector(".game-card"));
    [...document.querySelectorAll(".game-card button")]
      .find((node) => node.textContent.includes("连续跳跃与营地竞速"))
      .click();
    await waitFor(() => button("6 个困难 AI 性能测试"));
    button("6 个困难 AI 性能测试").click();
    await waitFor(() =>
      document
        .querySelector('[aria-label="真人人数"]')
        ?.textContent.includes("0 人"),
    );
    button("创建房间").click();
    await waitFor(() => button("开始对局"));
    button("开始对局").click();
    await waitFor(() =>
      /已完成 [1-9]\d* 次决策/.test(
        document.querySelector(".compute-status")?.textContent || "",
      ),
    );
    button("暂停 AI 测试").click();
    await waitFor(() => button("继续 AI 测试"));
    document.querySelector('button[aria-label="缩小地图"]').click();
    await waitFor(
      () => document.querySelector(".map-tools output")?.textContent === "50%",
    );
    await window.__TAURI_INTERNALS__.invoke("report", {
      result:
        "PASS: native WebView, suppressed context menu, hidden audit, hero details, eight-game lobby, unified dark controls, local worker, UNO, Sanguosha, Catan SVG setup and dice, Splendor cards and local AI turns, six hard AI benchmark with real timing, pause and 50% map, viewport fit, docked guide and focus mode, confirmation, waiting room, replay, restart and close",
    });
  } catch (error) {
    await window.__TAURI_INTERNALS__.invoke("report", {
      result: "FAIL: " + String(error) + "\n" + document.body.innerText,
    });
  }
})();
