import { expect, it, vi } from "vitest";
import {
  installSelectionPolicy,
  selectAll,
} from "../src/client/selection-policy";
function fixture(kind: "input" | "copy" | "button") {
  const range = { selectNodeContents: vi.fn() },
    selection = {
      removeAllRanges: vi.fn(),
      addRange: vi.fn(),
      isCollapsed: true,
    };
  const element = {
    select: vi.fn(),
    closest: vi.fn((selector: string) =>
      (kind === "input" && selector.includes("input")) ||
      (kind === "copy" && selector.includes("data-copyable"))
        ? element
        : null,
    ),
  };
  const document = Object.assign(new EventTarget(), {
    activeElement: element,
    body: {},
    getSelection: () => selection,
    createRange: () => range,
  }) as unknown as Document;
  return { document, element, selection, range };
}
it("selects input content and copyable text without selecting the page", () => {
  const input = fixture("input");
  selectAll(input.document);
  expect(input.element.select).toHaveBeenCalledOnce();
  expect(input.range.selectNodeContents).not.toHaveBeenCalled();
  const copy = fixture("copy");
  selectAll(copy.document);
  expect(copy.range.selectNodeContents).toHaveBeenCalledWith(copy.element);
  expect(copy.selection.addRange).toHaveBeenCalledWith(copy.range);
  const button = fixture("button");
  selectAll(button.document);
  expect(button.selection.removeAllRanges).toHaveBeenCalledOnce();
  expect(button.selection.addRange).not.toHaveBeenCalled();
});
it("isolates only plain platform select-all and removes its listeners", () => {
  const { document, element } = fixture("input"),
    dispose = installSelectionPolicy(document);
  const key = (values: object) =>
    Object.assign(new Event("keydown", { cancelable: true }), {
      key: "a",
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      isComposing: false,
      ...values,
    });
  const first = key({});
  document.dispatchEvent(first);
  expect(first.defaultPrevented).toBe(true);
  expect(element.select).toHaveBeenCalledOnce();
  const other = key({ key: "c" });
  document.dispatchEvent(other);
  expect(other.defaultPrevented).toBe(false);
  const modified = key({ shiftKey: true });
  document.dispatchEvent(modified);
  expect(modified.defaultPrevented).toBe(false);
  dispose();
  const next = key({});
  document.dispatchEvent(next);
  expect(next.defaultPrevented).toBe(false);
});

it("blocks drag selection on controls but permits marked text, including text-node event targets", () => {
  const { document, element } = fixture("copy"),
    add = vi.spyOn(document, "addEventListener"),
    dispose = installSelectionPolicy(document);
  const handler = add.mock.calls.find(
    ([name]) => name === "selectstart",
  )![1] as (event: Event) => void;
  const blocked = {
    target: { nodeType: 1, closest: () => null },
    preventDefault: vi.fn(),
  } as unknown as Event;
  handler(blocked);
  expect(blocked.preventDefault).toHaveBeenCalledOnce();
  const allowed = {
    target: { nodeType: 3, parentElement: element },
    preventDefault: vi.fn(),
  } as unknown as Event;
  handler(allowed);
  expect(allowed.preventDefault).not.toHaveBeenCalled();
  dispose();
});
it("handles Ctrl+A without suppressing composition or other modified shortcuts", () => {
  const { document, element } = fixture("input"),
    dispose = installSelectionPolicy(document);
  const key = (isComposing: boolean) =>
    Object.assign(new Event("keydown", { cancelable: true }), {
      key: "a",
      metaKey: false,
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      isComposing,
    });
  const normal = key(false);
  document.dispatchEvent(normal);
  expect(normal.defaultPrevented).toBe(true);
  expect(element.select).toHaveBeenCalledOnce();
  const composing = key(true);
  document.dispatchEvent(composing);
  expect(composing.defaultPrevented).toBe(false);
  expect(element.select).toHaveBeenCalledOnce();
  dispose();
});

it("does not expand a control's ancestor error panel into a selection", () => {
  const f = fixture("button"),
    panel = {};
  f.element.closest.mockImplementation((selector) =>
    selector.startsWith("button,")
      ? f.element
      : selector.includes("data-copyable")
        ? (panel as typeof f.element)
        : null,
  );
  selectAll(f.document);
  expect(f.selection.addRange).not.toHaveBeenCalled();
});
it("rejects binding platform select-all as a game shortcut while allowing modified chords", async () => {
  const { CommandRegistry } = await import("../src/client/commands"),
    registry = new CommandRegistry();
  registry.register({
    id: "action",
    title: "操作",
    scope: "uno",
    binding: "F3",
    enabled: () => true,
    run: () => {},
  });
  for (const binding of ["Meta+A", "Control+A"])
    expect(() => registry.bind("action", binding)).toThrow("系统保留");
  expect(() => registry.bind("action", "Meta+Shift+A")).not.toThrow();
});
