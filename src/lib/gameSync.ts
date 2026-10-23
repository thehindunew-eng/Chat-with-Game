import type { FeedLine, GameId, GamePlayer, LiveGame, Member } from "./types";
import { ASTRO_SYSTEMS, CIPHER_PHRASES, REACTOR_FREQUENCIES } from "./data";
import { WIKI_ROUTES, buildSolvableSlide, emptyConnect4 } from "./classic";

const KEY = (room: string) => "chatarena_game_" + room;
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
    // Keep session game live in memory even if video data exceeds quota
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
      text: `🚀 ${p.name} पलटन में शामिल हो गए!`,
      ts: Date.now(),
      sys: true,
    });
  });
}

/* ---------- NEW UP/DELHI SPECIAL 1: Filmy / Mirzapur / Panchayat Dialogue Baazi ---------- */
export interface DialogueQuestion {
  quote: string;
  options: string[];
  answer: number;
  vibe: string;
}

export const DIALOGUE_BANK: DialogueQuestion[] = [
  {
    quote: "“देख रहा है बिनोद... कैसे _____ घुमाया जा रहा है!”",
    options: ["चक्का", "मुद्दा", "पंखा", "समोसा"],
    answer: 1,
    vibe: "पंचायत · फुलेरा गाँव स्पेशल 🫖",
  },
  {
    quote: "“मज़ाक नहीं कर रहे हैं... _____ है हमारा यहाँ!”",
    options: ["दुकान", "जलवा", "किराया", "राशन"],
    answer: 1,
    vibe: "मिर्ज़ापुर भौकाल सीरीज़ 👑",
  },
  {
    quote: "“कंट्रोल उदय, कंट्रोल! इमोशंस को _____ में रख!”",
    options: ["जेब", "कंट्रोल", "फ्रिज", "बैंक"],
    answer: 1,
    vibe: "वेलकम · मजनू + उदय भाई 🎨",
  },
  {
    quote: "“ये बाबूराव का _____ है रे बाबा!”",
    options: ["चश्मा", "स्टाइल", "धोती", "गैराज"],
    answer: 1,
    vibe: "हेरा फेरी क्लासिक 🕶️",
  },
  {
    quote: "“ग़ज़ब _____ है यार! चाय-बिस्कुट तक नहीं पूछ रहे!”",
    options: ["बेइज़्ज़ती", "मेहमाननवाज़ी", "कंजूसियत", "राजनीति"],
    answer: 0,
    vibe: "पंचायत · दामाद जी स्पेशल 🛋️",
  },
  {
    quote: "“अरे डेढ़ सौ रुपया देगा!! ... पर पहले _____ निकाल!”",
    options: ["आधार कार्ड", "माल", "रसीद", "चप्पल"],
    answer: 1,
    vibe: "फिर हेरा फेरी · कचरा सेठ 💸",
  },
  {
    quote: "“मुस्कुराइए जनाब, आप _____ में हैं!”",
    options: ["नोएडा ट्रैफिक", "लखनऊ", "मेट्रो लाइन", "थाने"],
    answer: 1,
    vibe: "नवाबों का शहर लखनऊ 🕌",
  },
  {
    quote: "“रिस्क है तो _____ है लाला!”",
    options: ["इश्क़", "डिस्को", "चाय-पानी", "चालान"],
    answer: 0,
    vibe: "स्कैम 1992 आइकॉनिक 🔥",
  },
];

function buildDialogue(seed: number) {
  const rnd = mulberry32(seed + 515);
  const questions = [...DIALOGUE_BANK]
    .sort(() => rnd() - 0.5)
    .slice(0, 5);
  return {
    qIdx: 0,
    score: 0,
    streak: 0,
    questions,
    votes: {} as Record<string, number>,
    revealed: false,
    lastCorrect: null as boolean | null,
  };
}

