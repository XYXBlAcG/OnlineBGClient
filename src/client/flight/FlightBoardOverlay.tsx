import type { CSSProperties } from "react";
import { flightBoardPoint, flightMovePreviews } from "../../domain/flight";
import type { FlightWeather } from "../../domain/types";
import { useFlightOverlay } from "./FlightWeatherContext";

function WeatherLayer({ weather }: { weather: FlightWeather }) {
  return (
    <div
      className={`flight-weather-layer weather-${weather}`}
      aria-hidden="true"
    >
      {Array.from({ length: 10 }, (_, index) => (
        <i key={index} style={{ "--index": index } as CSSProperties} />
      ))}
    </div>
  );
}

export function FlightBoardOverlay() {
  const flight = useFlightOverlay();
  if (!flight) return null;
  const { view, actor, candidates } = flight;
  const special = view.special;
  const owner = actor >= 0 ? actor : 0;
  const playerCount = view.planePositionList.length / 4;
  const previews =
    actor >= 0 ? flightMovePreviews(view, actor, candidates) : [];
  const finish = flightBoardPoint(owner * 4, 57, playerCount);
  return (
    <div className="flight-board-overlay">
      {special && <WeatherLayer weather={special.weather} />}
      <svg
        className="flight-marker-layer"
        viewBox="-88,-92,176,184"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {special?.checkpoints.map((position) => {
          const [x, y] = flightBoardPoint(owner * 4, position, playerCount);
          return (
            <g
              key={`checkpoint-${position}`}
              className="flight-checkpoint-marker"
              transform={`translate(${x} ${y})`}
            >
              <circle
                r="5.6"
                data-guide-target={actor >= 0 ? "fxq.checkpoint" : undefined}
                data-guide-id={position}
              />
              <text y="1.8">+1</text>
            </g>
          );
        })}
        <g
          className="flight-finish-marker"
          transform={`translate(${finish[0]} ${finish[1]})`}
        >
          <circle
            r="6.2"
            data-guide-target={actor >= 0 ? "fxq.finish" : undefined}
          />
          <text y="2">终</text>
        </g>
        {previews.map((preview) => (
          <g
            key={`landing-${preview.plane}`}
            className={`flight-landing-marker${preview.returned ? " is-returned" : ""}${preview.finish ? " is-finish" : ""}${preview.checkpoint ? " is-checkpoint" : ""}`}
            transform={`translate(${preview.point[0]} ${preview.point[1]})`}
          >
            <circle
              r="5.2"
              data-guide-target={actor >= 0 ? "fxq.landing" : undefined}
              data-guide-id={preview.plane}
            />
            <text y="1.7">{(preview.plane % 4) + 1}</text>
            {preview.weatherMove !== 0 && (
              <text className="flight-weather-delta" y="-7.4">
                {preview.weatherMove > 0 ? "+" : ""}
                {preview.weatherMove}
              </text>
            )}
            {preview.boost > 0 && (
              <text className="flight-boost-delta" y="-12.4">
                +{preview.boost}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
