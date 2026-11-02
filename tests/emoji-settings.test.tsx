import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("../src/client/emoji/client", () => ({
  emojiRegistry: {
    subscribe: () => () => {},
    snapshot: () => ({
      supported: true,
      installed: false,
      enabled: false,
      phase: "downloading",
      progress: 0.25,
    }),
  },
}));
import { EmojiSettings } from "../src/client/emoji/EmojiSettings";
it("groups download progress and cancellation in a compact settings row", () => {
  const html = renderToStaticMarkup(<EmojiSettings proxy="127.0.0.1:7897" />);
  expect(html).toContain('class="emoji-download-progress"');
  expect(html).toContain('role="status"');
  expect(html).toContain('class="emoji-actions"');
});
