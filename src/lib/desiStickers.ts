import type { SoundDropId } from "./audio";

export interface DesiSticker {
  id: string;
  emoji: string;
  topTag: string;
  line1: string;
  line2: string;
  sub: string;
  bgA: string;
  bgB: string;
  accent: string;
  category: "bhaukaal" | "bollywood" | "ncr" | "chai";
  tags: string;
}

export const DESI_STICKERS: DesiSticker[] = [
  {
    id: "jalwa",
    emoji: "👑",
    topTag: "MIRZAPUR EDITION",
    line1: "जलवा है हमारा",
    line2: "यहाँ! 🔥",
    sub: "भौकाल टाइट है गुरु",
    bgA: "#7c2d12",
    bgB: "#1c1917",
    accent: "#fbbf24",
    category: "bhaukaal",
    tags: "jalwa mirzapur bhaukaal king boss up attitude swag",
  },
  {
    id: "binod",
    emoji: "☕",
    topTag: "PHULERA PANCHAYAT",
    line1: "देख रहा है बिनोद...",
    line2: "कैसी बातें हो रही हैं 👀",
    sub: "सचिव जी भी हैरान हैं",
    bgA: "#14532d",
    bgB: "#0f172a",
    accent: "#86efac",
    category: "bhaukaal",
    tags: "dekh raha hai binod panchayat phulera gossip chai",
  },
  {
    id: "beizzati",
    emoji: "😤",
    topTag: "DAMAD JI SPECIAL",
    line1: "ग़ज़ब बेइज़्ज़ती है",
    line2: "यार!! 💀",
    sub: "ये तो हद ही हो गई भाई",
    bgA: "#881337",
    bgB: "#0f172a",
    accent: "#fda4af",
    category: "bhaukaal",
    tags: "gajab beizzati insult roast funny panchayat",
  },
  {
    id: "systumm",
    emoji: "🕶️",
    topTag: "NCR · NOIDA · DADRI",
    line1: "SYSTUMM",
    line2: "फाड़ देंगे भाई! ⚡",
    sub: "एकदम कट्टई ज़हर माहौल",
    bgA: "#4c1d95",
    bgB: "#090d16",
    accent: "#c084fc",
    category: "ncr",
    tags: "system systumm ncr noida dadri ghaziabad gurgaon attitude",
  },
  {
    id: "paisa",
    emoji: "💸",
    topTag: "25 DIN MEIN DOUBLE",
    line1: "पैसा ही पैसा",
    line2: "होगा! 🤑",
    sub: "राजू भाई की स्कीम ऑन है",
    bgA: "#065f46",
    bgB: "#090d16",
    accent: "#34d399",
    category: "bollywood",
    tags: "paisa hi paisa hera pheri raju rich money scheme",
  },
  {
    id: "control_uday",
    emoji: "🧘",
    topTag: "MAJNU + UDAY",
    line1: "Control उदय...",
    line2: "Control!! 😤",
    sub: "बीपी मत बढ़ाओ भाई",
    bgA: "#1e3a8a",
    bgB: "#0f172a",
    accent: "#93c5fd",
    category: "bollywood",
    tags: "control uday welcome nana patekar calm angry",
  },
  {
    id: "abhi_maza",
    emoji: "🎢",
    topTag: "FULL MAHOL",
    line1: "अभी मज़ा आएगा",
    line2: "ना भिड़ू!! 🔥",
    sub: "सीट बेल्ट बाँध लो गुरु",
    bgA: "#9a3412",
    bgB: "#0f172a",
    accent: "#fdba74",
    category: "bollywood",
    tags: "abhi maza aayega na bhidu hera pheri hype game",
  },
  {
    id: "chacha_vidhayak",
    emoji: "🚙",
    topTag: "UP 16 · UP 32 VIP",
    line1: "चाचा विधायक हैं",
    line2: "हमारे! 😎",
    sub: "चालान-वालान की टेंशन नहीं",
    bgA: "#991b1b",
    bgB: "#111827",
    accent: "#fca5a5",
    category: "bhaukaal",
    tags: "chacha vidhayak up lucknow noida attitude vip",
  },
  {
    id: "kulhad_chai",
    emoji: "🫖",
    topTag: "TAPRI BREAK",
    line1: "पहले अदरक वाली",
    line2: "कुल्हड़ चाय पिलाओ! ☕",
    sub: "बिना चाय दिमाग़ काम नहीं करता",
    bgA: "#78350f",
    bgB: "#0f172a",
    accent: "#fcd34d",
    category: "chai",
    tags: "chai adrak kulhad tapri tea break samosa",
  },
  {
    id: "samosa_party",
    emoji: "🥟",
    topTag: "SHAM KA NASHTA",
    line1: "समोसा + हरी चटनी",
    line2: "+ जलेबी पार्टी! 🎉",
    sub: "कौन दे रहा है आज ट्रीट?",
    bgA: "#b45309",
    bgB: "#111827",
    accent: "#fde68a",
    category: "chai",
    tags: "samosa jalebi party treat food hungry snack",
  },
  {
    id: "muskuraiye",
    emoji: "🕌",
    topTag: "NAWABI TEHZEEB",
    line1: "मुस्कुराइए जनाब,",
    line2: "आप अड्डे में हैं! ✨",
    sub: "पहले आप, नहीं पहले आप!",
    bgA: "#0f766e",
    bgB: "#0f172a",
    accent: "#5eead4",
    category: "bhaukaal",
    tags: "muskuraiye lucknow tehzeeb nawab welcome polite",
  },
  {
    id: "maro_mujhe",
    emoji: "🤦",
    topTag: "PEAK DRAMA",
    line1: "ओ भाई...",
    line2: "मारो मुझे मारो! 😭",
    sub: "जज़्बात पलट दिए एकदम!",
    bgA: "#3730a3",
    bgB: "#0f172a",
    accent: "#a5b4fc",
    category: "bollywood",
    tags: "o bhai maro mujhe waqt badal diye jazbaat cricket",
  },
  {
    id: "hampe_to_hai_no",
    emoji: "🤷",
    topTag: "DELHI NCR CLASSIC",
    line1: "हमपे तो है ही नौ!",
    line2: "😜🙌",
    sub: "पैसे मत माँग लेना भाई",
    bgA: "#701a75",
    bgB: "#0f172a",
    accent: "#f0abfc",
    category: "ncr",
    tags: "hampe to hai hi 9 no broke funny delhi meme",
  },
  {
    id: "kattai_zahar",
    emoji: "🔥",
    topTag: "WEST UP CERTIFIED",
    line1: "कट्टई ज़हर",
    line2: "भाई मेरे!! 💯",
    sub: "गर्दा उड़ा दिए कसम से",
    bgA: "#be123c",
    bgB: "#090d16",
    accent: "#fda4af",
    category: "ncr",
    tags: "kattai zahar garda meerut kanpur fire awesome",
  },
  {
    id: "baburao_style",
    emoji: "🤓",
    topTag: "200 IQ MOVE",
    line1: "ये बाबूराव का",
    line2: "स्टाइल है! 🧠",
    sub: "दिमाग़ की बत्ती जला दे",
    bgA: "#1d4ed8",
    bgB: "#090d16",
    accent: "#93c5fd",
    category: "bollywood",
    tags: "ye baburao ka style hai smart genius win",
  },
  {
    id: "game_laga",
    emoji: "🎮",
    topTag: "SQUAD ORDER",
    line1: "बातें कम करो,",
    line2: "सीधा GAME लगाओ! 🚀",
    sub: "देखें किसमें कितना है दम!",
    bgA: "#6d28d9",
    bgB: "#090d16",
    accent: "#fde047",
    category: "chai",
    tags: "game lagao play challenge arcade squad",
  },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderDesiStickerUrl(s: DesiSticker): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="210" viewBox="0 0 380 210">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${s.bgA}"/>
        <stop offset="100%" stop-color="${s.bgB}"/>
      </linearGradient>
    </defs>
    <rect width="380" height="210" rx="28" fill="url(#g)" stroke="${s.accent}" stroke-opacity="0.55" stroke-width="3"/>
    <circle cx="330" cy="42" r="56" fill="${s.accent}" fill-opacity="0.11"/>
    <rect x="20" y="18" width="185" height="24" rx="12" fill="rgba(0,0,0,0.42)"/>
    <text x="32" y="34" font-family="system-ui, sans-serif" font-size="10.5" font-weight="900" letter-spacing="1.2" fill="${s.accent}">${escapeXml(s.topTag)}</text>
    <text x="326" y="70" font-family="system-ui, sans-serif" font-size="52" text-anchor="middle">${s.emoji}</text>
    <text x="24" y="96" font-family="system-ui, sans-serif" font-size="27" font-weight="900" fill="#ffffff">${escapeXml(s.line1)}</text>
    <text x="24" y="134" font-family="system-ui, sans-serif" font-size="27" font-weight="900" fill="${s.accent}">${escapeXml(s.line2)}</text>
    <line x1="24" y1="158" x2="356" y2="158" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>
    <text x="24" y="184" font-family="system-ui, sans-serif" font-size="13.5" font-weight="700" fill="#e2e8f0">${escapeXml(s.sub)}</text>
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
    id: "horn",
    emoji: "📯",
    label: "UP Roadways प्रेशर हॉर्न",
    shoutout: "📯 पों-पों-पों-पों!! साइड दे भाई — VIP सवारी आ रही है! 🚌💨",
  },
  {
    id: "dhol",
    emoji: "🥁",
    label: "बारात ढोल धमाका",
    shoutout: "🥁 ढोल बजाओ भाई — अड्डे में भौकाल एंट्री हो गई है! 💃🕺",
  },
  {
    id: "nagin",
    emoji: "🐍",
    label: "नागिन बीन डांस",
    shoutout: "🐍 रूमाल निकाल लो गुरु — नागिन डांस मोड ऑन! 🎶🤣",
  },
  {
    id: "ipl",
    emoji: "🏏",
    label: "IPL स्टेडियम सिक्सर",
    shoutout: "🏏 ता-ता-ता-तारा-रा!! गेंद सीधा बाउंड्री के पार — SIXER! 🔥",
  },
  {
    id: "ghanti",
    emoji: "🔔",
    label: "शुद्ध माहौल घंटी",
    shoutout: "🔔 टन-टन! ग्रुप की सारी नेगेटिव वाइब समाप्त — जय हो! 🙏✨",
  },
  {
    id: "chai",
    emoji: "☕",
    label: "टपरी चाय सीटी",
    shoutout: "☕ छोटू! पूरे ग्रुप के लिए स्पेशल कुल्हड़ वाली अदरक चाय और गरम समोसे लगा! 🥟",
  },
];

