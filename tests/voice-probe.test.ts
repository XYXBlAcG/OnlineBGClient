import { afterEach, expect, it, vi } from "vitest";
import { MicrophoneProbe } from "../src/client/voice/probe";
import { voiceError } from "../src/client/voice/errors";
afterEach(()=>{vi.unstubAllGlobals();});
it("releases a microphone stream granted after the test was cancelled",async()=>{
  let grant!:(stream:MediaStream)=>void;
  const stop=vi.fn();
  vi.stubGlobal("navigator",{mediaDevices:{getUserMedia:()=>new Promise<MediaStream>(resolve=>{grant=resolve;})}});
  const probe=new MicrophoneProbe();
  const testing=probe.start("default",false,()=>{});
  probe.stop();
  grant({getTracks:()=>[{stop}]} as unknown as MediaStream);
  expect(await testing).toBe(false);expect(stop).toHaveBeenCalledTimes(1);
});
it("reports permission and missing device errors with actionable messages",()=>{
  const error=new Error("permission");error.name="NotAllowedError";
  expect(voiceError(error)).toContain("系统隐私设置");
  error.name="NotFoundError";expect(voiceError(error)).toContain("没有找到麦克风");
});
