import { arcadeLibraryEntry } from "../../domain/arcade/campaign";
import {
  gameCatalogue,
  gameKinds,
  type GameKind,
} from "../../domain/catalogue";

export type LibraryEntry = GameKind | "arcade";
export const libraryEntries: LibraryEntry[] = ["arcade", ...gameKinds];
export const libraryCatalogue = {
  ...gameCatalogue,
  arcade: arcadeLibraryEntry,
};