export const DESI_QUICK_POLLS: { question: string; options: string[] }[] = [
  {
    question: "सच्ची बताओ — शाम की असली जान कौन है? 😋",
    options: [
      "कानपुर/बनारस के तीखे गोलगप्पे 🥟",
      "दिल्ली वाले तंदूरी मोमोज़ + लाल चटनी 🔥",
      "गरम समोसा + जलेबी + अदरक चाय ☕",
      "लखनऊ की बिरयानी / कबाब 🍲",
    ],
  },
  {
    question: "इस ग्रुप का सबसे बड़ा 'हाई-लेवल फेंकू' कौन है? 👀🤣",
    options: [
      "जो 'बस 5 मिनट में पहुँचा' बोलके नहाने जाता है 🚿",
      "जो हर गोवा/ऋषिकेश प्लान के आखिरी दिन कैंसिल करता है 🏃",
      "जो 'पैसे बाद में भेजता हूँ' बोलके गायब रहता है 💸",
      "एडमिन खुद ही सबसे बड़ा कलाकार है 😎",
    ],
  },
  {
    question: "शादी/बारात में जाने का 100% असली मकसद क्या होता है? 🕺",
    options: [
      "पनीर टिक्का + चाट काउंटर + गरम गुलाब जामुन 🍨",
      "नागिन डांस में पूरी जान लगाना 🐍🥁",
      "दूल्हे के साथ बस 2 सेकंड फोटो खिंचवाना 📸",
      "रिश्तेदारों से बचके कोने में कोल्ड कॉफी पीना ☕",
    ],
  },
  {
    question: "इस वीकेंड का पक्का प्लान लॉक करो भाई! 🧭",
    options: [
      "ऋषिकेश / मसूरी रोड ट्रिप 🏔️",
      "नोएडा Sector-18 / CP चिल + मूवी नाइट 🎬",
      "रात भर अड्डे पे Squad Games टूर्नामेंट 🎮",
      "कहीं नहीं भाई, कूलर चलाके सोएंगे 😴",
    ],
  },
];
