import type { FeedLine, GameId, GamePlayer, LiveGame, Member } from "./types";
import { ASTRO_SYSTEMS, CIPHER_PHRASES, REACTOR_FREQUENCIES } from "./data";
import { WIKI_ROUTES, buildSolvableSlide, emptyConnect4 } from "./classic";

const KEY = (room: string) => "chatarena_game_" + room;
const volatileGames = new Map<string, LiveGame>();

export function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function readGame(room: string): LiveGame | null {
  let stored: LiveGame | null = null;
  try {
    stored = JSON.parse(localStorage.getItem(KEY(room)) || "null");
  } catch {
    stored = null;
  }
  const memory = volatileGames.get(room) || null;
  if (memory && (!stored || memory.v >= stored.v)) return memory;
  return stored;
}

export function writeGame(room: string, g: LiveGame | null) {
  if (!g) {
    volatileGames.delete(room);
    localStorage.removeItem(KEY(room));
    return;
  }
  volatileGames.set(room, g);
  try {
    localStorage.setItem(KEY(room), JSON.stringify(g));
  } catch {
    /* keep session state live in memory */
  }
}

export function mutateGame(
  room: string,
  fn: (g: LiveGame) => LiveGame | null
): LiveGame | null {
  const cur = readGame(room);
  if (!cur) return null;
  const next = fn({ ...cur });
  if (!next) {
    writeGame(room, null);
    return null;
  }
  next.v = cur.v + 1;
  writeGame(room, next);
  return next;
}

export const feed = (g: LiveGame, line: FeedLine): LiveGame => ({
  ...g,
  feed: [...g.feed, line].slice(-50),
});

export const currentPlayer = (g: LiveGame): GamePlayer | undefined =>
  g.players.length ? g.players[g.turn % g.players.length] : undefined;

export const isMyTurn = (g: LiveGame, uid: string) =>
  currentPlayer(g)?.uid === uid;

export const bumpScore = (g: LiveGame, uid: string, n: number): LiveGame => ({
  ...g,
  players: g.players.map((p) =>
    p.uid === uid ? { ...p, score: p.score + n } : p
  ),
});

export function joinGame(room: string, p: GamePlayer): LiveGame | null {
  return mutateGame(room, (g) => {
    if (g.phase === "done" || g.players.some((x) => x.uid === p.uid)) return g;
    return feed(
      { ...g, players: [...g.players, p] },
      {
        name: "",
        text: `${p.name} joined the match`,
        ts: Date.now(),
        sys: true,
      }
    );
  });
}

/* ---------- PRO MODE 1: Flick Aim Lab (`aimlab`) ---------- */
function buildAimLab(seed: number) {
  const rnd = mulberry32(seed + 515);
  return {
    targetCell: Math.floor(rnd() * 16),
    bonusCell: (Math.floor(rnd() * 16) + 5) % 16,
    hits: 0,
    misses: 0,
    quota: 16,
    combo: 0,
    bestMs: null as number | null,
    totalMs: 0,
    spawnedAt: Date.now(),
    lastShotBy: "",
    lastMs: null as number | null,
  };
}

