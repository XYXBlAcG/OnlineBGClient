import { Select } from "./ui/Controls";
export function FocusControls({
  onExit,
  onChat,
  onEnd,
  unread,
  chatOpen = false,
  players = [],
  selected = "",
  onPlayer,
}: {
  onExit: () => void;
  onChat: () => void;
  onEnd?: () => void;
  unread: number;
  chatOpen?: boolean;
  players?: { id: string; name: string }[];
  selected?: string;
  onPlayer?: (id: string) => void;
}) {
  return (
    <nav className="focus-controls" aria-label="专注模式操作">
      {players.length > 1 && onPlayer && (
        <Select
          aria-label="当前本地玩家"
          value={selected}
          onValueChange={onPlayer}
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </Select>
      )}
      {onEnd && (
        <button data-room-action="end" onClick={onEnd}>
          结束对局
        </button>
      )}
      <button onClick={onExit}>退出专注</button>
      <button
        className={`immersive-chat ${unread ? "chat-unread" : ""}`}
        aria-expanded={chatOpen}
        onClick={onChat}
      >
        聊天{unread ? ` · ${unread}` : ""}
      </button>
    </nav>
  );
}