/* ---------- NEW UP/DELHI SPECIAL 2: Golgappa vs Momos Street Counter ---------- */
function buildGolgappa(seed: number) {
  const rnd = mulberry32(seed + 616);
  const customers = [
    "गुड्डू भैया (मिर्ज़ापुर) 👑",
    "रोहन नोएडा Sector-18 🔥",
    "अनन्या (लखनऊ) ✨",
    "चिंटू कनपुरिया 😎",
    "शर्मा अंकल जी 🧐",
    "दादरी GT रोड गैंग 🚙",
  ];
  const spices = ["खट्टा-मीठा सोंठ 🍯", "चटपटा पुदीना मसाला 🌿", "कट्टई ज़हर लाल मिर्ची 🌶️🔥"];
  const orders = Array.from({ length: 8 }, (_, idx) => ({
    customer: customers[Math.floor(rnd() * customers.length)],
    item: (idx % 2 === 0 ? (rnd() < 0.65 ? "golgappa" : "momos") : rnd() < 0.65 ? "momos" : "golgappa") as
      | "golgappa"
      | "momos",
    spice: spices[Math.floor(rnd() * spices.length)],
  }));
  return {
    orderIdx: 0,
    totalOrders: 8,
    orders,
    golgappaScore: 0,
    momosScore: 0,
    served: 0,
    spicyCombo: 0,
    lastServedBy: "",
  };
}

/* ---------- NEW UP/DELHI SPECIAL 3: Auto Bhaiya Meter Bargain Duel ---------- */
const BARGAIN_SCENARIOS = [
  {
    route: "राजीव चौक (CP) से हौज़ खास 🛺",
    distance: "11.5 km",
    initialAsk: 320,
    fairFare: 120,
    driverName: "पप्पू उस्ताद (DL-1R)",
    openingLine: "बाबूजी मीटर कल ही खराब हुआ है, सीधा ₹320 लगेंगे — आश्रम-एम्स पे भयंकर जाम है!",
  },
  {
    route: "नोएडा Sector-18 से परी चौक 🛺",
    distance: "24 km",
    initialAsk: 450,
    fairFare: 160,
    driverName: "बबलू भैया (UP-16)",
    openingLine: "भैया एक्सप्रेसवे घूम के जाना पड़ेगा, खाली ऑटो वापस आएगा — ₹450 से एक रुपया कम नहीं!",
  },
  {
    route: "चारबाग स्टेशन से हज़रतगंज 🛺",
    distance: "5.2 km",
    initialAsk: 220,
    fairFare: 80,
    driverName: "शर्मा जी (UP-32)",
    openingLine: "अरे नवाब साहब शाम का टाइम है, ₹220 दे दीजिए सीधा गेट के अंदर उतारेंगे!",
  },
  {
    route: "कैंट स्टेशन से अस्सी घाट बनारस 🛺",
    distance: "6.8 km",
    initialAsk: 260,
    fairFare: 90,
    driverName: "गुरुजी (UP-65)",
    openingLine: "गुरु गोदौलिया में बैरिकेडिंग लगी है, घूम के चलेंगे ₹260 निकालो प्रेम से!",
  },
];

function buildBargain(seed: number) {
  const rnd = mulberry32(seed + 818);
  const s = BARGAIN_SCENARIOS[Math.floor(rnd() * BARGAIN_SCENARIOS.length)];
  return {
    ...s,
    currentAsk: s.initialAsk,
    meterPatience: 100,
    turnsLeft: 5,
    log: [{ speaker: "driver", text: s.openingLine }],
  };
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

  clues.push(
    `सही तार का रंग **${c.color.toUpperCase()}** है${
      sameColorCount > 1 ? ` (बम पर कुल ${sameColorCount} ${c.color} तार हैं)` : ""
    }!`
  );
  clues.push(`सही तार बाएँ से **${correct + 1 <= 3 ? "1 से 3" : "3 से 5"}** नंबर के बीच में है।`);
  clues.push(`सही तार का नंबर **${(correct + 1) % 2 === 0 ? "सम (EVEN: 2 या 4)" : "विषम (ODD: 1, 3 या 5)"}** है।`);
  const notIdx = (correct + 1 + Math.floor(rnd() * 3)) % wires.length;
  if (notIdx !== correct)
    clues.push(`खबरदार! तार **#${notIdx + 1} (${wires[notIdx].color})** बिल्कुल मत काटना — सीधा धमाका होगा! 💥`);
  const neighbour = correct === 0 ? 1 : correct - 1;
  clues.push(
    `सही तार पोजीशन #${neighbour + 1} (${wires[neighbour].color}) के **${
      correct === 0 ? "बाएँ (LEFT)" : "दाएँ (RIGHT)"
    }** में लगा है।`
  );

  return { wires, correct, clues, cut: [] as number[], strikes: 0 };
}

