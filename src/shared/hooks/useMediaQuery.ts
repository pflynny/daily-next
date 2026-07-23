"use client";

import { useEffect, useState } from "react";

/** SSR-safe media query hook. Returns false until mounted on the client. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}

/** Mouse/trackpad present (matches the CSS used by .hover-reveal). */
export function useIsFinePointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}
