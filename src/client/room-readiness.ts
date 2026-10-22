import type { Snapshot } from "../domain/protocol";
export function roomReadiness(seats: Snapshot["seats"]): {
  canStart: boolean;
  message: string;
} {
  const waiting = seats.flatMap((seat, index) => {
    if (seat.difficulty) return [];
    if (!seat.name) return [`席位 ${index + 1} 加入`];
    if (!seat.online) return [`${seat.name}重新连接`];
    return seat.ready ? [] : [`${seat.name}准备`];
  });
  return {
    canStart: waiting.length === 0,
    message: waiting.length ? `等待${waiting.join("、")}` : "所有玩家已准备",
  };
}
