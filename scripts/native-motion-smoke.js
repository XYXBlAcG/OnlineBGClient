(async () => {
  const waitFor = async (read) => {
    for (let i = 0; i < 4000; i++) {
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
    await waitFor(() => window.nativeCompleted?.settings);
    await waitFor(
      () => document.documentElement.dataset.gameMotion === "enhanced",
    );
    button("创建房间").click();
    (await waitFor(() => button("开始对局"))).click();
    (await waitFor(() => button("我先出牌"))).click();
    let observed = false;
    for (let attempt = 0; attempt < 8 && !observed; attempt++) {
      const draw = await waitFor(() =>
        [...document.querySelectorAll("button")].find(
          (node) => node.textContent.startsWith("不出") && !node.disabled,
        ),
      );
      draw.click();
      for (let i = 0; i < 45; i++) {
        const flipper = document.querySelector(".game-motion-flipper");
        if (flipper) {
          const shell = flipper.parentElement,
            key = shell.dataset.motionReveal,
            card = document.querySelector(
              `.original-game .uno-list [data-motion-key="uno-card-${key}"]`,
            );
          if (!card || card.style.opacity !== "0")
            throw new Error("翻牌实体未正确交接");
          const animation = flipper.getAnimations()[0];
          animation.pause();
          animation.currentTime = 650;
          if (!getComputedStyle(flipper).transform.includes("matrix3d"))
            throw new Error("原生 WebView 未执行 3D 翻牌");
          if (
            getComputedStyle(flipper.firstElementChild).backfaceVisibility !==
            "hidden"
          )
            throw new Error("牌背可见性错误");
          document
            .querySelector(".uno-list")
            .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
          if (
            document.querySelector(".game-motion-copy,.game-motion-label") ||
            card.style.opacity === "0"
          )
            throw new Error("操作中断未释放动画和手牌");
          observed = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    if (!observed) throw new Error("未观察到本人摸牌翻面");
    await window.__TAURI_INTERNALS__.invoke("report", {
      result: `PASS: native UNO own draw 3D back/front, masked hand, WK/WebView animation and pointer cancellation; ${navigator.userAgent}`,
    });
  } catch (error) {
    await window.__TAURI_INTERNALS__.invoke("report", {
      result: `FAIL: ${error}\n${document.body.innerText}`,
    });
  }
})();
