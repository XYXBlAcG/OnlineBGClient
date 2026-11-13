import "./ui/game-icons.css";
import type { GameKind } from "../domain/catalogue";
export function GameIcon({ kind }: { kind: GameKind }) {
  return (
    <span className="game-symbol" data-game-icon={kind}>
      {kind === "tq" ? (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="m24 3 6 12h13l-7 10 7 11H30l-6 10-6-10H5l7-11-7-10h13Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          {[
            [24, 12],
            [15, 29],
            [33, 29],
            [24, 24],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3.2" fill="currentColor" />
          ))}
        </svg>
      ) : kind === "sgs" ? (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="M24 5 40 12v13c0 9-10 15-16 19C18 40 8 34 8 25V12Z"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            d="m16 15 17 20M32 14 15 35m-3-9 9 8m7-10 8 8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="m16 15 4 1-3 4Zm16-1-4 1 3 4Z" fill="currentColor" />
        </svg>
      ) : kind === "scmj" ? (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect
            x="4"
            y="11"
            width="20"
            height="30"
            rx="4"
            stroke="currentColor"
            strokeWidth="2.5"
            transform="rotate(-8 14 26)"
          />
          <rect
            x="23"
            y="7"
            width="20"
            height="30"
            rx="4"
            fill="var(--cover-bg,var(--surface))"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          {[
            [29, 15],
            [37, 15],
            [29, 23],
            [37, 23],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2" fill="currentColor" />
          ))}
          <path
            d="M11 20v13m6-13v13m-8-9h11"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      ) : kind === "expedition" ? (
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
      ) : kind === "graphwar" ? (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="M7 41V7M7 41h34"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M10 35c7-2 10-9 13-16S29 9 34 9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="34" cy="9" r="2.5" fill="currentColor" />
          <path
            d="M12 16h5M12 23h5M12 30h5M20 37v4M28 37v4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : kind === "ccbs" ? (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="m24 5 15 12-15 26L9 17Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M9 17h30M24 5l-5 12 5 26 5-26-5-12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      ) : kind === "ktd" ? (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="m24 5 16 9v20l-16 9-16-9V14Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M24 14v20M16 19l8 5 8-5M16 29l8-5 8 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="24" r="3" fill="currentColor" />
        </svg>
      ) : kind === "pool" ? (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle
            cx="26"
            cy="26"
            r="15"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <circle
            cx="26"
            cy="26"
            r="7"
            fill="var(--cover-bg,var(--surface))"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="26"
            cy="22.6"
            r="2.1"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <circle
            cx="26"
            cy="29.4"
            r="2.1"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M7 9.5 14.8 17.3"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      ) : kind === "ddz" ? (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect
            x="5"
            y="10"
            width="16"
            height="27"
            rx="3"
            stroke="currentColor"
            strokeWidth="2"
            transform="rotate(-12 13 23)"
          />
          <rect
            x="28"
            y="10"
            width="16"
            height="27"
            rx="3"
            stroke="currentColor"
            strokeWidth="2"
            transform="rotate(12 36 23)"
          />
          <rect
            x="16"
            y="7"
            width="17"
            height="29"
            rx="3"
            fill="var(--cover-bg,var(--surface))"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="m24 14 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="M6 26 41 9 28 40l-6-10-9-4Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="m13 26 10-7M22 30l6-10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M7 39c4-2 7-2 11 0M28 7c2 3 2 6 0 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 3"
          />
        </svg>
      )}
    </span>
  );
}
