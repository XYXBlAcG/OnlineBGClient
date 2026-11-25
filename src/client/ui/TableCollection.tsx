import { useState, type ReactNode } from "react";
import { useMobile } from "../use-mobile";
import { Button, Panel } from "./Controls";

export function TableCollection({
  title,
  children,
  className = "table-collection",
  "data-table-region": region,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  "data-table-region"?: string;
}) {
  const mobile = useMobile();
  const [open, setOpen] = useState(false);
  if (!mobile)
    return (
      <details className={className} data-table-region={region} open>
        <summary>{title}</summary>
        {children}
      </details>
    );
  return (
    <>
      <div className={className} data-table-region={region}>
        <Button
          className="table-collection-toggle"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          {title}
        </Button>
      </div>
      <Panel
        open={open}
        onOpenChange={setOpen}
        title={title}
        className="table-collection-panel"
      >
        {children}
      </Panel>
    </>
  );
}
