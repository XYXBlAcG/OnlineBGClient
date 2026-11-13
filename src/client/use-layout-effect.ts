import { useEffect, useLayoutEffect } from "react";

export const useLayoutEffectSafe =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
