import { it, expect } from "vitest";
import { installContextMenuPolicy } from "../src/client/desktop-context-menu";

it("suppresses the native client browser menu and removes the listener on disposal", () => {
  const target = new EventTarget();
  const dispose = installContextMenuPolicy(target, true);
  const event = new Event("contextmenu", { cancelable: true });
  target.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  dispose();
  const next = new Event("contextmenu", { cancelable: true });
  target.dispatchEvent(next);
  expect(next.defaultPrevented).toBe(false);
});
it("preserves normal browser context menus for mobile and web players", () => {
  const target = new EventTarget();
  const dispose = installContextMenuPolicy(target, false);
  const event = new Event("contextmenu", { cancelable: true });
  target.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  dispose();
});
