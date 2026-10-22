export interface User {
  id: string;
  name: string;
  avatar: string; // data URL
  bio?: string;
  device?: "mobile" | "desktop";
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

/* ---------- search cards & expressive rich objects ---------- */
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
  votes: string[]; // array of user names
}

export interface SquadPoll {
  question: string;
  options: PollOption[];
  createdBy: string;
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
  replyTo?: ReplyPreview;
  reactions?: Record<string, string[]>;
  seenBy?: string[];
  editedAt?: number;
  delivery?: "sending" | "sent" | "cloud";
}

/* ---------- expanded collaborative games ---------- */
export type GameId =
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
  data: any;
  result?: string;
  bonus?: string;
}

export const GAME_META: Record<
  GameId,
  { name: string; emoji: string; blurb: string; minutes: string; tag: string }
> = {
  bomb: {
    name: "Defuse the Bomb",
    emoji: "🧨",
    blurb: "Tactile C4 module: combine confidential wire clues before 3 strikes detonate",
    minutes: "75s",
    tag: "Tactical Co-op",
  },
  astro: {
    name: "Starship Emergency Repair",
    emoji: "🚀",
    blurb: "Bridge telemetry critical: exchange override passcodes across 4 ship consoles",
    minutes: "80s",
    tag: "Bridge Sim",
  },
  reactor: {
    name: "Quantum Reactor Sync",
    emoji: "⚡",
    blurb: "Stabilize the spinning plasma core by tapping harmonic waves in rhythm",
    minutes: "60s",
    tag: "Harmonic Sync",
  },
  cipher: {
    name: "Emoji Cipher Hack",
    emoji: "🕵️",
    blurb: "Crack the encrypted transmission — every player holds partial rune keys",
    minutes: "90s",
    tag: "Cryptanalysis",
  },
  chain: {
    name: "Word Chain Relay",
    emoji: "🔗",
    blurb: "Pass the baton around the room — each word starts with the last letter",
    minutes: "90s",
    tag: "Word Relay",
  },
  blitz: {
    name: "Target Blitz Co-op",
    emoji: "🎯",
    blurb: "Live multi-device range — everyone taps live targets simultaneously",
    minutes: "35s",
    tag: "Reflex Range",
  },
  codebreak: {
    name: "Code Breakers",
    emoji: "🧩",
    blurb: "Cooperative Mastermind — deduce the 4-peg cipher in 8 attempts",
    minutes: "90s",
    tag: "Deduction",
  },
  story: {
    name: "Story Relay",
    emoji: "📖",
    blurb: "Co-author a chaotic short story together, one sentence fragment per turn",
    minutes: "100s",
    tag: "Improv",
  },
  tictactoe: {
    name: "Tic-Tac-Toe Teams",
    emoji: "⭕",
    blurb: "Tactile neon grid — alternating teammates face off as X and O",
    minutes: "75s",
    tag: "Classic Board",
  },
  connect4: {
    name: "Connect Four Teams",
    emoji: "🔴",
    blurb: "Acrylic gravity rack — drop red & gold discs to connect four in a row",
    minutes: "100s",
    tag: "Gravity Board",
  },
  slide: {
    name: "Sliding Puzzle Relay",
    emoji: "🧩",
    blurb: "Brushed metal 8-puzzle — alternate legal moves to restore 1 through 8",
    minutes: "120s",
    tag: "Spatial Relay",
  },
  wikirace: {
    name: "WikiRace Live",
    emoji: "🏁",
    blurb: "Navigate real Wikipedia hyperlinks from start article to target first",
    minutes: "180s",
    tag: "Live Web Race",
  },
  controller: {
    name: "Pass the Controller",
    emoji: "🎮",
    blurb: "Record your move, smash PASS, and cut the camera to the next teammate",
    minutes: "150s",
    tag: "Video Relay",
  },
  npc: {
    name: "The NPC Walk",
    emoji: "🚶",
    blurb: "30-second camera challenge — move like a gloriously glitchy background NPC",
    minutes: "150s",
    tag: "Video Challenge",
  },
  desk: {
    name: "Speedrun Your Desk",
    emoji: "🗄️",
    blurb: "Organize your desk in a 15-second recording with synthesized arcade audio",
    minutes: "150s",
    tag: "Video Speedrun",
  },
};

export type BusEvent =
  | { t: "msg"; m: Message }
  | { t: "update"; m: Message }
  | { t: "del"; id: string }
  | { t: "seen"; reader: string; ids: string[] }
  | { t: "typing"; uid: string; name: string; until: number }
  | { t: "game"; g: LiveGame | null }
  | { t: "presence" };

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
