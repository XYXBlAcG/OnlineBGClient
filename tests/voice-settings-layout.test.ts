import { readFileSync } from "node:fs";
import { expect,it } from "vitest";
it("voice fields exclude shared switch labels and input meter has its own accessible surface",()=>{
 const css=readFileSync("src/client/voice/voice.css","utf8"),source=readFileSync("src/client/voice/VoiceSettings.tsx","utf8");
 expect(css).toContain(".voice-settings label:not(.ui-switch-label)");expect(css).not.toMatch(/\.voice-settings label\s*\{/);
 expect(source).toContain('role="meter"');expect(source).toContain('className="voice-device-grid"');expect(source).toContain('className="voice-input-level"');
});
