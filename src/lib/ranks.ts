export interface PlayerStats {
  elo: number;
  wins: number;
  matches: number;
  streak: number;
  bestReactionMs?: number;
}

export interface RankTier {
  id: string;
  label: string;
  short: string;
  bg: string;
  text: string;
  dot: string;
}

const STATS_KEY = "arena_pro_stats_v1";

export const DEFAULT_STATS: PlayerStats = {
  elo: 1000,
  wins: 0,
  matches: 0,
  streak: 0,
};

export function getRankTier(elo = 1000): RankTier {
  if (elo >= 1500) {
    return {
      id: "master",
      label: "MASTER",
      short: "MST",
      bg: "#fecaca",
      text: "#991b1b",
      dot: "#dc2626",
    };
  }
  if (elo >= 1350) {
    return {
      id: "diamond",
      label: "DIAMOND",
      short: "DIA",
      bg: "#e0e7ff",
      text: "#3730a3",
      dot: "#4f46e5",
    };
  }
  if (elo >= 1200) {
    return {
      id: "platinum",
      label: "PLATINUM",
      short: "PLT",
      bg: "#dbeafe",
      text: "#1e40af",
      dot: "#2563eb",
    };
  }
  if (elo >= 1075) {
    return {
      id: "gold",
      label: "GOLD",
      short: "GLD",
      bg: "#fef08a",
      text: "#854d0e",
      dot: "#ca8a04",
    };
  }
  if (elo >= 950) {
    return {
      id: "silver",
      label: "SILVER",
      short: "SLV",
      bg: "#f4f4f5",
      text: "#27272a",
      dot: "#52525b",
    };
  }
  return {
    id: "bronze",
    label: "BRONZE",
    short: "BRZ",
    bg: "#fed7aa",
    text: "#9a3412",
    dot: "#ea580c",
  };
}

export function loadPlayerStats(): PlayerStats {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATS_KEY) || "null");
    if (parsed && typeof parsed.elo === "number") {
      return {
        elo: parsed.elo,
        wins: Number(parsed.wins || 0),
        matches: Number(parsed.matches || 0),
        streak: Number(parsed.streak || 0),
        bestReactionMs: parsed.bestReactionMs,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_STATS };
}

export function savePlayerStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

export function recordMatchResult(
  won: boolean,
  reactionMs?: number
): { next: PlayerStats; delta: number } {
  const cur = loadPlayerStats();
  const nextStreak = won ? cur.streak + 1 : 0;
  const streakBonus = won && nextStreak >= 2 ? Math.min(12, nextStreak * 3) : 0;
  const delta = won ? 24 + streakBonus : -10;
  const nextElo = Math.max(800, cur.elo + delta);
  const bestReactionMs =
    reactionMs && (!cur.bestReactionMs || reactionMs < cur.bestReactionMs)
      ? reactionMs
      : cur.bestReactionMs;

  const next: PlayerStats = {
    elo: nextElo,
    wins: cur.wins + (won ? 1 : 0),
    matches: cur.matches + 1,
    streak: nextStreak,
    bestReactionMs,
  };
  savePlayerStats(next);
  return { next, delta };
}
