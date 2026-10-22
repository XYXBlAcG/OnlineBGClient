(async () => {
  const waitFor = async (read) => {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const value = read();
      if (value) return value;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`等待超时：${read}`);
  };
  const button = (text) =>
    [...document.querySelectorAll("button")].find(
      (node) => node.textContent.trim() === text,
    );
  try {
    await waitFor(() => button("设置"));
    button("设置").click();
    await window.__TAURI_INTERNALS__.invoke("smoke_progress", {
      phase: "mahjong-settings-open",
    });
    await waitFor(() => window.nativeCompleted?.settings);
    await window.__TAURI_INTERNALS__.invoke("smoke_progress", {
      phase: "mahjong-settings-complete",
    });
    await waitFor(
      () => document.documentElement.dataset.gameMotion === "enhanced",
    );
    [...document.querySelectorAll(".game-card-main")]
      .find((node) => node.textContent.includes("四川麻将"))
      .click();
    await waitFor(
      () =>
        document.querySelector(".game-card.active strong")?.textContent ===
        "四川麻将",
    );
    button("创建房间").click();
    (await waitFor(() => button("开始对局"))).click();
    await waitFor(() => document.querySelector(".scmj-hand button"));
    await window.__TAURI_INTERNALS__.invoke("smoke_progress", {
      phase: "mahjong-local-table",
    });
    const groups = new Map();
    for (const node of document.querySelectorAll(".scmj-hand button")) {
      const tile = Number(node.dataset.motionKey.replace("scmj-tile-", ""));
      const suit = Math.floor(tile / 36);
      groups.set(suit, [...(groups.get(suit) || []), node]);
    }
    [...groups.values()]
      .find((nodes) => nodes.length >= 3)
      .slice(0, 3)
      .forEach((node) => node.click());
    (
      await waitFor(() => {
        const node = button("确认换三张");
        return node && !node.disabled && node;
      })
    ).click();
    (await waitFor(() => button("定缺万"))).click();
    await waitFor(() => button("出牌"));
    const legal = [...document.querySelectorAll(".scmj-hand button")].filter(
      (node) => !node.disabled,
    );
    const tile =
      legal.find((node) => node.classList.contains("is-lack")) || legal[0];
    if (!tile) throw new Error("没有合法手牌");
    tile.click();
    (
      await waitFor(() => {
        const node = button("出牌");
        return node && !node.disabled && node;
      })
    ).click();
    await waitFor(() =>
      document.querySelector(".scmj-south .scmj-river > span"),
    );
    const hand = document.querySelector(".scmj-hand").getBoundingClientRect();
    if (hand.bottom > innerHeight || hand.width > innerWidth)
      throw new Error("手牌超出原生窗口");
    if (document.querySelectorAll(".scmj-hidden-hand svg text").length)
      throw new Error("对手牌背泄露");
    button("托管").click();
    await waitFor(() => button("取消托管"));
    button("取消托管").click();
    await waitFor(() => button("托管"));
    await window.__TAURI_INTERNALS__.invoke("report", {
      result: `PASS: native Sichuan local worker, AI exchange/lack, own discard, private opponent hands, delegate/reclaim and hand bounds; ${navigator.userAgent}`,
    });
  } catch (error) {
    await window.__TAURI_INTERNALS__.invoke("report", {
      result: `FAIL: ${error}\n${document.body.innerText}`,
    });
  }
})();
