/**
 * useMediaQuery - Hook to detect screen width using media queries
 */

"use client";

import { useSyncExternalStore, useCallback } from "react";

function getServerSnapshot(): boolean {
  return false;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", callback);
      return () => {
        mediaQuery.removeEventListener("change", callback);
      };
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Convenience hook for common breakpoints
export function useIsLargeScreen(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

export function useIsMediumScreen(): boolean {
  return useMediaQuery("(min-width: 768px)");
}

// For tablet and above (code + preview split)
export function useIsTabletOrAbove(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
