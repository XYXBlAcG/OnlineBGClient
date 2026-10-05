import type { Snapshot } from "../domain/protocol";
export function Avatars({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="room-avatars" aria-label="房间成员">
      {snapshot.seats.map((seat, index) => (
        <span
          key={seat.id}
          className={`player-avatar ${seat.online ? "" : "offline"}`}
        >
          <span className="avatar-face">{seat.difficulty ? "🤖" : "😊"}</span>
          <span>
            {seat.name || "空位"}
            {index === snapshot.actor ? " · 我" : ""}
          </span>
        </span>
      ))}
    </div>
  );
}
