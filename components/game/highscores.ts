export type ScoreEntry = { initials: string; score: number; wave: number; date: number };

const KEY = "pd-highscores-v1";
const EVENT = "pd:scores";
export const MAX_ENTRIES = 5;

export function loadScores(): ScoreEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
    return Array.isArray(parsed)
      ? parsed.filter((e) => typeof e?.score === "number").sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES)
      : [];
  } catch {
    return [];
  }
}

export function bestScore() {
  return loadScores()[0]?.score ?? 0;
}

export function qualifies(score: number) {
  if (score <= 0) return false;
  const scores = loadScores();
  return scores.length < MAX_ENTRIES || score > scores[scores.length - 1].score;
}

export function saveScore(entry: ScoreEntry) {
  const scores = [...loadScores(), entry].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(scores));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
  return scores;
}

export function onScoresChange(fn: () => void) {
  window.addEventListener(EVENT, fn);
  const onStorage = (e: StorageEvent) => e.key === KEY && fn();
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", onStorage);
  };
}
