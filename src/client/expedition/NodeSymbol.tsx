import type { NodeKind } from "../../domain/expedition/adventure-types";
const shapes: Record<NodeKind, string> = {
  battle: "m8 7 17 18m-2-18L7 25M6 19l7 7m7-7 6 6",
  elite: "M9 7h14v5l-3 3v10H12V15l-3-3Zm1 18h12M12 7V4m8 3V4",
  boss: "m5 10 6 6 5-11 5 11 6-6-3 16H8Z",
  event: "M12 10a5 5 0 1 1 7 5c-3 1-3 4-3 5m0 5h.01",
  shop: "M6 13h20l-3-7H9Zm2 0v13h16V13m-11 13v-8h6v8",
  camp: "M6 27h20m-16-5c-5-5 7-7 2-13m6 13c-5-5 7-7 2-13",
  treasure: "M5 14h22v13H5Zm0 0V8h22v6m-12-3h4v8h-4Z",
  oracle:
    "M16 4v5m0 14v5M4 16h5m14 0h5M8 8l3 3m10 10 3 3M8 24l3-3M21 11l3-3M11 16a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z",
  contract: "M9 5h14v22H9Zm4 5h6m-6 4h6m-6 4h4m5 4 3 3m-3 0 3-3",
  forge: "M7 10h18l-2 16H9Zm3 0V7h12v3m-9 5v7m6-7v7",
  secret: "M16 4 6 16l10 12 10-12ZM10 16h12m-6-6v12",
  pawnshop: "M6 12h20l-2 15H8Zm4 0V8h12v4m-8 4h4m-4 4h4m-4 4h4",
  gamble: "M8 8h16v16H8Zm4 4h8v8h-8ZM11 20h.01M21 12h.01",
  library: "M7 5h7v22H7Zm9 0h9v22h-9Zm3 5h3m-3 4h3m-3 4h3",
  hunt: "M16 4v8m0 8v8M4 16h8m8 0h8M16 12a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
};
export function NodeSymbol({ kind }: { kind: NodeKind }) {
  return (
    <b aria-hidden="true" className="exp-node-symbol">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={shapes[kind]} />
      </svg>
    </b>
  );
}
