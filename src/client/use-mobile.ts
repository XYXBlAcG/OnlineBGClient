import { phonePreviewEnabled } from "./phone-preview";
import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function useMobile(): boolean {
  const coarse = useMediaQuery("(pointer: coarse)");
  return (
    !isTauri() &&
    (coarse || phonePreviewEnabled(location.search, window.parent !== window))
  );
}

export function useWindowWidth(): number {
  const [width, setWidth] = useState(innerWidth);
  useEffect(() => {
    const resize = () => setWidth(innerWidth);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return width;
}
