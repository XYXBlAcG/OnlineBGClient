import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({native:false}));
vi.mock("@tauri-apps/api/core",()=>({isTauri:()=>state.native,invoke:vi.fn()}));
import { VoiceDock, VoiceToolbar } from "../src/client/voice/VoiceControls";
afterEach(()=>{state.native=false;});
it("does not expose voice controls in the browser build",()=>{
  expect(renderToStaticMarkup(<><VoiceToolbar onOpen={()=>{}}/><VoiceDock/></>)).toBe("");
});
it("renders client controls without starting audio or claiming an active call",()=>{
  state.native=true;
  const html=renderToStaticMarkup(<><VoiceToolbar onOpen={()=>{}}/><VoiceDock/></>);
  expect(html).toContain("房间语音");expect(html).toContain("请通过客户端加入联机房间");
  expect(html).not.toContain("正在说话");expect(html).not.toContain("<audio");
});
