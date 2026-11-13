import { phonePreviewEnabled } from "./phone-preview";
import { capabilities, runtime } from "./platform";
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof matchMedia !== "undefined" && matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const media = matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function useMobile(): boolean {
  const coarse = useMediaQuery("(pointer: coarse)");
  if (runtime !== "web" || typeof window === "undefined")
    return capabilities.mobileUi;
  return (
    capabilities.mobileUi ||
    coarse ||
    phonePreviewEnabled(location.search, window.parent !== window)
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
