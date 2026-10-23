import type { Member, Message, SearchCard } from "./types";
import { BOTS, BOT_REPLIES } from "./data";
import { DESI_STICKERS, renderDesiStickerUrl } from "./desiStickers";

const recentUsed: string[] = [];

function pickFresh(candidates: string[]): string {
  const fresh = candidates.filter((c) => !recentUsed.includes(c));
  const pool = fresh.length ? fresh : candidates;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  recentUsed.push(chosen);
  if (recentUsed.length > 12) recentUsed.shift();
  return chosen;
}

const CITY_SHOUTOUTS: Record<string, string> = {
  noida: "नोएडा Sector-18 अट्टा मार्केट और ब्रह्मपुत्र मार्केट के मोमोज़ + चाप का अलग ही भौकाल है 🥟🔥",
  "greater noida": "Greater Noida परी चौक से यमुना एक्सप्रेसवे की नाइट ड्राइव = अलग लेवल सुकून! 🛣️✨",
  dadri: "दादरी और GT रोड के गरमा-गरम समोसे-जलेबी का पूरे NCR में कोई तोड़ नहीं भाई! 🥟🔥",
  ghaziabad: "ग़ाज़ियाबाद RDC और इंदिरापुरम की शाम वाली चाय + मलाई चाप एकदम बवाल है 😎🔥",
  delhi: "दिल्ली CP, सरोजिनी और चांदनी चौक के छोले-भटूरे = स्वर्ग है भाई! 🍛✨",
  gurgaon: "गुरुग्राम CyberHub ठीक है भाई, पर असली मज़ा तो ठेले की मैगी में ही है 😂🍜",
  lucknow: "मुस्कुराइए जनाब, आप लखनऊ के नवाबों और टुंडे कबाब की बात कर रहे हैं! 🕌✨",
  varanasi: "हर हर महादेव! 🔱 बनारस अस्सी घाट की कुल्हड़ मलइयो, पान और गंगा आरती 🙏✨",
  banaras: "अरे बनारस की लस्सी और अस्सी घाट की शाम — एकदम जन्नत गुरु! 🔱🫖",
  kanpur: "कानपुर के ठग्गू के लड्डू और कनपुरिया बकैती में कोई जीत नहीं सकता भाई 🤣🔥",
  prayagraj: "प्रयागराज संगम की हवा और नेतराम की कचौड़ी — एकदम लाजवाब गुरु! 🙏✨",
  allahabad: "संगम नगरी प्रयागराज का अलग ही रुतबा है भाई! 🌊✨",
  meerut: "मेरठ की मशहूर गजक-रेवड़ी और नानखटाई भिजवा दे भाई! 🏆🔥",
  agra: "आगरा का ताजमहल और पंछी पेठा + सुबह की बेड़ई! 🕌✨",
  mathura: "राधे-राधे! 🙏 मथुरा-वृंदावन के पेड़े और लस्सी की बात ही निराली है! 🌸",
  gorakhpur: "गोरखपुर का भौकाल तो पूरे पूर्वांचल में टाइट रहता है गुरु! 🔥👑",
  bareilly: "झुमका गिरा रे बरेली के बाज़ार में!! 💃🎶",
  aligarh: "अलीगढ़ के ताले और नुमाइश की रौनक का जवाब नहीं! 🔐✨",
  rishikesh: "ऋषिकेश में राफ्टिंग और गंगा किनारे पहाड़ों वाली मैगी + कुल्हड़ चाय! 🌊⛰️",
  manali: "मनाली ट्रिप का प्लान हर साल बनता है भाई — इस बार पक्का गाड़ी निकालो! 🏔️🚙",
  goa: "गोवा का नाम लेते ही 4 लोग पहले बैग पैक करते हैं और आखिर में मम्मी मना कर देती हैं 🤣🏖️",
};

