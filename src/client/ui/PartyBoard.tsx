import type { CSSProperties, ReactNode } from "react";

export function PartyBoard({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  return (
    <div
      className="party-board"
      style={{ "--board-ratio": width / height } as CSSProperties}
    >
      {children}
    </div>
  );
}
