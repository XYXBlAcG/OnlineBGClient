import type { GameState } from "../domain/types";
export interface GameHighlight {
  selector: string;
  label?: string;
  destination?: string;
}
export function gameHighlights(
  previous: GameState,
  next: GameState,
): GameHighlight[] {
  if (previous.kind !== next.kind) return [];
  const highlights: GameHighlight[] = [];
  const player = (index: number, label?: string) =>
    highlights.push({ selector: `[data-game-avatar="${index}"]`, label });
  const target = (name: string) =>
    highlights.push({ selector: `[data-guide-target="${name}"]` });
  switch (next.kind) {
    case "dominion":
      if (previous.kind === "dominion") {
        if (next.view.turn !== previous.view.turn) player(next.view.turn);
        if (next.view.coins !== previous.view.coins) target("dominion.status");
      }
      break;
    case "sgs":
      if (previous.kind === "sgs") {
        next.view.playerBlood.forEach((hp, i) => {
          const delta = hp - previous.view.playerBlood[i];
          if (delta) player(i, `${delta > 0 ? "+" : ""}${delta} 体力`);
        });
        if (next.view.whoseTurn !== previous.view.whoseTurn)
          player(next.view.whoseTurn);
      }
      break;
    case "ccbs":
      if (previous.kind === "ccbs") {
        if (next.view.waitFor !== previous.view.waitFor)
          player(next.view.waitFor);
        next.view.playerGem.forEach((gems, i) => {
          gems.forEach((value, g) => {
            const delta = value - previous.view.playerGem[i][g];
            if (delta)
              highlights.push({
                selector: `[data-guide-target="ccbs.bank"][data-guide-id="${g}"]`,
                destination: `[data-game-avatar="${i}"]`,
                label: delta > 0 ? `+${delta}` : `${delta}`,
              });
          });
        });
      }
      break;
    case "ktd":
      if (previous.kind === "ktd") {
        next.view.playerData.forEach((p, i) => {
          if (
            p.resources.some(
              (v, r) => v !== previous.view.playerData[i]?.resources[r],
            )
          )
            player(i);
        });
        if (next.view.lastDice !== previous.view.lastDice) target("ktd.roll");
        if (next.view.robber !== previous.view.robber) target("ktd.hand");
      }
      break;
    case "dy":
      if (previous.kind === "dy") {
        next.view.potValues.forEach((value, i) => {
          if (value !== previous.view.potValues[i])
            highlights.push({
              selector: `[data-guide-target="dy.pot"][data-guide-id="${i}"]`,
            });
        });
        next.view.scores.forEach((value, i) => {
          if (value !== previous.view.scores[i]) player(i);
        });
      }
      break;
    case "uno":
      if (previous.kind === "uno") {
        if (next.view.currentColor !== previous.view.currentColor)
          highlights.push({ selector: '[data-guide-target="uno.status"]' });
        if (next.view.waitFor !== previous.view.waitFor)
          player(next.view.waitFor);
      }
      break;
    case "ddz":
      if (previous.kind === "ddz") {
        next.view.playerRestCardCounts.forEach((value, i) => {
          if (value !== previous.view.playerRestCardCounts[i]) player(i);
        });
      }
      break;
    case "tq":
      if (previous.kind === "tq" && next.view.waitFor !== previous.view.waitFor)
        player(next.view.waitFor);
      break;
    case "fxq":
      if (
        previous.kind === "fxq" &&
        next.view.lastDice !== previous.view.lastDice
      )
        player(next.view.lastDicePlayer);
      break;
  }
  return highlights.slice(0, 8);
}
