import { mechanicCards } from "./mechanic-cards";
import { starCards } from "./star-cards";
import { prayerCards } from "./prayer-cards";
import { extensionCards } from "./extension-cards";
import { statusCards } from "./status-cards";
import { covenantCards } from "./covenant-cards";
import { diceCards } from "./dice-cards";
export const extraCards = {
  ...mechanicCards,
  ...starCards,
  ...prayerCards,
  ...extensionCards,
  ...covenantCards,
  ...diceCards,
  ...statusCards,
};
