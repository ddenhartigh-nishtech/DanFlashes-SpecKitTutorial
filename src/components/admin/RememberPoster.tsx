"use client";

import { useEffect } from "react";
import { POSTER_COOKIE } from "@/lib/admin/posters";

/** Remembers which poster this browser just saw, so the next page shows a different one (R5). */
export function RememberPoster({ index }: { index: number }) {
  useEffect(() => {
    document.cookie = `${POSTER_COOKIE}=${index}; path=/admin; samesite=lax; max-age=31536000`;
  }, [index]);
  return null;
}
