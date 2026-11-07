import { createContext, useContext } from "react";
import type { Candidate, FlightView } from "../../domain/types";

export interface FlightOverlayState {
  view: FlightView;
  actor: number;
  candidates: Candidate[];
}

const FlightOverlayContext = createContext<FlightOverlayState | null>(null);
export const FlightOverlayProvider = FlightOverlayContext.Provider;

export function useFlightOverlay() {
  return useContext(FlightOverlayContext);
}
