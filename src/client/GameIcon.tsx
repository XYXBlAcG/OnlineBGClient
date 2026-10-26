import "./ui/game-icons.css";
import { gameCatalogue, type GameKind } from "../domain/catalogue";
export function GameIcon({ kind }: { kind: GameKind }) {
  return (
    <span className="game-symbol" data-game-icon={kind}>
      {kind === "expedition" ? (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="M13 40h24M17 40V18h16v22M14 18l11-10 11 10M21 40V29h8v11"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="m38 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="currentColor" />
          <path d="M23 20h4v5h-4z" fill="currentColor" />
        </svg>
      ) : kind === "dominion" ? (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect
            x="8"
            y="10"
            width="27"
            height="32"
            rx="5"
            stroke="currentColor"
            strokeWidth="2"
            transform="rotate(-10 22 26)"
          />
          <path d="m14 17 7 6 5-12 5 12 7-6-3 17H17Z" fill="currentColor" />
          <path
            d="M18 38h16"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      ) : kind === "uno" ? (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <rect
            x="6"
            y="8"
            width="25"
            height="33"
            rx="5"
            fill="#e5444e"
            transform="rotate(-12 18 24)"
          />
          <rect
            x="16"
            y="6"
            width="25"
            height="34"
            rx="5"
            fill="#246bd2"
            transform="rotate(10 28 24)"
          />
          <ellipse
            cx="29"
            cy="23"
            rx="8"
            ry="13"
            fill="#fff"
            transform="rotate(24 29 23)"
          />
          <text
            x="29"
            y="27"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#c32636"
          >
            UNO
          </text>
        </svg>
      ) : kind === "dy" ? (
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M12 3h8M14 3v10L5 26a2 2 0 0 0 2 3h18a2 2 0 0 0 2-3l-9-13V3M10 20h12"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="24" r="1.5" fill="currentColor" />
        </svg>
      ) : (
        gameCatalogue[kind].symbol
      )}
    </span>
  );
}
