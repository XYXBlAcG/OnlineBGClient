import { formatBinding } from "../commands";

export function Shortcut({ binding }: { binding: string }) {
  const text = formatBinding(binding);
  return text ? <kbd>{text}</kbd> : null;
}
