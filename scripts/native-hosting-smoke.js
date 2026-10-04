(async () => {
  const waitFor = async (find) => {
    for (let attempt = 0; attempt < 4000; attempt++) {
      if (attempt % 50 === 0 && !window.hostTestReady)
        await window.__TAURI_INTERNALS__.invoke("report_stage", {
          result:
            "PROGRESS " +
            String(find) +
            "\nTauri=" +
            globalThis.isTauri +
            "\n" +
            document.body.innerText,
        });
      const value = find();
      if (value) return value;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(
      "Timed out: " + String(find) + "\n" + document.body.innerText,
    );
  };
  const button = (text) =>
    [...document.querySelectorAll("button")].find(
      (button) => button.textContent === text,
    );
  try {
    await waitFor(() => button("跨网络联机"));
    button("跨网络联机").click();
    await waitFor(() => button("一键创建公网房间"));
    document.querySelector('[role=combobox][aria-label="真人人数"]').click();
    const option = await waitFor(() =>
      [...document.querySelectorAll("[role=option]")].find(
        (option) => option.textContent.trim() === "2 人",
      ),
    );
    option.click();
    await waitFor(() => !document.querySelector("[role=listbox]"));
    button("一键创建公网房间").click();
    await waitFor(() => {
      if (document.querySelector(".notice"))
        throw new Error(document.querySelector(".notice").innerText);
      return document.querySelector(".room-toolbar");
    });
    const url = await window.__TAURI_INTERNALS__.invoke("start_host");
    window.hostTestReady = true;
    await window.__TAURI_INTERNALS__.invoke("report_stage", {
      result:
        "HOST_READY " +
        JSON.stringify({
          url,
          room: document
            .querySelector(".room-toolbar > strong")
            .textContent.split(" · ")[1],
        }),
    });
    await waitFor(
      () =>
        document.body.innerText.includes("好友已加入") &&
        !button("开始对局").disabled,
    );
    button("开始对局").click();
    await waitFor(() => button("我先出牌"));
    button("我先出牌").click();
    await waitFor(() => !button("我先出牌"));
    await waitFor(() => document.body.innerText.includes("浏览器验证通过"));
    button("结束游戏").click();
    await waitFor(() => document.querySelector("dialog[open]"));
    button("取消").click();
    await waitFor(() => !document.querySelector("dialog[open]"));
    if (document.querySelector(".finish-banner"))
      throw new Error("Cancel ended game");
    button("结束游戏").click();
    await waitFor(() => document.querySelector("dialog[open]"));
    button("确认结束").click();
    await waitFor(() => button("开始对局"));
    document.querySelector('[role=combobox][aria-label="房间游戏"]').click();
    (
      await waitFor(() =>
        [...document.querySelectorAll("[role=option]")].find(
          (option) => option.textContent.trim() === "三国杀",
        ),
      )
    ).click();
    await waitFor(() =>
      document
        .querySelector(".room-toolbar > strong")
        ?.textContent.includes("三国杀"),
    );
    if ((await window.__TAURI_INTERNALS__.invoke("start_host")) !== url)
      throw new Error("Game switch restarted tunnel");
    await waitFor(() => document.body.innerText.includes("切换验证通过"));
    await waitFor(
      () => document.querySelector('img[alt="公网表情"]')?.naturalWidth === 1,
    );
    button("关闭房间").click();
    await waitFor(() => document.querySelector("dialog[open]"));
    button("取消").click();
    await waitFor(() => !document.querySelector("dialog[open]"));
    if (!document.querySelector(".room-toolbar"))
      throw new Error("Cancel left room");
    button("关闭房间").click();
    await waitFor(() => document.querySelector("dialog[open]"));
    document.querySelector("dialog[open] button:last-child").click();
    await waitFor(() => document.querySelector(".game-library"));
    await window.__TAURI_INTERNALS__.invoke("report_stage", {
      result:
        "LEAVE_READY: native host ended game, confirmed room exit, back in lobby",
    });
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await window.__TAURI_INTERNALS__.invoke("report", {
      result:
        "PASS: native public host, mobile browser, public stickers, unchanged tunnel game switch, game cancellation/end, exit cancellation/confirmation, managed shutdown",
    });
  } catch (error) {
    await window.__TAURI_INTERNALS__.invoke("stop_host");
    await window.__TAURI_INTERNALS__.invoke("report", {
      result: "FAIL: " + String(error) + "\n" + document.body.innerText,
    });
  }
})();
