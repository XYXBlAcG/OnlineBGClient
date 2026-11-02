import { type GameKind } from "../../domain/catalogue";
import { GameIcon } from "../GameIcon";
export function GameCover({ kind }: { kind: GameKind }) {
  return (
    <span className="club-cover" data-cover={kind} aria-hidden="true">
      <GameIcon kind={kind} />
    </span>
  );
}
