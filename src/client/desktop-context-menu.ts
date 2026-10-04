export function installContextMenuPolicy(
  target: EventTarget,
  desktop: boolean,
): () => void {
  if (!desktop) return () => {};
  const suppress = (event: Event) => event.preventDefault();
  target.addEventListener("contextmenu", suppress, { capture: true });
  return () =>
    target.removeEventListener("contextmenu", suppress, { capture: true });
}
