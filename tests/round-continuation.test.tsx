import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RoundContinuation } from "../src/client/RoundContinuation";
it("shows the missing readiness and disables starting until guests are ready", () => {
  const html = renderToStaticMarkup(
    <RoundContinuation
      snapshot={{
        actor: 0,
        canManage: true,
        seats: [
          { id: "a", name: "甲", difficulty: null, online: true, ready: true },
          { id: "b", name: "乙", difficulty: null, online: true, ready: false },
        ],
      }}
      pending={false}
      onStart={() => {}}
      onReady={() => {}}
    />,
  );
  expect(html).toContain("等待乙准备");
  expect(html).toMatch(/disabled=""[^>]*>开始下一局/);
});
