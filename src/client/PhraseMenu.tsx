import * as Popover from "@radix-ui/react-popover";
import type { PhraseGroup } from "../domain/phrases";
export function PhraseMenu({
  groups,
  onSend,
}: {
  groups: PhraseGroup[];
  onSend: (text: string) => void;
}) {
  return (
    <div className="phrase-groups">
      {groups
        .filter((group) => group.items.length)
        .map((group, index) => (
          <details key={index} open={index === 0}>
            <summary>{group.name}</summary>
            <div className="quick-phrases">
              {group.items.map((text, item) => (
                <Popover.Close asChild key={item}>
                  <button type="button" onClick={() => onSend(text)}>
                    {text}
                  </button>
                </Popover.Close>
              ))}
            </div>
          </details>
        ))}
    </div>
  );
}
