import {
  cloneElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Panel } from "./ui/Controls";

export function DetailSurface({
  label,
  title,
  description,
  children,
  buttonClassName = "card-detail-button",
  buttonLabel = `查看${title}`,
}: {
  label: string;
  title: string;
  description: ReactNode;
  children: (button: ReactNode) => ReactElement;
  buttonClassName?: string;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = children(
    <button
      className={buttonClassName}
      aria-label={buttonLabel}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        setOpen(true);
      }}
    >
      ⓘ
    </button>,
  );
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {cloneElement(trigger as ReactElement<Record<string, unknown>>, {
            tabIndex: 0,
            "aria-label": label,
          })}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="ui-tooltip"
            sideOffset={8}
            collisionPadding={12}
          >
            {description}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <Panel title={title} open={open} onOpenChange={setOpen}>
        {description}
      </Panel>
    </Tooltip.Provider>
  );
}
