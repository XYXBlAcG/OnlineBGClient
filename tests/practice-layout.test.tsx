import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { Practice } from "../src/client/Practice";
import { configSchema } from "../src/domain/protocol";

it("reuses the room guide slot and hides the whole sidebar with the guide", () => {
  const source = configSchema.parse({
    kind: "fxq",
    humans: 2,
    ai: [],
    team: false,
    training: false,
    flight: { mode: "classic" },
  });
  const html = renderToString(
    createElement(Practice, { source, onClose: () => {} }),
  );
  expect(html).toContain('class="practice-layout" data-guide-open="true"');
  expect(html).toContain("room-sidebar practice-sidebar");
  expect(html).toContain("room-guide-slot");
  expect(html).not.toContain("practice-guide");
  expect(html).not.toContain("返回引导");
});
