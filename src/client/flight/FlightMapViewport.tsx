import type { ComponentProps } from "react";
import { MapViewport } from "../MapViewport";
import { FlightBoardOverlay } from "./FlightBoardOverlay";
import { useFlightOverlay } from "./FlightWeatherContext";

export function FlightMapViewport(props: ComponentProps<typeof MapViewport>) {
  const flight = useFlightOverlay();
  return (
    <MapViewport
      {...props}
      overlay={flight ? <FlightBoardOverlay /> : props.overlay}
    />
  );
}
