import type { SoundDropId } from "./audio";

export interface User {
  id: string;
  name: string;
  avatar: string;
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
  votes: string[];
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

/* ---------- 18 UP/Delhi + Global Multiplayer Squad Games ---------- */
export type GameId =
  | "dialogue"
  | "golgappa"
  | "bargain"
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
  dialogue: {
    name: "फ़िल्मी & मिर्ज़ापुर डायलॉग बाज़ी",
    emoji: "🎬",
    blurb: "Mirzapur, Panchayat, Hera Pheri & Bollywood के आइकॉनिक डायलॉग सबसे तेज़ पहचानो!",
    minutes: "75s",
    tag: "Desi Buzzer Quiz",
  },
  golgappa: {
    name: "गोलगप्पा vs मोमोज़ ठेला चैलेंज",
    emoji: "🥟",
    blurb: "चाट ठेले से गोलगप्पे, मोमोज़, जलेबी और कुल्हड़ चाय लपक लो — तीखी मिर्ची बम से बचके!",
    minutes: "45s",
    tag: "Chaat Speed Co-op",
  },
  bargain: {
    name: "NCR ऑटो भैया मोल-भाव (Bargaining)",
    emoji: "🛺",
    blurb: "'मीटर खराब है भैया!' — असली दिल्ली/UP स्टाइल में किराया ₹450 से घटा के सही दाम पे लाओ!",
    minutes: "80s",
    tag: "UP/NCR Jugaad",
  },
  bomb: {
    name: "सुतली बम डिफ्यूज़ल (Sutli Bomb)",
    emoji: "🧨",
    blurb: "मुन्ना भैया का जोड़ा हुआ 5-तार वाला बम! सीक्रेट सुराग मिलाकर सही तार काटो वरना धमाका!",
    minutes: "75s",
    tag: "Tactical Co-op",
  },
  astro: {
    name: "ISRO जुगाड़ रॉकेट रिपेयर",
    emoji: "🚀",
    blurb: "कंट्रोल रूम अलर्ट! एक-दूसरे को पासकोड बताओ और चारों इंजन कंसोल चालू करो!",
    minutes: "80s",
    tag: "Jugaad Sim",
  },
  reactor: {
    name: "बिजली विभाग ट्रांसफार्मर सिंक",
    emoji: "⚡",
    blurb: "मोहल्ले की लाइट कटने वाली है! चारों फेज़ को टाइम पे सिंक करो ताकि कूलर-एसी चलते रहें!",
    minutes: "60s",
    tag: "Mohalla Grid",
  },
  cipher: {
    name: "सीक्रेट पर्चा डिकोड (Cipher Hack)",
    emoji: "🕵️",
    blurb: "सबके पास आधे-अधूरे कोड हैं — मिलके गुप्त संदेश का एक-एक शब्द खोलो!",
    minutes: "90s",
    tag: " detective Adda",
  },
  chain: {
    name: "शब्द अंताक्षरी रिले (Word Chain)",
    emoji: "🔗",
    blurb: "आखिरी अक्षर से नया शब्द जोड़ो — चेन टूटने मत देना गुरु!",
    minutes: "90s",
    tag: "Antakshari Relay",
  },
  blitz: {
    name: "दशहरा मेला गुब्बारा शूटिंग",
    emoji: "🎯",
    blurb: "मेले की बंदूक स्टॉल! पूरा ग्रुप एक साथ लाइव निशाने उड़ाएगा!",
    minutes: "35s",
    tag: "Mela Reflex",
  },
  codebreak: {
    name: "तिजोरी का ताला तोड़ो (Code Break)",
    emoji: "🔐",
    blurb: "4 प्रतीकों वाला गुप्त लॉक 8 बारी में बूझो — असली दिमागी कसरत!",
    minutes: "90s",
    tag: " sharp Dimag",
  },
  story: {
    name: "बकैती कहानी रिले (Story Adda)",
    emoji: "📖",
    blurb: "बारी-बारी 2–8 शब्द जोड़कर सबसे बवाल और हँसाने वाली कहानी बनाओ!",
    minutes: "100s",
    tag: "Full Bakaiti",
  },
  tictactoe: {
    name: "ज़ीरो-काटा मुकाबला (Zero-Katta)",
    emoji: "⭕",
    blurb: "क्लासिक स्कूल बेंच वाला ज़ीरो-काटा — Team काटा (✕) बनाम Team ज़ीरो (○)!",
    minutes: "75s",
    tag: "School Classic",
  },
  connect4: {
    name: "चार-गोटी Connect Showdown",
    emoji: "🔴",
    blurb: "लाल और सुनहरी गोटियाँ गिराओ — जो टीम पहले 4 लाइन से जोड़ेगी उसकी जीत!",
    minutes: "100s",
    tag: "Adda Board",
  },
  slide: {
    name: "नंबर पहेली स्लाइड (8-Puzzle)",
    emoji: "🧩",
    blurb: "एक चाल तुम, एक चाल दोस्त — 1 से 8 की गिनती लाइन में सेट करो!",
    minutes: "120s",
    tag: "Dimagi Relay",
  },
  wikirace: {
    name: "WikiRace इंडिया स्पेशल",
    emoji: "🏁",
    blurb: "ताजमहल से बनारस या समोसे से उत्तर प्रदेश — असली विकिपीडिया लिंक्स से सबसे पहले पहुँचो!",
    minutes: "180s",
    tag: "Live Web Race",
  },
  controller: {
    name: "पास द कंट्रोलर रील",
    emoji: "🎮",
    blurb: "अपना स्वैग रिकॉर्ड करो, PASS दबाओ और कैमरा सीधे अगले दोस्त पर कट!",
    minutes: "150s",
    tag: "Desi Reel Cut",
  },
  npc: {
    name: "सदर बाज़ार NPC वॉक",
    emoji: "🚶",
    blurb: "30 सेकंड का कैमरा चैलेंज — GTA के अटके हुए NPC जैसी चाल दिखाओ!",
    minutes: "150s",
    tag: "Funny Camera",
  },
  desk: {
    name: "मम्मी आ रहीं हैं — 15s कमरा साफ़!",
    emoji: "🧹",
    blurb: "चप्पल उड़ने से पहले 15 सेकंड में मेज़/कमरा सेट करो — देसी आर्केड बीट के साथ!",
    minutes: "150s",
    tag: "Mummy Alert!",
  },
};

export type BusEvent =
  | { t: "msg"; m: Message }
  | { t: "update"; m: Message }
  | { t: "del"; id: string }
  | { t: "seen"; reader: string; ids: string[] }
  | { t: "typing"; uid: string; name: string; until: number }
  | { t: "sound"; soundId: SoundDropId; by: string }
  | { t: "game"; g: LiveGame | null }
  | { t: "presence" };

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
