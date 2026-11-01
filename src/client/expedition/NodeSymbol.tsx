import type { NodeKind } from "../../domain/expedition/adventure-types";
import { nodeIcons } from "../../domain/expedition/map";
export function NodeSymbol({ kind }: { kind: NodeKind }) {
  return (
    <b aria-hidden="true">
      {kind === "treasure" ? (
        <span className="exp-route-chest" />
      ) : (
        nodeIcons[kind]
      )}
    </b>
  );
}