/* ---------- 2. ISRO Jugad Launch builder ---------- */
function buildAstro(seed: number, n: number) {
  void seed;
  const systems = ASTRO_SYSTEMS.slice(0, Math.min(ASTRO_SYSTEMS.length, Math.max(3, n + 1)));
  const passcodes = ["JUGAAD-1", "CHAND-3", "GAGAN-9", "VIKRAM-7", "ISRO-108"];
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

/* ---------- 3. Bijli Vibhag Transformer builder ---------- */
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

  const uniqueLetters = [...new Set(selected.phrase.replace(/\s+/g, "").split(""))];
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

/* ---------- 5. Tijori Code Breakers builder ---------- */
export const CODE_SYMBOLS = ["🫖", "🥟", "👑", "🏏", "🛺", "🪔"];

function buildCode(seed: number) {
  const rnd = mulberry32(seed + 31);
  const code = Array.from({ length: 4 }, () => Math.floor(rnd() * CODE_SYMBOLS.length));
  return {
    code,
    guesses: [] as { by: string; guess: number[]; exact: number; partial: number }[],
    maxGuesses: 8,
  };
}

/* ---------- 6. Tapri Gossip Story Relay builder ---------- */
const STORY_PROMPTS = [
  "रात 1:30 बजे नोएडा हाईवे के ढाबे पर हम पराठे खा रहे थे, तभी एक काली थार रुकी और…",
  "गोवा ट्रिप के लिए सबने बैग पैक कर लिए थे, तभी चिंटू की मम्मी ने ग्रुप चैट पढ़ ली और…",
  "बनारस घाट पर चाय पीते वक़्त छोटू ने हमारे हाथ में एक रहस्यमयी चाबी थमाई और बोला…",
  "बारात में नागिन डांस चरम पर था, तभी डीजे वाले बाबू ने गलती से माइक ऑन छोड़ दिया और…",
  "राजीव चौक मेट्रो में धक्के के बीच हमारा बैग किसी गुप्त एजेंट के सूटकेस से बदल गया…",
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

/* ---------- Master 18-Game Factory ---------- */
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
    case "dialogue":
      return { ...base, endsAt: now + 95000, data: buildDialogue(seed) };
    case "golgappa":
      return { ...base, endsAt: now + 75000, data: buildGolgappa(seed) };
    case "bargain":
      return { ...base, endsAt: now + 90000, data: buildBargain(seed) };
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
          routes: {} as Record<string, { path: string[]; clicks: number; finishedAt?: number }>,
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
      role: ["कप्तान 👑", "जुगाड़ इंजीनियर 🔧", "उस्ताद 🧭", "खिलाड़ी ⚡", "पायलट 🚀"][idx % 5],
    }));

/* ---------- Bot Solvers & Desi Vocab ---------- */
export const BOT_WORDS = [
  "adrak", "adda", "agra", "auto", "banaras", "baraat", "biryani", "bhaukaal",
  "chai", "chaat", "chole", "cricket", "dadri", "delhi", "dhol", "dosti",
  "elichi", "film", "gajak", "ganga", "ghat", "golgappa", "guru", "halwa",
  "india", "ipl", "jalebi", "jalwa", "jugaad", "kachori", "kanpur", "kulhad",
  "lassi", "lucknow", "maggi", "masala", "mathura", "meerut", "metro", "momos",
  "namaste", "nawab", "noida", "pakora", "paneer", "paratha", "party", "rabri",
  "riksaw", "rohit", "samosa", "sangam", "shai", "sixer", "sweet", "tapri",
  "tandoor", "thar", "tikka", "train", "varanasi", "virat", "yaari", "zahar",
  "apple", "eagle", "engine", "orange", "orbit", "river", "tiger", "ultra",
  "winner", "yellow", "zebra", "energy", "island", "ocean", "planet", "rocket",
];

export function botWordFor(letter: string, used: string[]): string | null {
  const pool = BOT_WORDS.filter(
    (w) => w[0].toLowerCase() === letter.toLowerCase() && !used.includes(w.toLowerCase())
  );
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const BOT_STORY_BITS = [
  "तभी पीछे से गुड्डू भैया चिल्लाए — 'अबे रुको ज़रा, सब्र करो!'",
  "और चाय वाले छोटू ने चुपचाप हमारे हाथ में एक सीक्रेट नक्शा थमा दिया!",
  "देखते ही देखते पूरे मोहल्ले की भीड़ तमाशा देखने जमा हो गई!",
  "तभी किसी ने ट्रक वाला प्रेशर हॉर्न बजा दिया और सब उछल पड़े!",
  "और आखिर में पता चला कि ये सब समोसा पार्टी बचाने की गहरी साज़िश थी!",
  "जिसके बाद पूरी पलटन ने कुल्हड़ चाय पीकर जीत का जश्न मनाया!",
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
