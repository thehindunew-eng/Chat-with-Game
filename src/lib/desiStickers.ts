import type { SoundDropId } from "./audio";

export interface DesiSticker {
  id: string;
  emoji: string;
  topTag: string;
  line1: string;
  line2: string;
  sub: string;
  bgA: string;
  accent: string;
  category: "clutch" | "callout" | "hype";
  tags: string;
}

export const DESI_STICKERS: DesiSticker[] = [
  {
    id: "gg-wp",
    emoji: "🏆",
    topTag: "MATCH END",
    line1: "GG WP",
    line2: "CLEAN SERIES",
    sub: "Respect across the lobby",
    bgA: "#FFE500",
    accent: "#111111",
    category: "callout",
    tags: "gg wp good game well played win respect",
  },
  {
    id: "clutch-1v4",
    emoji: "🔥",
    topTag: "HIGHLIGHT",
    line1: "1v4 CLUTCH",
    line2: "ICE IN VEINS",
    sub: "Zero panic under pressure",
    bgA: "#BBF7D0",
    accent: "#111111",
    category: "clutch",
    tags: "clutch 1v4 ace carry fire hype",
  },
  {
    id: "rematch",
    emoji: "⚔️",
    topTag: "CHALLENGE",
    line1: "RUN IT BACK",
    line2: "REMATCH NOW",
    sub: "Double or nothing",
    bgA: "#FECACA",
    accent: "#111111",
    category: "callout",
    tags: "rematch 1v1 again queue duel",
  },
  {
    id: "lock-in",
    emoji: "🎯",
    topTag: "COMMS",
    line1: "LOCK IN",
    line2: "FOCUS UP",
    sub: " Championship round",
    bgA: "#DBEAFE",
    accent: "#111111",
    category: "callout",
    tags: "lock in focus serious game time",
  },
  {
    id: "calculated",
    emoji: "📐",
    topTag: "200 IQ",
    line1: "CALCULATED.",
    line2: "ALL PLANNED",
    sub: "Never in doubt",
    bgA: "#F3F0E6",
    accent: "#111111",
    category: "clutch",
    tags: "calculated iq smart brain read",
  },
  {
    id: "nt-bro",
    emoji: "🤝",
    topTag: "TEAMWORK",
    line1: "NICE TRY",
    line2: "NEXT ROUND",
    sub: "Reset & win next",
    bgA: "#FFFFFF",
    accent: "#111111",
    category: "callout",
    tags: "nt nice try reset team",
  },
  {
    id: "mvp",
    emoji: "👑",
    topTag: "RANK UP",
    line1: "LOBBY MVP",
    line2: "+32 ELO",
    sub: "Top of the scoreboard",
    bgA: "#FEF08A",
    accent: "#111111",
    category: "hype",
    tags: "mvp crown king elo rank",
  },
  {
    id: "one-more",
    emoji: "🕹️",
    topTag: "QUEUE",
    line1: "ONE MORE",
    line2: "CAN'T END ON L",
    sub: "Queue up right now",
    bgA: "#E0E7FF",
    accent: "#111111",
    category: "hype",
    tags: "one more queue game night",
  },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderDesiStickerUrl(s: DesiSticker): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="176" viewBox="0 0 320 176">
    <rect x="4" y="4" width="312" height="168" rx="16" fill="#111111"/>
    <rect x="2" y="2" width="308" height="164" rx="15" fill="${s.bgA}" stroke="#111111" stroke-width="3"/>
    <rect x="18" y="16" width="110" height="22" rx="6" fill="#111111"/>
    <text x="73" y="31" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" font-weight="800" fill="#FFFFFF" letter-spacing="1">${escapeXml(s.topTag)}</text>
    <text x="278" y="50" text-anchor="middle" font-size="34">${s.emoji}</text>
    <text x="18" y="82" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#111111">${escapeXml(s.line1)}</text>
    <text x="18" y="114" font-family="system-ui, -apple-system, sans-serif" font-size="21" font-weight="800" fill="#111111">${escapeXml(s.line2)}</text>
    <line x1="18" y1="132" x2="294" y2="132" stroke="#111111" stroke-width="2"/>
    <text x="18" y="152" font-family="ui-monospace, monospace" font-size="11.5" font-weight="700" fill="#27272A">${escapeXml(s.sub.trim())}</text>
  </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

export const SOUNDBOARD_ITEMS: {
  id: SoundDropId;
  emoji: string;
  label: string;
  shoutout: string;
}[] = [
  {
    id: "ipl",
    emoji: "🎺",
    label: "Match Horn",
    shoutout: "🎺 MATCH HORN — Everybody ready up!",
  },
  {
    id: "dhol",
    emoji: "🥁",
    label: "Hype Drum",
    shoutout: "🥁 Hype check in the lobby!",
  },
  {
    id: "ghanti",
    emoji: "🔔",
    label: "Ready Ping",
    shoutout: "🔔 Ready check — queue is popping!",
  },
  {
    id: "horn",
    emoji: "📢",
    label: "Airhorn",
    shoutout: "📢 AIRHORN — Clean clutch!",
  },
];

export const DESI_QUICK_POLLS: { question: string; options: string[] }[] = [
  {
    question: "Next mode in rotation?",
    options: [
      "🎯 Flick Aim Lab (60s)",
      "⚔️ Strike · Guard · Feint",
      "🔴 Four-in-a-Row (1v1)",
      "💣 Defuse Protocol (Co-op)",
    ],
  },
  {
    question: "Format for this match?",
    options: [
      "Best of 1 — Sudden Death",
      "Best of 3 — Ranked Series",
      "2v2 Team Relay",
      "Free-for-All High Score",
    ],
  },
  {
    question: "Squad weekend session?",
    options: [
      "Friday 9 PM Ranked Grind",
      "Saturday Night Tournament",
      "Sunday Chill + Movie Stream",
      "Jump in right now",
    ],
  },
];
