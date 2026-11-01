import { mechanicCards } from "./mechanic-cards";
import { starCards } from "./star-cards";
import { prayerCards } from "./prayer-cards";
import { extensionCards } from "./extension-cards";
export const extraCards = {
  ...mechanicCards,
  ...starCards,
  ...prayerCards,
  ...extensionCards,
};
