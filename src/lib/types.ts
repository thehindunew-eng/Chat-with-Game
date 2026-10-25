import type { SoundDropId } from "./audio";

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  device?: "mobile" | "desktop";
  elo?: number;
  wins?: number;
  streak?: number;
}

export interface Member extends User {
  lastSeen: number;
  bot?: boolean;
  admin?: boolean;
  joinedAt?: number;
}

export type BotMode = "auto" | "on" | "off";
export type SyncStatus = "live" | "connecting" | "local";

export type AttachmentType = "image" | "file" | "audio" | "gif";

export interface Attachment {
  type: AttachmentType;
  name: string;
  url: string;
  mime: string;
  size?: number;
  duration?: number;
  ephemeral?: boolean;
}

/* ---------- Search & Intel Cards ---------- */
export type Vertical =
  | "fact"
  | "trains"
  | "flights"
  | "movies"
  | "trips"
  | "stays"
  | "weather"
  | "places"
  | "food"
  | "shopping"
  | "money";

export interface ResultLink {
  label: string;
  url: string;
  icon: string;
  note?: string;
}

export interface ResultRow {
  title: string;
  subtitle?: string;
  meta?: string;
  url?: string;
  tag?: string;
}

export interface PollOption {
  id: string;
  label: string;
  votes: string[];
}

export interface SquadPoll {
  question: string;
  options: PollOption[];
  createdBy: string;
}

export interface MatchLobby {
  gameId: GameId;
  hostName: string;
  readyNames: string[];
  launched?: boolean;
}

export interface MatchResultCard {
  gameId: GameId;
  summary: string;
  mvp?: string;
  eloDelta?: number;
  standings: { name: string; score: number }[];
}

export interface ItineraryDay {
  day: string;
  activity: string;
  estCost?: string;
  icon?: string;
}

export interface SearchCard {
  vertical: Vertical;
  label: string;
  icon: string;
  query: string;
  headline: string;
  detail?: string;
  rows?: ResultRow[];
  links: ResultLink[];
  source?: { title: string; url: string };
  tips?: string[];
  note?: string;
  askVote?: boolean;
  poll?: PollOption[];
  itinerary?: ItineraryDay[];
  splitEstimate?: { total: string; perPerson: string; count: number };
}

export interface ReplyPreview {
  id: string;
  userId: string;
  name: string;
  preview: string;
}

export type MsgKind = "chat" | "system" | "ai";

export interface Message {
  id: string;
  kind: MsgKind;
  userId: string;
  name: string;
  avatar: string;
  ts: number;
  text?: string;
  attachment?: Attachment;
  card?: SearchCard;
  poll?: SquadPoll;
  lobby?: MatchLobby;
  matchResult?: MatchResultCard;
  replyTo?: ReplyPreview;
  reactions?: Record<string, string[]>;
  seenBy?: string[];
  editedAt?: number;
  delivery?: "sending" | "sent" | "cloud";
  senderElo?: number;
}

/* ---------- 18 Competitive & Co-op Multiplayer Modes ---------- */
export type GameId =
  | "aimlab"
  | "sector"
  | "duel"
  | "bomb"
  | "astro"
  | "reactor"
  | "cipher"
  | "chain"
  | "blitz"
  | "codebreak"
  | "story"
  | "tictactoe"
  | "connect4"
  | "slide"
  | "wikirace"
  | "controller"
  | "npc"
  | "desk";

export interface GamePlayer {
  uid: string;
  name: string;
  avatar: string;
  score: number;
  bot?: boolean;
  role?: string;
}

export interface FeedLine {
  name: string;
  text: string;
  ts: number;
  sys?: boolean;
}

export interface LiveGame {
  id: GameId;
  v: number;
  seed: number;
  startedBy: string;
  startedAt: number;
  endsAt: number;
  phase: "play" | "done";
  players: GamePlayer[];
  turn: number;
  feed: FeedLine[];
  result?: string;
  bonus?: string;
  data: Record<string, any>;
}

export interface GameMeta {
  name: string;
  emoji: string;
  tag: string;
  minutes: string;
  blurb: string;
}

