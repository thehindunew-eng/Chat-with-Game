import type { FeedLine, GameId, GamePlayer, LiveGame, Member } from "./types";
import { ASTRO_SYSTEMS, CIPHER_PHRASES, REACTOR_FREQUENCIES } from "./data";
import { WIKI_ROUTES, buildSolvableSlide, emptyConnect4 } from "./classic";

const KEY = (room: string) => "chatarena_game_" + room;
// Session fallback keeps large recorded video clips playable even if localStorage quota is reached.
const volatileGames = new Map<string, LiveGame>();

/* ---------- seeded RNG ---------- */
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
    // Video submissions can exceed storage quota; the in-memory + BroadcastChannel
    // copy remains fully playable for the rest of this live session.
  }
}

/** Read-modify-write so every tab mutates the same authoritative state. */
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

export const isMyTurn = (g: LiveGame, uid: string) => currentPlayer(g)?.uid === uid;

export const bumpScore = (g: LiveGame, uid: string, n: number): LiveGame => ({
  ...g,
  players: g.players.map((p) => (p.uid === uid ? { ...p, score: p.score + n } : p)),
});

export function joinGame(room: string, p: GamePlayer): LiveGame | null {
  return mutateGame(room, (g) => {
    if (g.phase === "done" || g.players.some((x) => x.uid === p.uid)) return g;
    return feed({ ...g, players: [...g.players, p] }, {
      name: "",
      text: `🚀 ${p.name} joined the mission squad`,
      ts: Date.now(),
      sys: true,
    });
  });
}

/* ---------- 1. Defuse the Bomb builder ---------- */
const WIRE_COLORS = [
  { color: "red", hex: "#ef4444", emoji: "🟥" },
  { color: "blue", hex: "#3b82f6", emoji: "🟦" },
  { color: "green", hex: "#22c55e", emoji: "🟩" },
  { color: "yellow", hex: "#eab308", emoji: "🟨" },
  { color: "purple", hex: "#a855f7", emoji: "🟪" },
  { color: "white", hex: "#e2e8f0", emoji: "⬜" },
];

function buildBomb(seed: number) {
  const rnd = mulberry32(seed);
  const wires = Array.from({ length: 5 }, () => WIRE_COLORS[Math.floor(rnd() * WIRE_COLORS.length)]);
  const correct = Math.floor(rnd() * wires.length);
  const c = wires[correct];
  const sameColorCount = wires.filter((w) => w.color === c.color).length;
  const clues: string[] = [];

  clues.push(`The wire to cut is **${c.color}**${sameColorCount > 1 ? ` — and there are ${sameColorCount} ${c.color} wires on this bomb` : ""}.`);
  clues.push(`The wire to cut is in position **${correct + 1 <= 3 ? "1–3" : "3–5"}** (counting from the left).`);
  clues.push(`Position number of the correct wire is **${(correct + 1) % 2 === 0 ? "even" : "odd"}**.`);
  const notIdx = (correct + 1 + Math.floor(rnd() * 3)) % wires.length;
  if (notIdx !== correct) clues.push(`Do **NOT** cut wire #${notIdx + 1} (${wires[notIdx].color}) — it causes an instant detonation!`);
  const neighbour = correct === 0 ? 1 : correct - 1;
  clues.push(`The correct wire sits **${correct === 0 ? "to the LEFT of" : "to the RIGHT of"}** the ${wires[neighbour].color} wire at position #${neighbour + 1}.`);
  clues.push(`The bomb has **${wires.length} wires**, and the correct one is **not** the ${correct === 0 ? "last" : "first"} one.`);

  return { wires, correct, clues, cut: [] as number[], strikes: 0 };
}

