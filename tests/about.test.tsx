import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { ExternalLink } from "../src/client/ExternalLink";
import links from "../src/client/about.json";

it("links the project repository from the About page", () => {
  expect(links.project).toBe("https://github.com/XYXBlAcG/OnlineBGClient");
  const html = renderToString(
    createElement(ExternalLink, {
      name: "project",
      children: links.project,
    }),
  );
  expect(html).toContain('href="https://github.com/XYXBlAcG/OnlineBGClient"');
  expect(html).toContain("https://github.com/XYXBlAcG/OnlineBGClient");
});
