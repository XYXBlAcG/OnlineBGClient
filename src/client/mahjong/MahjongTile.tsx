import { tileName, tileType, tileSuit } from "../../domain/mahjong/types";
export function MahjongTile({ tile }: { tile: number }) {
  if (tile < 0)
    return (
      <svg viewBox="0 0 52 74" aria-hidden="true">
        <rect x="1" y="2" width="50" height="71" rx="6" fill="#286451" />
        <rect
          x="3"
          y="2"
          width="46"
          height="65"
          rx="5"
          fill="#498f78"
          stroke="#8cbcac"
        />
        <path d="M12 13H40V55H12Z" stroke="#a3cbbd" fill="none" />
      </svg>
    );
  const rank = (tileType(tile) % 9) + 1,
    suit = tileSuit(tile),
    color = ["#ab323b", "#215e9c", "#237957"][suit];
  return (
    <svg viewBox="0 0 52 74" aria-hidden="true">
      <rect x="1" y="4" width="50" height="69" rx="6" fill="#347b65" />
      <rect
        x="1"
        y="1"
        width="50"
        height="67"
        rx="6"
        fill="#fffdf6"
        stroke="#d5d6cf"
      />
      {suit === 0 ? (
        <>
          <text x="26" y="28" textAnchor="middle" fontSize="24" fill={color}>
            {["一", "二", "三", "四", "五", "六", "七", "八", "九"][rank - 1]}
          </text>
          <text x="26" y="55" textAnchor="middle" fontSize="25" fill={color}>
            萬
          </text>
        </>
      ) : suit === 1 ? (
        Array.from({ length: rank }, (_, i) => (
          <circle
            key={i}
            cx={rank === 1 ? 26 : 16 + (i % 3) * 10}
            cy={rank === 1 ? 32 : 19 + Math.floor(i / 3) * 14}
            r={rank === 1 ? 11 : 4}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
        ))
      ) : (
        Array.from({ length: rank }, (_, i) => (
          <rect
            key={i}
            x={rank === 1 ? 23 : 14 + (i % 3) * 11}
            y={rank === 1 ? 20 : 12 + Math.floor(i / 3) * 15}
            width="6"
            height={rank === 1 ? 28 : 12}
            rx="2"
            fill={color}
          />
        ))
      )}
      {suit !== 0 && (
        <text x="26" y="64" textAnchor="middle" fontSize="9" fill={color}>
          {rank} {["万", "筒", "条"][suit]}
        </text>
      )}
      <title>{tileName(tile)}</title>
    </svg>
  );
}
