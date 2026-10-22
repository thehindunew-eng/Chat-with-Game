import type { Member, Message, SearchCard } from "./types";
import { BOTS, BOT_REPLIES } from "./data";

const recentUsed: string[] = [];

function pickFresh(candidates: string[]): string {
  const fresh = candidates.filter((c) => !recentUsed.includes(c));
  const pool = fresh.length ? fresh : candidates;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  recentUsed.push(pick);
  if (recentUsed.length > 10) recentUsed.shift();
  return pick;
}

export function generateContextualBotReply(
  senderName: string,
  text: string,
  recentMessages: Message[]
): { bot: Member; reply: string; readDelayMs: number; typingMs: number } | null {
  // Choose a bot that didn't send the very last message for natural turn-taking
  const lastMsg = recentMessages[recentMessages.length - 1];
  const eligible = BOTS.filter((b) => b.id !== lastMsg?.userId);
  const bot =
    eligible[Math.floor(Math.random() * eligible.length)] || BOTS[0];

  const clean = text.trim();
  const first = senderName.split(" ")[0] || senderName;

  // 1. Specific domain / keyword rules first
  const matched = BOT_REPLIES.find((r) => r.match.test(clean));
  if (matched) {
    const reply = pickFresh(matched.replies).replace("{name}", first);
    return {
      bot,
      reply,
      readDelayMs: 650 + Math.random() * 850,
      typingMs: Math.min(2600, 650 + reply.length * 24),
    };
  }

  // 2. Place / destination extraction for natural travel replies
  const cityMatch = clean.match(
    /\b(Goa|Manali|Jaipur|Delhi|Mumbai|Bengaluru|Bangalore|Kerala|Udaipur|Rishikesh|Ladakh|Shimla|Ooty|Pondicherry|Bali|Dubai|Singapore|Tokyo|London|Paris)\b/i
  );
  if (cityMatch) {
    const place = cityMatch[1];
    const reply = pickFresh([
      `${place} sounds awesome right now! Want me to check weather or trains for ${place} in 🔎 Search?`,
      `Ooh ${place} is a solid pick 🔥 Let's pull up stays & itinerary with /trip ${place}!`,
      `I've been wanting to do ${place}! Share a trip card so we can vote on dates 👍`,
    ]);
    return {
      bot,
      reply,
      readDelayMs: 700 + Math.random() * 900,
      typingMs: Math.min(2600, 700 + reply.length * 22),
    };
  }

  // 3. Direct mention of a squad regular by name
  const namedBot = BOTS.find((b) =>
    new RegExp(`\\b${b.name}\\b`, "i").test(clean)
  );
  if (namedBot) {
    const reply = pickFresh([
      `Right here ${first}! What's the plan — squad game or trip research?`,
      `Yo ${first}! Ready whenever you are 🙌 Hit 🎮 Arcade or type GAME if you want a round.`,
      `Present! 🫡 Tell me what we're cooking up.`,
    ]);
    return {
      bot: namedBot,
      reply,
      readDelayMs: 500 + Math.random() * 600,
      typingMs: Math.min(2200, 650 + reply.length * 22),
    };
  }

  // 4. Contextual natural replies (only reply ~55% of unprompted messages so it feels human, never spammy!)
  if (Math.random() > 0.58) return null;

  const natural =
    clean.length > 55
      ? [
          `Makes total sense ${first} — let's lock that in 💯`,
          `Good call honestly. Want to throw up a quick /poll so everyone can vote on it?`,
          `Wait that actually sounds super solid 👀 I'm in.`,
          `Love how organized this already is 🙌 Count me in!`,
        ]
      : [
          `100% down for that 🔥`,
          `Haha fair point ${first} 😄`,
          `Sounds like a plan! Ready for a quick round in 🎮 Arcade whenever you want.`,
          `True that 💯 What are you thinking next?`,
          `Solid vibe ✨ Let's invite the rest of the squad with the room link too!`,
          `Count me in 🙌`,
        ];

  const reply = pickFresh(natural);
  return {
    bot,
    reply,
    readDelayMs: 800 + Math.random() * 1100,
    typingMs: Math.min(2500, 600 + reply.length * 24),
  };
}

export function generateBotCardReaction(card: SearchCard): {
  bot: Member;
  reply: string;
} {
  const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
  const map: Partial<Record<SearchCard["vertical"], string[]>> = {
    trips: [
      `That ${card.query} itinerary looks super doable! Day 2 especially 🔥 Voting 👍`,
      `Whoa the budget split on this card is super clean — I'm voting Option A!`,
    ],
    weather: [
      `Good look checking the forecast first 🌦 Let's plan around the clearest day!`,
      `Live weather check saves us every time — noted! 👍`,
    ],
    trains: [
      `Nice! Let's book early before waitlist kicks in 🚆`,
      `Super handy having the direct IRCTC + timetable links right here 🙌`,
    ],
    flights: [
      `Morning departures usually save a ton — checking the price matrix now ✈️`,
      `Let's lock fares before weekend surge kicks in!`,
    ],
    movies: [
      `Ooh I'm 100% in for cinema night 🍿 Grabbing middle row seats!`,
      `Count me in for this showtime 🎬`,
    ],
    money: [
      `Clean split math — makes settling up way easier 💱`,
      `Live rate noted! Super helpful for the group budget 👍`,
    ],
  };
  const choices = map[card.vertical] || [
    `Super helpful card for "${card.query}" — thanks for sharing with the room! 🙌`,
    `Bookmarking this right now 👀 Dropping my vote on the card!`,
  ];
  return { bot, reply: pickFresh(choices) };
}
