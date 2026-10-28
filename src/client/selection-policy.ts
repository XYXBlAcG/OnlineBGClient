export const editableText =
  'textarea,input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="hidden"])';
export const copyableText =
  '[data-copyable],[role="alert"],[contenteditable="true"],[contenteditable=""]';
const controls =
  'button,summary,[role="button"],[role="tab"],[role="menuitem"],[role="option"]';
export function selectAll(document: Document): void {
  const active = document.activeElement;
  const input = active?.closest<HTMLInputElement | HTMLTextAreaElement>(
    editableText,
  );
  if (input) {
    input.select();
    return;
  }
  const selection = document.getSelection();
  const selected =
    selection && !selection.isCollapsed
      ? selection.focusNode?.parentElement
      : null;
  const target = active && active !== document.body ? active : selected;
  const scope = target?.closest(controls)
    ? null
    : target?.closest(copyableText);
  selection?.removeAllRanges();
  if (!scope || !selection) return;
  const range = document.createRange();
  range.selectNodeContents(scope);
  selection.addRange(range);
}
export function installSelectionPolicy(document: Document): () => void {
  const keyboard = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.shiftKey ||
      !(event.metaKey || event.ctrlKey) ||
      event.key.toLowerCase() !== "a"
    )
      return;
    event.preventDefault();
    selectAll(document);
  };
  const selecting = (event: Event) => {
    const node = event.target as Node | null;
    const element = (
      node?.nodeType === 3 ? node.parentElement : node
    ) as Element | null;
    if (
      element?.closest?.(controls) ||
      !element?.closest?.(`${editableText},${copyableText}`)
    )
      event.preventDefault();
  };
  document.addEventListener("keydown", keyboard, { capture: true });
  document.addEventListener("selectstart", selecting);
  return () => {
    document.removeEventListener("keydown", keyboard, { capture: true });
    document.removeEventListener("selectstart", selecting);
  };
}