const MATH_RE =
  /(?:what(?:'s| is)\s+|calculate\s+|kitna hua\s+)?(-?\d+(?:\.\d+)?)\s*([+\-*/x×÷])\s*(-?\d+(?:\.\d+)?)/i;

function tryDesiMath(text: string): string | null {
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
    if (b === 0) return "अरे भाई ज़ीरो से डिवाइड करेगा तो कैलकुलेटर भी धुआँ छोड़ देगा! 😂🧮";
    res = a / b;
  } else return null;
  const out = Number.isInteger(res) ? String(res) : res.toFixed(2);
  return `मुँहज़बानी हिसाब है गुरु: ${a} ${op} ${b} = ${out} 🧮😎 (पार्टी का बिल भी ऐसे ही बराबर बाँटना!)`;
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

  // 0. If user sent a sticker/GIF without text, hype it up!
  if (!clean && lastMsg?.attachment?.type === "gif") {
    const s = DESI_STICKERS[Math.floor(Math.random() * DESI_STICKERS.length)];
    const reply = pickFresh([
      `अबे कट्टई ज़हर मीम मारा है ${first} भाई!! 🤣🤣🔥`,
      `ग़ज़ब बेइज़्ज़ती कर दी इस एक स्टीकर से 💀😂`,
      `वाह बेटे वाह... मौज कर दी! लो हमारी तरफ़ से भी नहले पे दहला! 😎🔥`,
      `देख रहा है बिनोद... किस लेवल की मीम बाज़ी चल रही है अड्डे पे! ☕🤣`,
    ]);
    return {
      bot,
      reply,
      stickerUrl: Math.random() < 0.55 ? renderDesiStickerUrl(s) : undefined,
      stickerName: `${s.emoji} ${s.line1} ${s.line2}`,
      readDelayMs: 650 + Math.random() * 600,
      typingMs: 1100,
    };
  }

  // 1. Quick Bill / Math solver
  const mathAns = tryDesiMath(clean);
  if (mathAns) {
    return {
      bot,
      reply: mathAns,
      readDelayMs: 550 + Math.random() * 450,
      typingMs: 950,
    };
  }

  // 2. UP / Delhi-NCR / India City Shoutouts!
  for (const [city, blurb] of Object.entries(CITY_SHOUTOUTS)) {
    if (lower.includes(city)) {
      const reply = `ओये होये ${city.toUpperCase()} का ज़िक्र हो गया! 😍 ${blurb} — ज़रा 🔎 Search खोल के मौसम और ट्रेन भी देख लें क्या?`;
      return {
        bot,
        reply,
        readDelayMs: 700 + Math.random() * 750,
        typingMs: Math.min(2400, 650 + reply.length * 18),
      };
    }
  }

  // 3. Mummy / Gharwale / Permission banter!
  if (/\b(mummy|papa|gharwale|permission|mataji|pitaji|abbu|chappal)\b/i.test(lower)) {
    const chappal = DESI_STICKERS.find((s) => s.tags.includes("mummy") || s.tags.includes("chappal"));
    const reply = `बस भाई ${first}, मम्मी का नाम आते ही सारा भौकाल शांत हो जाता है 😭🙏 शाम 8 बजे से पहले घर पहुँचना पड़ेगा!`;
    return {
      bot,
      reply,
      stickerUrl: chappal ? renderDesiStickerUrl(chappal) : undefined,
      stickerName: chappal ? `${chappal.emoji} ${chappal.line1}` : undefined,
      readDelayMs: 650 + Math.random() * 600,
      typingMs: 1300,
    };
  }

  // 4. Paisa / Udhaar / GPay / Paytm banter!
  if (/\b(paisa|paise|udhaar|udhar|bill|split|gpay|paytm|phonepe|upi|kharcha|gareeb|150)\b/i.test(lower)) {
    const meme = DESI_STICKERS.find((s) => s.tags.includes("paisa") || s.tags.includes("150"));
    const reply = pickFresh([
      `भाई UPI स्कैनर निकालते ही मेरा इंटरनेट अचानक 2G पे आ जाता है पता नहीं क्यों 🤣💸`,
      `अरे डेढ़ सौ रुपया देगा!! 😂 हिसाब बराबर करने के लिए 🔎 Search → Split यूज़ कर ले गुरु!`,
      `पैसों की बात मत कर ${first} भाई, महीने के आख़िरी दिन चल रहे हैं — सिर्फ कुल्हड़ चाय का बजट है अभी ☕😭`,
    ]);
    return {
      bot,
      reply,
      stickerUrl: meme && Math.random() < 0.5 ? renderDesiStickerUrl(meme) : undefined,
      stickerName: meme ? `${meme.emoji} ${meme.line1}` : undefined,
      readDelayMs: 700 + Math.random() * 650,
      typingMs: 1350,
    };
  }

  // 5. Specific UP/Delhi Hinglish keyword patterns from BOT_REPLIES
  const matched = BOT_REPLIES.find((r) => r.match.test(clean));
  if (matched) {
    const reply = pickFresh(matched.replies).replace(/\{name\}/g, first);
    const randomSticker =
      Math.random() < 0.24
        ? DESI_STICKERS[Math.floor(Math.random() * DESI_STICKERS.length)]
        : undefined;
    return {
      bot,
      reply,
      stickerUrl: randomSticker ? renderDesiStickerUrl(randomSticker) : undefined,
      stickerName: randomSticker ? `${randomSticker.emoji} ${randomSticker.line1}` : undefined,
      readDelayMs: 650 + Math.random() * 800,
      typingMs: Math.min(2400, 650 + reply.length * 18),
    };
  }

  // 6. Direct mention of Guddu / Rohan / Ananya / Chintu
  const namedBot = BOTS.find((b) =>
    lower.includes(b.name.toLowerCase().split(" ")[0])
  );
  if (namedBot) {
    const reply = pickFresh([
      `हाँ बोल मेरे भाई ${first}! 🫡 आदेश कर — गेम फोड़ना है या समोसा मँगवाना है?`,
      `अरे ${first} याद किया और हम हाज़िर! 🔥 खोल 🎮 Arcade या बता क्या प्लान है!`,
      `बोल गुरु! गुड्डू और पूरी पलटन एकदम रेडी है! 😎👑`,
    ]);
    return {
      bot: namedBot,
      reply,
      readDelayMs: 500 + Math.random() * 550,
      typingMs: 1100,
    };
  }

  // 7. Contextual natural squad banter (~72% probability so solo chat feels super lively!)
  if (Math.random() > 0.72) return null;

  const natural =
    clean.length > 45
      ? [
          `बात तो लाख टके की कही है ${first} भाई 💯 एक लाइव 🎲 पोल डाल दे ग्रुप में, अभी दूध का दूध पानी का पानी हो जाएगा!`,
          `अरे वाह गुरु, पूरा प्लान सेट कर दिया तूने तो! 🔥 मैं सौ टका इन हूँ!`,
          `एकदम सही पकड़े हैं! 🫡 ऊपर वाले 🔗 Invite लिंक से बाकी दोस्तों को भी बुला ले!`,
        ]
      : [
          `एकदम कट्टई ज़हर बात भाई 🔥💯`,
          `अरे वाह ${first} गुरु, मौज कर दी! 😄☕`,
          `सही कह रहा है भाई! चल इसी बात पे एक राउंड 🎮 Arcade हो जाए — 🛺 ऑटो भैया मोल-भाव या 🎬 डायलॉग बाज़ी?`,
          `माहौल पूरा टाइट है आज अड्डे का! 😎🔥`,
          `पक्का डन समझ भाई! 🤝✨`,
        ];

  const reply = pickFresh(natural);
  return {
    bot,
    reply,
    readDelayMs: 750 + Math.random() * 950,
    typingMs: Math.min(2300, 600 + reply.length * 18),
  };
}

export function generateBotCardReaction(card: SearchCard): {
  bot: Member;
  reply: string;
} {
  const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
  const map: Partial<Record<SearchCard["vertical"], string[]>> = {
    trips: [
      `ओ भाई ${card.query} का पूरा दिन-वार प्लान आ गया! 😍 Day-2 वाला माहौल कट्टई बवाल लग रहा है — मेरा वोट पक्का! 👍`,
      `ग़ज़ब कार्ड डाला है गुरु! प्रति व्यक्ति बजट भी साफ़ दिख रहा है — इस बार गोवा/ट्रिप कैंसिल नहीं होगी! 🔥🧳`,
    ],
    weather: [
      `अच्छा किया मौसम पहले ही चेक कर लिया 🌦 अब भीगने का टेंशन ख़त्म! 👍`,
      `लाइव मौसम रिपोर्ट के हिसाब से तो चाय-पकौड़े या घूमने का एकदम सही टाइम है! ☕✨`,
    ],
    trains: [
      `तत्काल खुलते ही IRCTC पे टूट पड़ो भाई लोग वरना वेटिंग 140 चली जाएगी! 🚆😂`,
      `सीधा ट्रेन और टाइमटेबल लिंक मिल गया — जल्दी टिकट लॉक करो पलटन! 🙌`,
    ],
    flights: [
      `सुबह वाली फ्लाइट पकड़ो भाई, किराया आधा बच जाएगा — बाकी पैसों की पार्टी! ✈️💸`,
      `वीकेंड से पहले किराया बढ़ने से पहले बुक कर लो गुरु! 🔥`,
    ],
    movies: [
      `पिक्चर नाइट डन!! 🍿 कोने वाली रिक्लाइनर सीट अपनी है — समोसे मेरी तरफ़ से! 🎬`,
      `शो-टाइम बढ़िया है भाई, मैं तो इन हूँ! 🎟️🔥`,
    ],
    money: [
      `लो भाई लाइव पाई-पाई का हिसाब आ गया — अब कोई उधार का बहाना नहीं चलेगा! 💸🤣`,
      `बढ़िया स्प्लिट हिसाब निकाला है गुरु! 👍`,
    ],
  };
  const choices = map[card.vertical] || [
    `"${card.query}" का कार्ड एकदम काम का है भाई — मैंने अपना वोट डाल दिया! 🙌🔥`,
    `वाह गुरु, सब लाइव निकाल लाए! सेव कर लिया ये कार्ड 👀👍`,
  ];
  return { bot, reply: pickFresh(choices) };
}
