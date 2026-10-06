(async () => {
  const waitFor = async read => {for (let i=0;i<300;i++) {const value=read(); if (value) return value; await new Promise(resolve=>setTimeout(resolve,100));} throw new Error(`等待超时：${read}`);};
  const button = text => [...document.querySelectorAll("button")].find(node=>node.textContent.trim()===text);
  const choose = async (label, text) => {document.querySelector(`[role=combobox][aria-label="${label}"]`).click(); (await waitFor(()=>[...document.querySelectorAll("[role=option]")].find(node=>node.textContent.replace(/✓/g, "").trim()===text))).click(); await waitFor(()=>!document.querySelector("[role=listbox]"));};
  const view = new URLSearchParams(location.search).get("aux");
  try {
    await waitFor(()=>document.querySelector(".native-content,.chat-panel,.beginner-guide-content"));
    if (document.querySelector(".app-shell")) throw new Error("辅助窗口初始化了 App");
    await window.__TAURI_INTERNALS__.invoke("check_native", {view});
    if (view === "chat") {
      const input=document.querySelector('[aria-label="消息"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"原生聊天测试");
      input.dispatchEvent(new Event("input",{bubbles:true}));
      await waitFor(()=>!button("发送").disabled);
      button("发送").click();
      await waitFor(()=>document.querySelector(".chat-messages")?.textContent.includes("原生聊天测试"));
    } else if(view === "guide") {
      button("下一步").click();
      await waitFor(()=>document.querySelector(".beginner-guide-heading")?.textContent.includes("2 /"));
      button("上一步").click();
      await waitFor(()=>document.querySelector(".beginner-guide-heading")?.textContent.includes("1 /"));
      document.querySelector(".beginner-guide-context > button").click();
    } else if (view === "settings") {
      const rect=document.querySelector('[role=switch]').getBoundingClientRect();
      if(rect.width!==36||rect.height!==21)throw new Error(`设置开关尺寸异常：${rect.width} × ${rect.height}`);
      await choose("外观主题", "深色");
      const toggle=document.querySelector('[role=switch][aria-label="显示 AI 性能测试"]');
      if (toggle.getAttribute("aria-checked")!=="true") toggle.click();
      await choose("CPU加速模式", "多线程");
      await waitFor(()=>document.documentElement.dataset.theme==="dark");
    } else if (view === "actions") {
      (await waitFor(()=>button("确认动作"))).click();
      await window.__TAURI_INTERNALS__.invoke("complete_auxiliary", {view});
      return;
    } else if (view === "about") {
      if (!document.body.textContent.includes("作者 Github 主页")) throw new Error("关于页缺少作者链接");
    } else if (view === "records") {
      (await waitFor(()=>document.querySelector(".record-row > button"))).click();
      await waitFor(()=>document.querySelector(".original-game"));
      if (button("结束游戏")) throw new Error("回放含结束按钮");
      (await waitFor(()=>button("播放回放"))).click();
      await waitFor(()=>button("暂停回放"));
      button("暂停回放").click();
      await choose("回放速度", "2×");
    }
    await window.__TAURI_INTERNALS__.invoke("complete_auxiliary", {view});
    if(view !== "chat" && view !== "guide") await window.__TAURI_INTERNALS__.invoke("auxiliary_intent", {intent:{view,type:"close"}});
  } catch(error) {await window.__TAURI_INTERNALS__.invoke("report", {result:`FAIL: auxiliary ${view}: ${error}\n${document.body.innerText}`});}
})();
