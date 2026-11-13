import { useEffect, useRef, useState } from "react";
import { useLayoutEffectSafe } from "../use-layout-effect";
import type { PoolBall, PoolShotInput } from "../../domain/pool/types";
import {
  POOL_TABLE,
  cuePlacementValid,
  type PoolPoint,
} from "../../domain/pool/table";
import { aimFromPointer, pullStrength } from "./aim";

interface PoolAimOptions {
  balls: PoolBall[];
  cue: PoolPoint | null;
  own: boolean;
  ballInHand: boolean;
  resetKey: string;
}

type PoolAimGesture = "aim" | "place" | null;

export function usePoolAim({
  balls,
  cue,
  own,
  ballInHand,
  resetKey,
}: PoolAimOptions) {
  const [aim, setAim] = useState(0);
  const [spin, setSpin] = useState({ x: 0, y: 0 });
  const [elevation, setElevation] = useState(0);
  const [placement, setPlacement] = useState<PoolPoint | null>(null);
  const [pulling, setPulling] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [power, setPower] = useState(0);
  const aimRef = useRef(aim);
  const powerRef = useRef(power);
  const pullingRef = useRef(false);
  const placingRef = useRef(false);
  const placementRef = useRef<PoolPoint | null>(null);
  const startRef = useRef<PoolPoint | null>(null);
  aimRef.current = aim;
  powerRef.current = power;
  const cuePoint = placement ?? cue;

  useLayoutEffectSafe(() => {
    setPlacement(null);
    setPulling(false);
    setPlacing(false);
    setPower(0);
    pullingRef.current = false;
    placingRef.current = false;
    placementRef.current = null;
    powerRef.current = 0;
    startRef.current = null;
  }, [resetKey]);

  useEffect(() => {
    if (own) return;
    setPulling(false);
    setPlacing(false);
    setPower(0);
    pullingRef.current = false;
    placingRef.current = false;
    powerRef.current = 0;
    startRef.current = null;
  }, [own]);

  const hover = (point: PoolPoint) => {
    if (!own || pullingRef.current || placingRef.current || !cuePoint) return;
    const next = aimFromPointer(cuePoint, point);
    if (next !== null) {
      aimRef.current = next;
      setAim(next);
    }
  };

  const begin = (point: PoolPoint): PoolAimGesture => {
    if (!own) return null;
    if (ballInHand) {
      const nearCue =
        cuePoint !== null &&
        Math.hypot(point.x - cuePoint.x, point.y - cuePoint.y) <
          POOL_TABLE.ballRadius * 2.5;
      if (!placement || nearCue) {
        if (!cuePlacementValid(balls, point)) return null;
        placementRef.current = { ...point };
        setPlacement({ ...point });
        setPlacing(true);
        placingRef.current = true;
        setPower(0);
        powerRef.current = 0;
        return "place";
      }
    }
    if (!cuePoint) return null;
    const next = aimFromPointer(cuePoint, point);
    if (next !== null) {
      aimRef.current = next;
      setAim(next);
    }
    startRef.current = { ...point };
    setPulling(true);
    pullingRef.current = true;
    setPower(0);
    powerRef.current = 0;
    return "aim";
  };

  const move = (point: PoolPoint) => {
    if (placingRef.current) {
      if (cuePlacementValid(balls, point)) {
        placementRef.current = { ...point };
        setPlacement({ ...point });
      }
      return;
    }
    if (pullingRef.current && startRef.current) {
      const strength = pullStrength(aimRef.current, startRef.current, point);
      setPower(strength);
      powerRef.current = strength;
      return;
    }
    hover(point);
  };

  const end = (): PoolShotInput | null => {
    setPlacing(false);
    placingRef.current = false;
    if (!pullingRef.current) return null;
    setPulling(false);
    pullingRef.current = false;
    const strength = powerRef.current;
    setPower(0);
    powerRef.current = 0;
    startRef.current = null;
    if (strength < 0.03) return null;
    const placed = placementRef.current;
    return {
      aim: aimRef.current,
      power: Math.max(0.05, strength),
      spin,
      ...(elevation > 0 ? { elevation } : {}),
      ...(placed ? { cue: placed } : {}),
    };
  };

  const cancel = () => {
    setPulling(false);
    setPlacing(false);
    setPower(0);
    pullingRef.current = false;
    placingRef.current = false;
    powerRef.current = 0;
    startRef.current = null;
  };

  return {
    aim,
    spin,
    setSpin,
    elevation,
    setElevation,
    placement,
    cue: cuePoint,
    pulling,
    placing,
    power,
    hover,
    begin,
    move,
    end,
    cancel,
  };
}
