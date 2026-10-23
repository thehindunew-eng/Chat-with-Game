import type { Member, Message, SearchCard } from "./types";
import { BOTS, BOT_REPLIES } from "./data";
import { DESI_STICKERS, renderDesiStickerUrl } from "./desiStickers";

const recentUsed: string[] = [];

function pickFresh(candidates: string[]): string {
  const fresh = candidates.filter((c) => !recentUsed.includes(c));
  const pool = fresh.length ? fresh : candidates;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  recentUsed.push(chosen);
  if (recentUsed.length > 10) recentUsed.shift();
  return chosen;
}

const MATH_RE =
  /(?:what(?:'s| is)\s+|calc\s+)?(-?\d+(?:\.\d+)?)\s*([+\-*/x×÷])\s*(-?\d+(?:\.\d+)?)/i;

function tryQuickMath(text: string): string | null {
  const m = text.match(MATH_RE);
  if (!m) return null;
  const a = parseFloat(m[1]);
  const op = m[2];
  const b = parseFloat(m[3]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  let res: number;
  if (op === "+") res = a + b;
  else if (op === "-") res = a - b;
  else if (op === "*" || op === "x" || op === "×") res = a * b;
  else if (op === "/" || op === "÷") {
    if (b === 0) return "Division by zero — undefined.";
    res = a / b;
  } else return null;
  const out = Number.isInteger(res) ? String(res) : res.toFixed(2);
  return `${a} ${op} ${b} = ${out}`;
}

export function generateContextualBotReply(
  senderName: string,
  text: string,
  recentMessages: Message[]
): {
  bot: Member;
  reply: string;
  stickerUrl?: string;
  stickerName?: string;
  readDelayMs: number;
  typingMs: number;
} | null {
  const lastMsg = recentMessages[recentMessages.length - 1];
  const eligible = BOTS.filter((b) => b.id !== lastMsg?.userId);
  const bot = eligible[Math.floor(Math.random() * eligible.length)] || BOTS[0];

  const clean = text.trim();
  const lower = clean.toLowerCase();
  const first = senderName.split(" ")[0] || senderName;

  // 1. Callout sticker reaction
  if (!clean && lastMsg?.attachment?.type === "gif") {
    const s = DESI_STICKERS[Math.floor(Math.random() * DESI_STICKERS.length)];
    return {
      bot,
      reply: pickFresh([
        "Clean callout 🔥 Ready whenever you want to queue.",
        "Locked in. Hit Queue or Arcade when ready.",
        "Respect 🤝 Run it back!",
      ]),
      stickerUrl: Math.random() < 0.4 ? renderDesiStickerUrl(s) : undefined,
      stickerName: s.line1,
      readDelayMs: 650 + Math.random() * 500,
      typingMs: 900,
    };
  }

  // 2. Quick math / damage / split calculation
  const mathAns = tryQuickMath(clean);
  if (mathAns) {
    return {
      bot,
      reply: `Quick math: ${mathAns} 🧮`,
      readDelayMs: 500 + Math.random() * 400,
      typingMs: 800,
    };
  }

  // 3. Ranked / ELO / Aim / Duel talk
  if (/\b(1v1|rematch|elo|rank|aim|flick|clutch|duel|queue)\b/i.test(lower)) {
    const sticker = DESI_STICKERS.find((s) => s.id === "rematch" || s.id === "lock-in");
    return {
      bot,
      reply: pickFresh([
        `I'm down ${first}. Queue up Flick Aim Lab or Strike·Guard·Feint — let's put ELO on the line.`,
        `Ready check is green on my end ✓ Open Queue or type GAME to start.`,
        `Let's test reactions — sub-250ms average in Aim Lab wins the round 🎯`,
      ]),
      stickerUrl: Math.random() < 0.3 && sticker ? renderDesiStickerUrl(sticker) : undefined,
      stickerName: sticker?.line1,
      readDelayMs: 600 + Math.random() * 600,
      typingMs: 1100,
    };
  }

  // 4. Pattern matches from BOT_REPLIES
  const matched = BOT_REPLIES.find((r) => r.match.test(clean));
  if (matched) {
    const reply = pickFresh(matched.replies).replace(/\{name\}/g, first);
    return {
      bot,
      reply,
      readDelayMs: 600 + Math.random() * 700,
      typingMs: Math.min(2000, 550 + reply.length * 16),
    };
  }

  // 5. Direct bot mention
  const namedBot = BOTS.find((b) =>
    lower.includes(b.name.toLowerCase().split(" ")[0])
  );
  if (namedBot) {
    return {
      bot: namedBot,
      reply: pickFresh([
        `Standing by, ${first}. Drop a lobby card or start a match anytime.`,
        `Ready when you are — let's push ELO.`,
        `Comms clear. Pick a mode in Arcade and I'll lock in.`,
      ]),
      readDelayMs: 500 + Math.random() * 450,
      typingMs: 950,
    };
  }

  // 6. Measured natural response rate (~55% so chat stays crisp and never noisy)
  if (Math.random() > 0.55) return null;

  const natural = [
    `Solid call, ${first}. Ready to queue whenever.`,
    `Agreed 💯 Want to throw up a quick poll or ready check?`,
    `Clean plan. Invite the squad with the room link when ready.`,
    `Locked in. Hit Arcade or type GAME to launch a round.`,
  ];

  const reply = pickFresh(natural);
  return {
    bot,
    reply,
    readDelayMs: 750 + Math.random() * 850,
    typingMs: Math.min(1800, 550 + reply.length * 16),
  };
}

export function generateBotCardReaction(card: SearchCard): {
  bot: Member;
  reply: string;
} {
  const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
  const choices = [
    `Clean intel on "${card.query}" — locked my vote on the card.`,
    `Solid breakdown. Makes coordinating the squad easy.`,
  ];
  return { bot, reply: pickFresh(choices) };
}