export const GAME_META: Record<GameId, GameMeta> = {
  aimlab: {
    name: "Flick Aim Lab",
    emoji: "🎯",
    tag: "REFLEX · AIM",
    minutes: "60s",
    blurb: "High-precision 4x4 target grid tracking live reaction time (ms), combo streak & accuracy.",
  },
  sector: {
    name: "Sector Recall",
    emoji: "🧠",
    tag: "MEMORY · TACTICAL",
    minutes: "75s",
    blurb: "Memorize hostile radar tiles in 1.2s flashes and sweep 4 escalating waves cleanly.",
  },
  duel: {
    name: "Strike · Guard · Feint",
    emoji: "⚔️",
    tag: "MINDGAME DUEL",
    minutes: "90s",
    blurb: "High-stakes combat reads with HP bars, parries, counter crits & knockout finishes.",
  },
  bomb: {
    name: "Defuse Protocol",
    emoji: "💣",
    tag: "CO-OP INTEL",
    minutes: "75s",
    blurb: "Cross-check wire schematics across teammates and snip the single safe lead.",
  },
  astro: {
    name: "Orbital Repair",
    emoji: "🚀",
    tag: "CO-OP OPS",
    minutes: "80s",
    blurb: "Relay override codes across stations to restore hull systems before lock-out.",
  },
  reactor: {
    name: "Core Sync",
    emoji: "⚡",
    tag: "TIMING SYNC",
    minutes: "60s",
    blurb: "Trigger frequency nodes in exact sequence without overheating the core.",
  },
  cipher: {
    name: "Cryptogram",
    emoji: "🔐",
    tag: "DECODE",
    minutes: "90s",
    blurb: "Combine partial key shards across the squad to crack the encrypted phrase.",
  },
  chain: {
    name: "Lexicon Relay",
    emoji: "🔤",
    tag: "SPEED WORD",
    minutes: "90s",
    blurb: "Rapid turn-based word chain starting with the previous word's final letter.",
  },
  blitz: {
    name: "Target Blitz",
    emoji: "⚡",
    tag: "APM RACE",
    minutes: "35s",
    blurb: "Squad-wide live target sprint — clear the quota before the buzzer.",
  },
  codebreak: {
    name: "Vault Breaker",
    emoji: "🧩",
    tag: "LOGIC",
    minutes: "90s",
    blurb: "Deduce the 4-symbol master lock using exact and partial match feedback.",
  },
  story: {
    name: "Lore Builder",
    emoji: "📜",
    tag: "PARTY CO-OP",
    minutes: "100s",
    blurb: "Co-write a fast turn-by-turn campaign log one line at a time.",
  },
  tictactoe: {
    name: "Tic-Tac-Toe Pro",
    emoji: "❌",
    tag: "1v1 CLASSIC",
    minutes: "75s",
    blurb: "Fast tactical 3x3 board duel with instant turn rotation.",
  },
  connect4: {
    name: "Four-in-a-Row",
    emoji: "🔴",
    tag: "1v1 STRATEGY",
    minutes: "100s",
    blurb: "7x6 gravity grid — connect four discs horizontally, vertically, or diagonally.",
  },
  slide: {
    name: "15-Slide Sprint",
    emoji: "🔢",
    tag: "SPEED PUZZLE",
    minutes: "120s",
    blurb: "Solvable sliding tile race — lowest move count and fastest solve wins.",
  },
  wikirace: {
    name: "Wiki Speedrun",
    emoji: "🌐",
    tag: "LIVE RACE",
    minutes: "180s",
    blurb: "Navigate real Wikipedia articles from start to target in minimum clicks.",
  },
  controller: {
    name: "Pass the Controller",
    emoji: "🎮",
    tag: "VIDEO RELAY",
    minutes: "150s",
    blurb: "8-second webcam relay stitched into a live room highlight reel.",
  },
  npc: {
    name: "NPC Challenge",
    emoji: "🤖",
    tag: "VIDEO CHALLENGE",
    minutes: "150s",
    blurb: "30-second physics emote challenge voted live by the lobby.",
  },
  desk: {
    name: "Setup Check",
    emoji: "🖥️",
    tag: "15S SPEEDRUN",
    minutes: "150s",
    blurb: "15-second battle-station speedrun with synthesized arcade audio.",
  },
};

export type BusEvent =
  | { t: "msg"; m: Message }
  | { t: "update"; m: Message }
  | { t: "del"; id: string }
  | { t: "seen"; reader: string; ids: string[] }
  | { t: "typing"; uid: string; name: string; until: number }
  | { t: "game"; g: LiveGame | null }
  | { t: "presence" }
  | { t: "sound"; soundId: SoundDropId; by: string };

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
