import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export function ExpeditionDrawer({
  open,
  title,
  onClose,
  children,
  className = "",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return createPortal(
    <div className="exp-drawer-backdrop" onClick={onClose}>
      <section
        className={`exp-drawer ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <strong>{title}</strong>
          <button className="exp-drawer-trigger" onClick={onClose}>
            关闭
          </button>
        </header>
        <div className="exp-drawer-body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