/* ---------- 2. Starship Repair builder ---------- */
function buildAstro(seed: number, n: number) {
  void seed;
  const systems = ASTRO_SYSTEMS.slice(0, Math.min(ASTRO_SYSTEMS.length, Math.max(3, n + 1)));
  const passcodes = ["OMEGA-9", "SOLAR-7", "QUANTUM-4", "PULSAR-X", "NEBULA-3"];
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

/* ---------- 3. Quantum Reactor builder ---------- */
function buildReactor(seed: number, n: number) {
  const rnd = mulberry32(seed + 202);
  const targetEnergy = Math.max(16, 8 * Math.max(1, n));
  const sequence = Array.from({ length: 4 }, () => Math.floor(rnd() * REACTOR_FREQUENCIES.length));
  return {
    energy: 0,
    targetEnergy,
    sequence,
    step: 0,
    overheat: 0,
    frequencies: REACTOR_FREQUENCIES,
  };
}

/* ---------- 4. Emoji Cipher builder ---------- */
function buildCipher(seed: number) {
  const rnd = mulberry32(seed + 303);
  const selected = CIPHER_PHRASES[Math.floor(rnd() * CIPHER_PHRASES.length)];
  const words = selected.phrase.split(" ");
  const runes = selected.runes.split(" ");
  
  // build mapping table for the unique letters in the phrase
  const uniqueLetters = [...new Set(selected.phrase.replace(/\s+/g, "").split(""))];
  const cipherMap: Record<string, string> = {};
  uniqueLetters.forEach((l, idx) => {
    cipherMap[l] = runes[idx % runes.length] + (idx >= runes.length ? (idx + 1) : "");
  });

  return {
    phrase: selected.phrase,
    words,
    cipherMap,
    solvedWords: [] as string[],
    guessWordIdx: 0,
  };
}

/* ---------- 5. Code Breakers builder ---------- */
export const CODE_SYMBOLS = ["🍎", "🌟", "🐬", "🎸", "🚀", "🍀"];

function buildCode(seed: number) {
  const rnd = mulberry32(seed + 31);
  const code = Array.from({ length: 4 }, () => Math.floor(rnd() * CODE_SYMBOLS.length));
  return {
    code,
    guesses: [] as { by: string; guess: number[]; exact: number; partial: number }[],
    maxGuesses: 8,
  };
}

/* ---------- 6. Story Relay builder ---------- */
const STORY_PROMPTS = [
  "The squad decided to build an AI spaceship powered entirely by samosas…",
  "It all began when the coffee machine started replying to WhatsApp messages…",
  "Nobody told us that our hotel booking was actually on an alien space station…",
  "On the final day of the Hackathon, the demo started coding itself…",
  "A friendly stray cat walked into the control room and pressed the red button…",
];

/* ---------- Instant games, WikiRace and video challenges ---------- */
function buildVideo(id: "controller" | "npc" | "desk", n: number) {
  const required = id === "controller" ? Math.min(4, n) : Math.min(2, n);
  return {
    duration: id === "controller" ? 8 : id === "npc" ? 30 : 15,
    required: Math.max(1, required),
    submissions: [] as { uid: string; name: string; avatar: string; url: string; ts: number; duration: number; votes: string[] }[],
    ready: false,
  };
}

/* ---------- Master Game Factory ---------- */
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
        data: { ...route, routes: {} as Record<string, { path: string[]; clicks: number; finishedAt?: number }> },
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
      role: ["Commander", "Engineer", "Navigator", "Specialist", "Pilot"][idx % 5],
    }));

/* ---------- Bot Solvers & Vocab ---------- */
export const BOT_WORDS = [
  "apple", "anchor", "arrow", "bridge", "butter", "cactus", "candle", "dragon",
  "dinner", "engine", "eagle", "forest", "future", "garden", "guitar", "harbor",
  "hammer", "island", "igloo", "jungle", "jacket", "kitten", "kettle", "ladder",
  "lemon", "mango", "marble", "needle", "noodle", "orange", "orbit", "pepper",
  "planet", "quartz", "quill", "rocket", "river", "sunset", "silver", "tiger",
  "temple", "umbrella", "unicorn", "violet", "village", "wizard", "window",
  "xylophone", "yellow", "yogurt", "zebra", "zigzag", "ember", "echo", "nectar",
  "rhythm", "tunnel", "legend", "dolphin", "nugget", "trophy", "yacht", "tulip",
  "prism", "sketch", "honey", "yarn", "nova", "amber", "ripple", "elbow", "wander",
];

export function botWordFor(letter: string, used: string[]): string | null {
  const pool = BOT_WORDS.filter(
    (w) => w[0].toLowerCase() === letter.toLowerCase() && !used.includes(w.toLowerCase())
  );
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const BOT_STORY_BITS = [
  "and suddenly the whole warp drive lit up in neon purple",
  "so the squad unanimously voted to double the thruster speed",
  "while our robot assistant served hot filter coffee to everyone",
  "which immediately solved our coordinates issue without any bugs",
  "and the entire galaxy celebrated with a massive victory fireworks show",
  "so we locked in the flight plan and headed straight for the destination",
];

export function scoreGuess(code: number[], guess: number[]) {
  let exact = 0;
  const codeRest: number[] = [], guessRest: number[] = [];
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