import type { LibraryEntry } from "./library-entries";
import { GameIcon } from "../GameIcon";
export function GameCover({ kind }: { kind: LibraryEntry }) {
  return (
    <span className="club-cover" data-cover={kind} aria-hidden="true">
      {kind === "arcade" ? (
        <span className="club-arcade-icons">
          <GameIcon kind="miner" />
          <GameIcon kind="fxq" />
        </span>
      ) : (
        <GameIcon kind={kind} />
      )}
    </span>
  );
}