/* ---------- PRO MODE 2: Sector Recall (`sector`) ---------- */
export function generateSectorPattern(seed: number, wave: number): number[] {
  const rnd = mulberry32(seed + wave * 977);
  const count = Math.min(7, 3 + wave); // Wave 1: 4 tiles, Wave 2: 5, Wave 3: 6, Wave 4: 7
  const pool = Array.from({ length: 16 }, (_, i) => i);
  const picked: number[] = [];
  while (picked.length < count) {
    const idx = Math.floor(rnd() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function buildSectorRecall(seed: number) {
  return {
    wave: 1,
    maxWaves: 4,
    pattern: generateSectorPattern(seed, 1),
    cleared: [] as number[],
    wrongCell: null as number | null,
    lives: 3,
    revealUntil: Date.now() + 1800,
  };
}

/* ---------- PRO MODE 3: Strike · Guard · Feint (`duel`) ---------- */
function buildTacticalDuel(seed: number) {
  const rnd = mulberry32(seed + 818);
  const rivals = [
    { name: "APEX // GRANDMASTER", style: "Aggressive Striker" },
    { name: "VALKYRIE // DIAMOND", style: "Counter-Parry Specialist" },
    { name: "KOVA // TACTICIAN", style: "Feint Mindgame" },
  ];
  const rival = rivals[Math.floor(rnd() * rivals.length)];
  return {
    rivalName: rival.name,
    rivalStyle: rival.style,
    playerHp: 100,
    rivalHp: 100,
    round: 1,
    streak: 0,
    log: [
      {
        tag: "SYSTEM",
        text: `Match live vs ${rival.name}. STRIKE beats FEINT · FEINT breaks GUARD · GUARD parries STRIKE.`,
      },
    ],
  };
}

/* ---------- Co-op & Classic Builders ---------- */
const WIRE_COLORS = [
  { color: "red", hex: "#dc2626", emoji: "🟥" },
  { color: "blue", hex: "#2563eb", emoji: "🟦" },
  { color: "green", hex: "#16a34a", emoji: "🟩" },
  { color: "yellow", hex: "#eab308", emoji: "🟨" },
  { color: "purple", hex: "#7c3aed", emoji: "🟪" },
  { color: "white", hex: "#e4e4e7", emoji: "⬜" },
];

function buildBomb(seed: number) {
  const rnd = mulberry32(seed);
  const wires = Array.from(
    { length: 5 },
    () => WIRE_COLORS[Math.floor(rnd() * WIRE_COLORS.length)]
  );
  const correct = Math.floor(rnd() * wires.length);
  const c = wires[correct];
  const sameColorCount = wires.filter((w) => w.color === c.color).length;
  const clues: string[] = [];

  clues.push(
    `Target wire color is **${c.color.toUpperCase()}**${
      sameColorCount > 1 ? ` (${sameColorCount} ${c.color} leads present)` : ""
    }.`
  );
  clues.push(
    `Safe lead is in slot **${correct + 1 <= 3 ? "1–3" : "3–5"}** from left.`
  );
  clues.push(
    `Slot index is **${(correct + 1) % 2 === 0 ? "EVEN (2 or 4)" : "ODD (1, 3, or 5)"}**.`
  );
  const notIdx = (correct + 1 + Math.floor(rnd() * 3)) % wires.length;
  if (notIdx !== correct) {
    clues.push(
      `Do **NOT** cut slot **#${notIdx + 1} (${wires[notIdx].color})** — live trigger.`
    );
  }
  const neighbour = correct === 0 ? 1 : correct - 1;
  clues.push(
    `Target sits **${
      correct === 0 ? "LEFT of" : "RIGHT of"
    }** slot #${neighbour + 1} (${wires[neighbour].color}).`
  );

  return { wires, correct, clues, cut: [] as number[], strikes: 0 };
}

function buildAstro(seed: number, n: number) {
  void seed;
  const systems = ASTRO_SYSTEMS.slice(
    0,
    Math.min(ASTRO_SYSTEMS.length, Math.max(3, n + 1))
  );
  const passcodes = ["ALPHA-9", "SIGMA-4", "VECTOR-7", "DELTA-2", "OMEGA-5"];
  const modules = systems.map((s, idx) => ({
    id: idx,
    name: s.name,
    icon: s.icon,
    req: s.req,
    code: passcodes[idx % passcodes.length],
    fixed: false,
    assignedTo: idx % Math.max(1, n),
  }));
  return { modules, integrity: 100 };
}

function buildReactor(seed: number, n: number) {
  const rnd = mulberry32(seed + 202);
  const targetEnergy = Math.max(16, 8 * Math.max(1, n));
  const sequence = Array.from({ length: 4 }, () =>
    Math.floor(rnd() * REACTOR_FREQUENCIES.length)
  );
  return {
    energy: 0,
    targetEnergy,
    sequence,
    step: 0,
    overheat: 0,
    frequencies: REACTOR_FREQUENCIES,
  };
}

function buildCipher(seed: number) {
  const rnd = mulberry32(seed + 303);
  const selected = CIPHER_PHRASES[Math.floor(rnd() * CIPHER_PHRASES.length)];
  const words = selected.phrase.split(" ");
  const runes = selected.runes.split(" ");

  const uniqueLetters = [
    ...new Set(selected.phrase.replace(/\s+/g, "").split("")),
  ];
  const cipherMap: Record<string, string> = {};
  uniqueLetters.forEach((l, idx) => {
    cipherMap[l] = runes[idx % runes.length] + (idx >= runes.length ? idx + 1 : "");
  });

  return {
    phrase: selected.phrase,
    words,
    cipherMap,
    solvedWords: [] as string[],
    guessWordIdx: 0,
  };
}

export const CODE_SYMBOLS = ["◆", "▲", "●", "★", "■", "✦"];

function buildCode(seed: number) {
  const rnd = mulberry32(seed + 31);
  const code = Array.from({ length: 4 }, () =>
    Math.floor(rnd() * CODE_SYMBOLS.length)
  );
  return {
    code,
    guesses: [] as { by: string; guess: number[]; exact: number; partial: number }[],
    maxGuesses: 8,
  };
}

const STORY_PROMPTS = [
  "Final map, 14–14 overtime, one player left alive with 4 seconds on the clock…",
  "The tournament server glitched mid-finals and teleported both teams into…",
  "Nobody noticed the secret door behind the spawn room until round five…",
  "With zero resources left, the squad gambled everything on a wild strat…",
];

function buildVideo(id: "controller" | "npc" | "desk", n: number) {
  const required = id === "controller" ? Math.min(4, n) : Math.min(2, n);
  return {
    duration: id === "controller" ? 8 : id === "npc" ? 30 : 15,
    required: Math.max(1, required),
    submissions: [] as {
      uid: string;
      name: string;
      avatar: string;
      url: string;
      ts: number;
      duration: number;
      votes: string[];
    }[],
    ready: false,
  };
}

export function createGame(
  id: GameId,
  seed: number,
  startedBy: string,
  players: GamePlayer[]
): LiveGame {
  const now = Date.now();
  const n = Math.max(1, players.length);
  const base: LiveGame = {
    id,
    v: 1,
    seed,
    startedBy,
    startedAt: now,
    endsAt: now + 90000,
    phase: "play",
    players,
    turn: 0,
    feed: [],
    data: {},
  };
  const rnd = mulberry32(seed);

  switch (id) {
    case "aimlab":
      return { ...base, endsAt: now + 60000, data: buildAimLab(seed) };
    case "sector":
      return { ...base, endsAt: now + 75000, data: buildSectorRecall(seed) };
    case "duel":
      return { ...base, endsAt: now + 90000, data: buildTacticalDuel(seed) };
    case "bomb":
      return { ...base, endsAt: now + 75000, data: buildBomb(seed) };
    case "astro":
      return { ...base, endsAt: now + 80000, data: buildAstro(seed, n) };
    case "reactor":
      return { ...base, endsAt: now + 60000, data: buildReactor(seed, n) };
    case "cipher":
      return { ...base, endsAt: now + 90000, data: buildCipher(seed) };
    case "chain":
      return {
        ...base,
        endsAt: now + 90000,
        data: {
          words: [] as { word: string; by: string }[],
          target: Math.min(14, 5 + n * 2),
          startLetter: "ABCDEFGHILMNOPRSTW"[Math.floor(rnd() * 18)],
        },
      };
    case "blitz":
      return {
        ...base,
        endsAt: now + 35000,
        data: { total: 0, target: 12 + 8 * n, hits: {} as Record<string, number> },
      };
    case "codebreak":
      return { ...base, endsAt: now + 90000, data: buildCode(seed) };
    case "story":
      return {
        ...base,
        endsAt: now + 100000,
        data: {
          prompt: STORY_PROMPTS[Math.floor(rnd() * STORY_PROMPTS.length)],
          parts: [] as { by: string; text: string }[],
          target: Math.max(6, n * 2),
        },
      };
    case "tictactoe":
      return {
        ...base,
        endsAt: now + 75000,
        data: { board: Array(9).fill(null), moves: 0, winner: null as number[] | null },
      };
    case "connect4":
      return {
        ...base,
        endsAt: now + 100000,
        data: { board: emptyConnect4(), moves: 0, winner: null as [number, number][] | null },
      };
    case "slide":
      return {
        ...base,
        endsAt: now + 120000,
        data: { board: buildSolvableSlide(seed, 3), size: 3, moves: 0 },
      };
    case "wikirace": {
      const route = WIKI_ROUTES[Math.floor(rnd() * WIKI_ROUTES.length)];
      return {
        ...base,
        endsAt: now + 180000,
        data: {
          ...route,
          routes: {} as Record<
            string,
            { path: string[]; clicks: number; finishedAt?: number }
          >,
        },
      };
    }
    case "controller":
      return { ...base, endsAt: now + 150000, data: buildVideo("controller", n) };
    case "npc":
      return { ...base, endsAt: now + 150000, data: buildVideo("npc", n) };
    case "desk":
      return { ...base, endsAt: now + 150000, data: buildVideo("desk", n) };
  }
}

export const playersFromMembers = (
  members: Member[],
  online: (m: Member) => boolean
): GamePlayer[] =>
  members
    .filter(online)
    .map((m, idx) => ({
      uid: m.id,
      name: m.name,
      avatar: m.avatar,
      score: 0,
      bot: m.bot,
      role: ["IGL", "Entry", "Tactician", "Support", "Flex"][idx % 5],
    }));

export const BOT_WORDS = [
  "anchor", "arrow", "arena", "armor", "blitz", "blade", "breach", "combo",
  "clutch", "cipher", "combo", "crown", "delta", "draft", "duel", "eagle",
  "ember", "enigma", "entry", "flank", "flick", "focus", "frost", "gambit",
  "guard", "havoc", "hyper", "index", "karma", "laser", "lobby", "logic",
  "match", "medal", "metro", "nexus", "nitro", "omega", "orbit", "parry",
  "phase", "pixel", "point", "pulse", "quest", "queue", "radar", "range",
  "recon", "relay", "reset", "rival", "round", "scope", "score", "shift",
  "sigma", "skill", "slide", "snipe", "spark", "speed", "squad", "stack",
  "storm", "surge", "swift", "titan", "token", "tower", "ultra", "vault",
  "vector", "viper", "vortex", "watch", "xenon", "yield", "zenith", "zone",
];

export function botWordFor(letter: string, used: string[]): string | null {
  const pool = BOT_WORDS.filter(
    (w) =>
      w[0].toLowerCase() === letter.toLowerCase() &&
      !used.includes(w.toLowerCase())
  );
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const BOT_STORY_BITS = [
  "then the entry fragger hit an impossible flick shot through smoke",
  "forcing a sudden tiebreaker with zero utility left on the board",
  "until our IGL called a fake rotate that caught the entire defense off guard",
  "sealing the championship trophy as the timer hit 0.1 seconds",
];

export function scoreGuess(code: number[], guess: number[]) {
  let exact = 0;
  const codeRest: number[] = [],
    guessRest: number[] = [];
  code.forEach((c, i) => {
    if (guess[i] === c) exact++;
    else {
      codeRest.push(c);
      guessRest.push(guess[i]);
    }
  });
  let partial = 0;
  const pool = [...codeRest];
  for (const g of guessRest) {
    const i = pool.indexOf(g);
    if (i >= 0) {
      partial++;
      pool.splice(i, 1);
    }
  }
  return { exact, partial };
}

export function botCodeGuess(
  guesses: { guess: number[]; exact: number; partial: number }[]
): number[] {
  const n = CODE_SYMBOLS.length;
  const candidates: number[][] = [];
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++)
      for (let c = 0; c < n; c++)
        for (let d = 0; d < n; d++) {
          const cand = [a, b, c, d];
          if (
            guesses.every((g) => {
              const s = scoreGuess(cand, g.guess);
              return s.exact === g.exact && s.partial === g.partial;
            })
          )
            candidates.push(cand);
          if (candidates.length > 500) break;
        }
  if (!candidates.length)
    return Array.from({ length: 4 }, () => Math.floor(Math.random() * n));
  return candidates[Math.floor(Math.random() * candidates.length)];
}
