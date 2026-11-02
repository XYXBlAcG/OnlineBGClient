import type { NodeKind } from "../../domain/expedition/adventure-types";
const shapes: Record<NodeKind, string> = {
  battle: "m8 7 17 18m-2-18L7 25M6 19l7 7m7-7 6 6",
  elite: "M9 7h14v5l-3 3v10H12V15l-3-3Zm1 18h12M12 7V4m8 3V4",
  boss: "m5 10 6 6 5-11 5 11 6-6-3 16H8Z",
  event: "M12 10a5 5 0 1 1 7 5c-3 1-3 4-3 5m0 5h.01",
  shop: "M6 13h20l-3-7H9Zm2 0v13h16V13m-11 13v-8h6v8",
  camp: "M6 27h20m-16-5c-5-5 7-7 2-13m6 13c-5-5 7-7 2-13",
  treasure: "M5 14h22v13H5Zm0 0V8h22v6m-12-3h4v8h-4Z",
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
