import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useId,
  useState,
  type RefObject,
  type ReactNode,
} from "react";
import type { GameKind } from "../../domain/catalogue";
import { displayProfile, gameSizing, type GameSizing } from "./model";

type GameViewport = Pick<GameSizing, "width" | "height"> & { kind: GameKind };

const GameSizeContext = createContext({
  info: gameSizing({ width: 0, height: 0 }),
  profiles: {} as Record<string, number>,
  measure: (_id: string, _value: GameViewport | null) => {},
});
export function GameSizeProvider({
  profiles,
  children,
}: {
  profiles: Record<string, number>;
  children: ReactNode;
}) {
  const [display, setDisplay] = useState({ profile: "", width: 0, height: 0 });
  const [viewports, setViewports] = useState<Record<string, GameViewport>>({});
  const measure = useCallback((id: string, value: GameViewport | null) => {
    setViewports((before) => {
      if (!value) {
        if (!before[id]) return before;
        const next = { ...before };
        delete next[id];
        return next;
      }
      if (
        before[id]?.width === value.width &&
        before[id]?.height === value.height &&
        before[id]?.kind === value.kind
      )
        return before;
      return { ...before, [id]: value };
    });
  }, []);
  useEffect(() => {
    let resolution: MediaQueryList;
    const update = () => {
      resolution?.removeEventListener("change", update);
      setDisplay({
        profile: displayProfile(
          screen.width,
          screen.height,
          window.devicePixelRatio,
        ),
        width: window.innerWidth,
        height: window.innerHeight,
      });
      resolution = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      resolution.addEventListener("change", update);
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      resolution?.removeEventListener("change", update);
    };
  }, []);
  const info = useMemo(
    () =>
      gameSizing({
        ...display,
        ...Object.values(viewports).at(-1),
        requested: profiles[display.profile] ?? 1,
      }),
    [display, viewports, profiles],
  );
  const value = useMemo(
    () => ({ info, profiles, measure }),
    [info, profiles, measure],
  );
  return (
    <GameSizeContext.Provider value={value}>
      {children}
    </GameSizeContext.Provider>
  );
}
export const useGameSizing = () => useContext(GameSizeContext).info;

export function useGameScale(surface: RefObject<HTMLElement>, kind: GameKind) {
  const { info, profiles, measure } = useContext(GameSizeContext);
  const id = useId();
  const [viewport, setViewport] = useState<GameViewport | null>(null);
  useEffect(() => {
    const parent = surface.current?.parentElement;
    if (!parent) return;
    const update = () => {
      const next = {
        width: parent.clientWidth,
        height: parent.clientHeight,
        kind,
      };
      setViewport(next);
      measure(id, next);
    };
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    update();
    return () => {
      observer.disconnect();
      measure(id, null);
    };
  }, [surface, kind, measure, id]);
  return gameSizing({
    ...info,
    ...viewport,
    kind,
    requested: profiles[info.profile] ?? 1,
  }).scale;
}
export type { GameSizing };
