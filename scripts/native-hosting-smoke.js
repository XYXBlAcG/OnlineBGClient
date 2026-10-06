(async () => {
  const invoke = (command,args) => window.__TAURI_INTERNALS__.invoke(command,args);
  const waitFor = async read => {for(let i=0;i<1600;i++){const value=read();if(value)return value;const error=document.querySelector(".error-notification");if(error)throw new Error(error.textContent);await new Promise(resolve=>setTimeout(resolve,100));}throw new Error(`等待超时：${read}`);};
  const button = text => [...document.querySelectorAll("button")].find(node=>node.textContent.trim()===text);
  try {
    if(new URLSearchParams(location.search).get("aux")==="about") {
      await waitFor(()=>document.querySelector(".native-content"));
      await invoke("mark_auxiliary");
      await invoke("close_auxiliary",{view:"about"});
      return;
    }
    await waitFor(()=>button("跨网络联机"));button("跨网络联机").click();
    (await waitFor(()=>button("一键创建公网房间"))).click();
    await waitFor(()=>document.querySelector(".room-toolbar"));
    const url=await invoke("start_host");
    await invoke("report_stage",{result:`HOST_READY ${url}`});
    button("关于").click();await waitFor(()=>window.auxiliaryOpened);
    await waitFor(()=>!document.querySelector(".app-shell [role=dialog]"));
    await new Promise(resolve=>setTimeout(resolve,500));
    const status=await invoke("probe_host",{url});
    if(!status.running||status.auxiliary||!status.reachable)throw new Error(`辅助窗口关闭影响公网服务：${JSON.stringify(status)}`);
    if(await invoke("start_host")!==url)throw new Error("辅助窗口关闭改变公网地址");
    if(!document.querySelector(".room-toolbar"))throw new Error("辅助窗口关闭退出房间");
    await invoke("stop_host");
    await invoke("report",{result:"PASS: native public room survives auxiliary window close; HTTPS health reachable; same tunnel reused; explicit service stop"});
  } catch(error) {await invoke("report",{result:`FAIL: ${error}\n${document.body.innerText}`});}
})();
