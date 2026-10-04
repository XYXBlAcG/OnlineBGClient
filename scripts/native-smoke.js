(async () => {
  const waitFor = async (find) => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const value = find();
      if (value) return value;
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
    if (document.querySelectorAll(".game-card").length !== 5)
      throw new Error("Missing games");
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
    await waitFor(() => document.querySelector("dialog[open]"));
    button("取消").click();
    await waitFor(() => !document.querySelector("dialog[open]"));
    if (button("开始对局")) throw new Error("Cancel ended the game");
    button("结束游戏").click();
    await waitFor(() => document.querySelector("dialog[open]"));
    button("确认结束").click();
    await waitFor(() => button("开始对局"));
    button("对局记录").click();
    await waitFor(() => document.querySelector(".record-row > button"));
    document.querySelector(".record-row > button").click();
    await waitFor(() => document.querySelector(".ui-panel-wide .uno"));
    document.querySelector('.ui-panel-wide [aria-label="关闭"]').click();
    button("开始对局").click();
    await waitFor(() => button("我先出牌"));
    button("关闭房间").click();
    await waitFor(() => document.querySelector("dialog[open]"));
    document.querySelector("dialog[open] button:last-child").click();
    await waitFor(() => document.querySelector(".game-picker"));
    [...document.querySelectorAll(".game-card button")]
      .find((button) => button.textContent.includes("身份与武将"))
      .click();
    await waitFor(() => document.querySelector(".game-card.active")?.textContent.includes("身份与武将"));
    button("创建房间").click();
    await waitFor(() => button("开始对局"));
    button("开始对局").click();
    await waitFor(() => document.querySelectorAll(".sgs-hero").length > 0);
    await window.__TAURI_INTERNALS__.invoke("report", {
      result:
        "PASS: native WebView, five-game lobby, unified dark controls, local worker, UNO, Sanguosha, confirmation, waiting room, replay, restart and close",
    });
  } catch (error) {
    await window.__TAURI_INTERNALS__.invoke("report", {
      result: "FAIL: " + String(error) + "\n" + document.body.innerText,
    });
  }
})();
