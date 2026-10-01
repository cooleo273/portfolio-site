"use client";

import { useEffect, useState } from "react";
import { bestScore, onScoresChange } from "./highscores";

/** Best Production Defense score from localStorage, live-updated. Null until mounted. */
export function useBestScore() {
  const [best, setBest] = useState<number | null>(null);
  useEffect(() => {
    setBest(bestScore());
    return onScoresChange(() => setBest(bestScore()));
  }, []);
  return best;
}
