import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
export function useMobile(): boolean {
  const query = "(pointer: coarse)";
  const [mobile, setMobile] = useState(
    () => !isTauri() && matchMedia(query).matches,
  );
  useEffect(() => {
    const media = matchMedia(query);
    const update = () => setMobile(!isTauri() && media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return mobile;
}
