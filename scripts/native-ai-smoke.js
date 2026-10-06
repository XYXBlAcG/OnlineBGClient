(async () => {
  const waitFor = async (read, timeout = 30000) => {
    const deadline = performance.now() + timeout;
    while (performance.now() < deadline) {
      const value = read();
      if (value) return value;
      const error = document.querySelector(".compute-failure");
      if (error) throw new Error(error.textContent);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`等待超时：${String(read)}`);
  };
  const button = (text) =>
    [...document.querySelectorAll("button")].find(
      (node) => node.textContent.trim() === text,
    );
  const choose = async (label, text) => {
    document.querySelector(`[role=combobox][aria-label="${label}"]`).click();
    (
      await waitFor(() =>
        [...document.querySelectorAll("[role=option]")].find(
          (node) => node.textContent.replace(/✓/g, "").trim() === text,
        ),
      )
    ).click();
    await waitFor(() => !document.querySelector("[role=listbox]"));
  };
  try {
    await waitFor(() => button("设置"));
    button("设置").click();
    await waitFor(() => {
      const prefs = JSON.parse(localStorage.getItem("onlinebg.preferences") || "{}");
      return prefs.benchmarkVisible && prefs.performance?.mode === "multi" && prefs.theme === "dark";
    });
    await waitFor(() => !document.querySelector(".app-shell [role=dialog]"));
    [...document.querySelectorAll(".game-card button")]
      .find((node) => node.textContent.includes("连续跳跃与营地竞速"))
      .click();
    await waitFor(() =>
      document
        .querySelector(".game-card.active")
        ?.textContent.includes("连续跳跃与营地竞速"),
    );
    (await waitFor(() => button("6 个困难 AI 性能测试"))).click();
    await waitFor(() =>
      document
        .querySelector('[aria-label="真人人数"]')
        ?.textContent.includes("0 人"),
    );
    button("创建房间").click();
    (await waitFor(() => button("开始对局"))).click();
    const count = () =>
      Number(
        document
          .querySelector(".compute-status")
          ?.textContent.match(/已完成 (\d+) 次决策/)?.[1] || 0,
      );
    await waitFor(() => count() >= 30, 500000);
    button("暂停 AI 测试").click();
    await waitFor(() => button("继续 AI 测试"));
    const paused = count();
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (count() !== paused) throw new Error("暂停后仍继续提交动作");
    button("继续 AI 测试").click();
    await waitFor(() => count() > paused, 30000);
    await window.__TAURI_INTERNALS__.invoke("report", {
      result: `PASS: native flat AI workers, 30 hard decisions, pause/resume; ${navigator.userAgent}; ${document.querySelector(".compute-status").textContent}`,
    });
  } catch (error) {
    await window.__TAURI_INTERNALS__.invoke("report", {
      result: `FAIL: ${String(error)}\n${document.body.innerText}`,
    });
  }
})();
