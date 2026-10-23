import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Attachment,
  BotMode,
  BusEvent,
  GameId,
  LiveGame,
  Member,
  Message,
  ReplyPreview,
  SearchCard,
  SquadPoll,
  SyncStatus,
  User,
} from "../lib/types";
import { GAME_META, uid } from "../lib/types";
import {
  cleanText,
  claimLeadership,
  displayHost,
  getBotMode,
  getProfanityFilter,
  getRetentionDays,
  isOnline,
  loadMembers,
  loadMessages,
  normalizeRoomSlug,
  RETENTION_OPTIONS,
  roomLink,
  saveMembers,
  saveMessages,
  setBotMode,
  setProfanityFilter,
  setRetentionDays,
} from "../lib/store";
import {
  createGame,
  joinGame,
  mutateGame,
  playersFromMembers,
  readGame,
  writeGame,
} from "../lib/gameSync";
import {
  AVATAR_SEEDS,
  BOTS,
  BOT_GAME_CHEER,
  BOT_IDLE,
  gifUrl,
  makeAvatar,
  STATUS_PRESETS,
} from "../lib/data";
import {
  generateBotCardReaction,
  generateContextualBotReply,
} from "../lib/botBrain";
import { RoomSyncClient } from "../lib/realtime";
import { looksLikeQuestion } from "../lib/search";
import { summarize, type Summary } from "../lib/summarize";
import { EmojiPicker, GifPicker, SoundboardPicker } from "./Pickers";
import GameOverlay from "./GameOverlay";
import SearchConsole from "./SearchConsole";
import SearchCardView from "./SearchCardView";
import GameLibrary from "./GameLibrary";
import { sounds, type SoundDropId } from "../lib/audio";
import { DESI_QUICK_POLLS, SOUNDBOARD_ITEMS } from "../lib/desiStickers";

const GAME_IDS: GameId[] = [
  "dialogue",
  "golgappa",
  "bargain",
  "bomb",
  "astro",
  "reactor",
  "cipher",
  "chain",
  "blitz",
  "codebreak",
  "story",
  "tictactoe",
  "connect4",
  "slide",
  "wikirace",
];
const HUMAN_ONLY_GAMES: GameId[] = [
  "slide",
  "wikirace",
  "controller",
  "npc",
  "desk",
];
const REACTIONS = ["🙏", "🔥", "🤣", "❤️", "👑", "☕", "💀", "🚀"];

const SLASH_COMMANDS = [
  {
    cmd: "/game",
    label: "देसी पलटन आर्केड (18 गेम्स)",
    icon: "🎮",
    desc: "डायलॉग बाज़ी, गोलगप्पा चैलेंज, ऑटो मोल-भाव + 15 लाइव गेम्स!",
  },
  {
    cmd: "/poll",
    label: "लाइव ग्रुप पोल / मसाला बहस",
    icon: "🗳️",
    desc: "1-टैप देसी पोल या खुद का सवाल डालो लाइव वोटिंग के साथ",
  },
  {
    cmd: "/horn",
    label: "UP प्रेशर हॉर्न बजाओ! 📯",
    icon: "📯",
    desc: "ग्रुप के सारे फोन्स पर एक साथ ज़ोरदार हॉर्न साउंड बजाओ!",
  },
  {
    cmd: "/chai",
    label: "टपरी अदरक चाय + समोसा ऑर्डर",
    icon: "☕",
    desc: "पूरे अड्डे के लिए गरमा-गरम कुल्हड़ चाय सीटी के साथ मँगाओ!",
  },
  {
    cmd: "/trip",
    label: "ट्रिप प्लानर (ऋषिकेश / गोवा / मनाली)",
    icon: "🧭",
    desc: "पूरा दिन-वार प्लान, लाइव मौसम और प्रति व्यक्ति खर्च हिसाब",
  },
  {
    cmd: "/train",
    label: "ट्रेन सर्च (IRCTC / Vande Bharat)",
    icon: "🚆",
    desc: "दिल्ली, लखनऊ, बनारस, कानपुर लाइव ट्रेन रूट व बुकिंग",
  },
  {
    cmd: "/flight",
    label: "सस्ती फ्लाइट्स देखें",
    icon: "✈️",
    desc: "किराया और टाइमिंग की तुरंत तुलना करें",
  },
  {
    cmd: "/movie",
    label: "मूवी शो-टाइम & टिकट",
    icon: "🎬",
    desc: "PVR / BookMyShow शो और ट्रेलर कार्ड ग्रुप में शेयर करें",
  },
  {
    cmd: "/weather",
    label: "लाइव मौसम का हाल",
    icon: "🌦",
    desc: "अभी का तापमान और अगले 5 दिन का मौसम",
  },
  {
    cmd: "/food",
    label: "चाट, ढाबा & रेस्टोरेंट खोजें",
    icon: "🥟",
    desc: "आस-पास के बढ़िया खाने के ठिकाने ढूँढें",
  },
  {
    cmd: "/calc",
    label: "पार्टी बिल स्प्लिट & करेंसी हिसाब",
    icon: "💸",
    desc: "दोस्तों में खर्च बराबर बाँटें बिना उधार की चिकचिक के",
  },
];

const PLACEHOLDERS = [
  "अड्डे पे कुछ लिखो भाई… ('GAME' लिखते ही लाइव मुकाबला चालू! 🔥)",
  "'/' लिखो — /horn, /chai, /poll, /trip, /train सब हाज़िर है! 😎",
  "🔥 मीम बटन दबाओ — मिर्ज़ापुर, पंचायत और हेरा फेरी स्टीकर भेजो!",
  "📯 हॉर्न बटन से पूरे ग्रुप के फोन पर लाइव ढोल/हॉर्न बजाओ!",
];

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const fmtDay = (ts: number) => {
  const d = new Date(ts),
    today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) {
    const prev = byId.get(m.id);
    if (!prev) {
      byId.set(m.id, m);
    } else {
      // Preserve ephemeral local blob URL if cloud stripped oversized attachment
      const mergedAttachment =
        m.attachment?.ephemeral && prev.attachment?.url
          ? prev.attachment
          : m.attachment || prev.attachment;
      const mergedSeen = Array.from(
        new Set([...(prev.seenBy || []), ...(m.seenBy || [])])
      );
      byId.set(m.id, {
        ...prev,
        ...m,
        attachment: mergedAttachment,
        seenBy: mergedSeen.length ? mergedSeen : undefined,
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.ts - b.ts);
}

export default function ChatRoom({
  me,
  room,
  onUpdateMe,
  onSwitchRoom,
  onLeave,
}: {
  me: User;
  room: string;
  onUpdateMe: (next: User) => void;
  onSwitchRoom: (nextRoom: string) => void;
  onLeave: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages(room));
  const [cloudHumans, setCloudHumans] = useState<Member[]>([]);
  const [localHumans, setLocalHumans] = useState<Member[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [botMode, setBotModeState] = useState<BotMode>(() => getBotMode());
  const [game, setGame] = useState<LiveGame | null>(() => readGame(room));
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<ReplyPreview | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<"emoji" | "gif" | "sound" | null>(null);
  const [typing, setTyping] = useState<
    Record<string, { name: string; until: number }>
  >({});
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", "", ""]);
  const [roomInput, setRoomInput] = useState(room);
  const [editName, setEditName] = useState(me.name);
  const [editBio, setEditBio] = useState(me.bio || STATUS_PRESETS[0]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [searchOpen, setSearchOpen] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [dictating, setDictating] = useState(false);
  const [unread, setUnread] = useState(0);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [retention, setRetention] = useState(getRetentionDays());
  const [profanity, setProfanity] = useState(getProfanityFilter());
  const [isLeader, setIsLeader] = useState(false);
  const [slashMenu, setSlashMenu] = useState(false);
  const [slashIdx, setSlashIdx] = useState(0);
  const [phIdx, setPhIdx] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [arcadeOpen, setArcadeOpen] = useState(false);

  const syncRef = useRef<RoomSyncClient | null>(null);
  const leaderRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const atBottomRef = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recTimerRef = useRef<number>(0);
  const speechRef = useRef<any>(null);
  const botTimersRef = useRef<number[]>([]);
  const idleCountRef = useRef(0);
  const lastTypingBroadcastRef = useRef(0);

  const gameRef = useRef(game);
  gameRef.current = game;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const botModeRef = useRef(botMode);
  botModeRef.current = botMode;

  useEffect(() => {
    setRoomInput(room);
  }, [room]);

  useEffect(() => {
    setEditName(me.name);
    setEditBio(me.bio || STATUS_PRESETS[0]);
  }, [me]);

  // Unified real human + optional AI squad roster
  const activeHumans = useMemo(() => {
    const map = new Map<string, Member>();
    map.set(me.id, {
      ...me,
      lastSeen: Date.now(),
      bot: false,
    });
    for (const h of localHumans) {
      if (!h.bot && isOnline(h)) map.set(h.id, h);
    }
    for (const h of cloudHumans) {
      if (!h.bot) map.set(h.id, h);
    }
    const list = Array.from(map.values());
    if (!list.some((x) => x.admin) && list.length > 0) {
      list[0] = { ...list[0], admin: true };
    }
    return list;
  }, [me, localHumans, cloudHumans]);

  const botsActive = useMemo(() => {
    if (botMode === "off") return false;
    if (botMode === "on") return true;
    // Smart "auto" mode: AI regulars fill in when solo; step back automatically when 2+ real humans are online!
    return activeHumans.length <= 1;
  }, [botMode, activeHumans.length]);

  const botsActiveRef = useRef(botsActive);
  botsActiveRef.current = botsActive;

  const members = useMemo<Member[]>(() => {
    if (!botsActive) return activeHumans;
    return [
      ...activeHumans,
      ...BOTS.map((b) => ({ ...b, lastSeen: Date.now() })),
    ];
  }, [activeHumans, botsActive]);

  const membersRef = useRef(members);
  membersRef.current = members;

  const notify = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const emitEvent = useCallback((e: BusEvent) => {
    syncRef.current?.emit(e);
  }, []);

  const persistAndBroadcastUpdate = useCallback(
    (updated: Message) => {
      setMessages((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      emitEvent({ t: "update", m: updated });
      void syncRef.current?.persistMessage(updated);
    },
    [emitEvent]
  );

  const addMessage = useCallback(
    (m: Message, broadcast = true) => {
      const initial: Message = {
        ...m,
        seenBy: m.seenBy || [m.name],
        delivery: m.delivery || "sending",
      };
      setMessages((prev) =>
        prev.some((p) => p.id === initial.id) ? prev : [...prev, initial]
      );
      if (broadcast) {
        emitEvent({ t: "msg", m: initial });
        void syncRef.current?.persistMessage(initial).then((saved) => {
          setMessages((prev) =>
            prev.map((x) =>
              x.id === initial.id
                ? { ...x, delivery: saved ? "cloud" : "sent" }
                : x
            )
          );
        });
      }
    },
    [emitEvent]
  );

  const markMessageSeenBy = useCallback(
    (msgId: string, readerName: string) => {
      const target = messagesRef.current.find((m) => m.id === msgId);
      if (!target || target.seenBy?.includes(readerName)) return;
      const updated: Message = {
        ...target,
        seenBy: [...(target.seenBy || []), readerName],
      };
      persistAndBroadcastUpdate(updated);
    },
    [persistAndBroadcastUpdate]
  );

  const systemMsg = useCallback(
    (text: string) => {
      addMessage({
        id: uid(),
        kind: "system",
        userId: "system",
        name: "ChatArena",
        avatar: "",
        ts: Date.now(),
        text,
      });
    },
    [addMessage]
  );

  // Cycling placeholder hint
  useEffect(() => {
    const iv = setInterval(() => {
      setPhIdx((p) => (p + 1) % PLACEHOLDERS.length);
    }, 4800);
    return () => clearInterval(iv);
  }, []);

  /* ---------- Realistic Contextual Bot Simulation (Solo / Opt-In Only) ---------- */
  const botSay = useCallback(
    (
      bot: Member,
      text: string,
      readDelayMs: number,
      typingMs = 1500,
      replyTo?: ReplyPreview,
      attachment?: Attachment
    ) => {
      const t1 = window.setTimeout(() => {
        if (!botsActiveRef.current) return;
        const until = Date.now() + typingMs + 300;
        emitEvent({
          t: "typing",
          uid: bot.id,
          name: bot.name,
          until,
        });
        setTyping((p) => ({
          ...p,
          [bot.id]: { name: bot.name, until },
        }));
        const t2 = window.setTimeout(() => {
          if (!botsActiveRef.current) return;
          setTyping((p) => {
            const copy = { ...p };
            delete copy[bot.id];
            return copy;
          });
          sounds.playPop();
          addMessage({
            id: uid(),
            kind: "chat",
            userId: bot.id,
            name: bot.name,
            avatar: bot.avatar,
            ts: Date.now(),
            text,
            replyTo,
            attachment,
          });
        }, typingMs);
        botTimersRef.current.push(t2);
      }, readDelayMs);
      botTimersRef.current.push(t1);
    },
    [addMessage, emitEvent]
  );

  const maybeBotReply = useCallback(
    (msg: Message) => {
      if (!leaderRef.current || !botsActiveRef.current) return;
      if (!msg.text && msg.attachment?.type !== "gif") return;
      const plan = generateContextualBotReply(
        msg.name,
        msg.text || "",
        messagesRef.current
      );
      const readerName = plan?.bot.name || BOTS[0].name;
      const tRead = window.setTimeout(() => {
        if (botsActiveRef.current) markMessageSeenBy(msg.id, readerName);
      }, 650);
      botTimersRef.current.push(tRead);

      if (!plan) return;
      const shouldQuote = Boolean(msg.text && msg.text.length > 48 && Math.random() < 0.35);
      botSay(
        plan.bot,
        plan.reply,
        plan.readDelayMs,
        plan.typingMs,
        shouldQuote && msg.text
          ? {
              id: msg.id,
              userId: msg.userId,
              name: msg.name,
              preview: msg.text.slice(0, 72),
            }
          : undefined,
        plan.stickerUrl
          ? {
              type: "gif",
              name: plan.stickerName || "Desi Sticker",
              url: plan.stickerUrl,
              mime: "image/svg+xml",
            }
          : undefined
      );
    },
    [botSay, markMessageSeenBy]
  );

  /* ---------- Cloud + Local Realtime Connection ---------- */
  useEffect(() => {
    setMessages(loadMessages(room));
    setGame(readGame(room));
    setCloudHumans([]);
    setUnread(0);

    const cutoff = Date.now() - getRetentionDays() * 86400000;

    const handleBusEvent = (e: BusEvent) => {
      if (e.t === "msg") {
        setMessages((prev) => {
          const exists = prev.some((p) => p.id === e.m.id);
          if (!exists && e.m.userId !== me.id) {
            sounds.playPop();
            if (!atBottomRef.current) setUnread((u) => u + 1);
          }
          return mergeMessages(prev, [e.m]);
        });
      } else if (e.t === "update") {
        setMessages((prev) => mergeMessages(prev, [e.m]));
      } else if (e.t === "del") {
        setMessages((prev) => prev.filter((p) => p.id !== e.id));
      } else if (e.t === "seen") {
        setMessages((prev) =>
          prev.map((m) =>
            e.ids.includes(m.id) && !m.seenBy?.includes(e.reader)
              ? { ...m, seenBy: [...(m.seenBy || []), e.reader] }
              : m
          )
        );
      } else if (e.t === "typing") {
        setTyping((p) => ({
          ...p,
          [e.uid]: { name: e.name, until: e.until },
        }));
      } else if (e.t === "game") {
        const current = readGame(room);
        if (e.g && (!current || e.g.v >= current.v)) writeGame(room, e.g);
        if (!e.g) writeGame(room, null);
        setGame((cur) => (!e.g ? null : !cur || e.g.v >= cur.v ? e.g : cur));
      } else if (e.t === "presence") {
        setLocalHumans(loadMembers(room).filter((m) => !m.bot));
      } else if (e.t === "sound") {
        sounds.playSoundDrop(e.soundId);
        const found = SOUNDBOARD_ITEMS.find((x) => x.id === e.soundId);
        notify(`${found?.emoji || "📯"} ${e.by} ने बजाया: ${found?.label || "साउंड ड्रॉप"}!`);
      }
    };

    const client = new RoomSyncClient(room, me, {
      onStatus: setSyncStatus,
      onHydrateMessages: (cloudMsgs) => {
        setMessages((prev) => mergeMessages(prev, cloudMsgs));
      },
      onEvent: handleBusEvent,
      onCloudMembers: setCloudHumans,
    });
    syncRef.current = client;
    void client.connect(cutoff);

    const existing = loadMembers(room).filter((m) => !m.bot);
    const nextLocal = existing.some((m) => m.id === me.id)
      ? existing.map((m) =>
          m.id === me.id
            ? { ...m, name: me.name, avatar: me.avatar, bio: me.bio, lastSeen: Date.now() }
            : m
        )
      : [
          ...existing,
          {
            ...me,
            lastSeen: Date.now(),
            admin: !existing.some((m) => m.admin),
          },
        ];
    saveMembers(room, nextLocal);
    setLocalHumans(nextLocal);
    client.emit({ t: "presence" });

    leaderRef.current = claimLeadership(room);
    setIsLeader(leaderRef.current);

    if (!existing.some((m) => m.id === me.id)) {
      addMessage({
        id: uid(),
        kind: "system",
        userId: "system",
        name: "ChatArena",
        avatar: "",
        ts: Date.now(),
        text: `👋 ${me.name} joined /${room}`,
      });
      if (leaderRef.current && botsActiveRef.current) {
        const bot = BOTS[0];
        botSay(
          bot,
          `अरे राम-राम ${me.name} भाई! 🙏 रूम /${room} एकदम लाइव है — ऊपर वाले 🔗 लिंक से यारों को जोड़ लो, 📯 प्रेशर हॉर्न बजाओ, मीम्स फेंको, या GAME लिखते ही मुकाबला चालू करो! 🔥`,
          1100,
          1400
        );
      }
    }

    const heartbeat = window.setInterval(() => {
      leaderRef.current = claimLeadership(room);
      setIsLeader(leaderRef.current);
      const cur = loadMembers(room).filter((m) => !m.bot);
      const updated = cur.map((m) =>
        m.id === me.id
          ? { ...m, name: me.name, avatar: me.avatar, bio: me.bio, lastSeen: Date.now() }
          : m
      );
      if (!updated.some((m) => m.id === me.id)) {
        updated.push({ ...me, lastSeen: Date.now() });
      }
      saveMembers(room, updated);
      setLocalHumans(updated);
      client.emit({ t: "presence" });
      setTyping((p) =>
        Object.fromEntries(
          Object.entries(p).filter(([, v]) => v.until > Date.now())
        )
      );
      const g = readGame(room);
      setGame((c) => (!g ? null : !c || g.v >= c.v ? g : c));
    }, 4000);

    const idle = window.setInterval(() => {
      if (
        !leaderRef.current ||
        !botsActiveRef.current ||
        gameRef.current ||
        idleCountRef.current >= 3
      )
        return;
      const last = messagesRef.current[messagesRef.current.length - 1];
      if (last && Date.now() - last.ts > 65000) {
        idleCountRef.current++;
        const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
        botSay(
          bot,
          BOT_IDLE[Math.floor(Math.random() * BOT_IDLE.length)],
          600,
          1500
        );
      }
    }, 35000);

    return () => {
      clearInterval(heartbeat);
      clearInterval(idle);
      botTimersRef.current.forEach(clearTimeout);
      botTimersRef.current = [];
      client.disconnect();
      syncRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, me.id]);

  // Persist local cache & emit read receipts for visible incoming messages
  useEffect(() => {
    saveMessages(room, messages);
    const unseenIds = messages
      .slice(-25)
      .filter(
        (m) =>
          m.kind === "chat" &&
          m.userId !== me.id &&
          !(m.seenBy || []).includes(me.name)
      )
      .map((m) => m.id);

    if (unseenIds.length > 0 && atBottomRef.current) {
      setMessages((prev) =>
        prev.map((m) =>
          unseenIds.includes(m.id)
            ? { ...m, seenBy: Array.from(new Set([...(m.seenBy || []), me.name])) }
            : m
        )
      );
      emitEvent({ t: "seen", reader: me.name, ids: unseenIds });
    }
  }, [messages, room, me.id, me.name, emitEvent]);

  useEffect(() => {
    if (atBottomRef.current) {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
      setUnread(0);
    }
  }, [messages.length, typing]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottomRef.current) setUnread(0);
  };

  const jumpToMessage = (id: string) => {
    const el = document.getElementById("msg-" + id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(id);
    window.setTimeout(() => setHighlightedId(null), 1400);
  };

  /* ---------- Cross-Device Game Operations ---------- */
  const syncGame = useCallback(
    (g: LiveGame | null) => {
      setGame(g);
      emitEvent({ t: "game", g });
      void syncRef.current?.persistGame(g);
    },
    [emitEvent]
  );

  const mutate = useCallback(
    (fn: (g: LiveGame) => LiveGame | null) => {
      const g = mutateGame(room, fn);
      syncGame(g);
    },
    [room, syncGame]
  );

  const startGame = useCallback(
    (byName: string, requested?: GameId) => {
      sounds.playGameTrigger();
      const online = membersRef.current.filter(isOnline);
      const id =
        requested || GAME_IDS[Math.floor(Math.random() * GAME_IDS.length)];
      let players = playersFromMembers(online, isOnline);
      if (HUMAN_ONLY_GAMES.includes(id)) {
        players = players.filter((p) => !p.bot);
      }
      if (!players.length) {
        players = [{ uid: me.id, name: me.name, avatar: me.avatar, score: 0 }];
      }
      const g = createGame(
        id,
        Math.floor(Math.random() * 1e9),
        byName,
        players
      );
      writeGame(room, g);
      syncGame(g);
      const meta = GAME_META[g.id];
      systemMsg(
        `🎮 ${byName} launched ${meta.name} ${meta.emoji} — ${players.length} in squad! Chat locked until mission ends.`
      );
    },
    [room, syncGame, systemMsg, me]
  );

  const finishGame = useCallback(
    (result: string, bonus?: string) => {
      const existing = readGame(room);
      if (!existing || existing.phase === "done") return;
      const g = mutateGame(room, (cur) => ({
        ...cur,
        phase: "done",
        result,
        bonus,
      }));
      syncGame(g);
      systemMsg(`🏆 Mission complete: ${result} — Chat unlocked!`);
      if (bonus) systemMsg(bonus);
      window.setTimeout(() => {
        writeGame(room, null);
        syncGame(null);
      }, 4200);
      if (leaderRef.current && botsActiveRef.current) {
        const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
        botSay(
          bot,
          BOT_GAME_CHEER[Math.floor(Math.random() * BOT_GAME_CHEER.length)],
          4600,
          1200
        );
      }
    },
    [room, syncGame, systemMsg, botSay]
  );

  const abortGame = useCallback(() => {
    const existing = readGame(room);
    writeGame(room, null);
    syncGame(null);
    if (existing && existing.phase === "play") {
      systemMsg(`🔓 ${me.name} ended ${GAME_META[existing.id].name} — Chat unlocked.`);
    }
  }, [me.name, room, syncGame, systemMsg]);

  // Auto-join ongoing squad game when entering mid-round from another phone/browser
  useEffect(() => {
    if (
      game &&
      game.phase === "play" &&
      !game.players.some((p) => p.uid === me.id)
    ) {
      const g = joinGame(room, {
        uid: me.id,
        name: me.name,
        avatar: me.avatar,
        score: 0,
      });
      if (g) syncGame(g);
    }
  }, [game, me, room, syncGame]);

  /* ---------- Sending, Replying, Editing & Polls ---------- */
  const createSquadPoll = useCallback(
    (question: string, rawOpts: string[]) => {
      const cleanOpts = rawOpts.map((o) => o.trim()).filter(Boolean);
      if (!question.trim() || cleanOpts.length < 2) return;
      const poll: SquadPoll = {
        question: question.trim(),
        createdBy: me.name,
        options: cleanOpts.slice(0, 5).map((label, i) => ({
          id: "opt_" + i + "_" + uid().slice(0, 4),
          label,
          votes: [],
        })),
      };
      sounds.playSend();
      const msg: Message = {
        id: uid(),
        kind: "chat",
        userId: me.id,
        name: me.name,
        avatar: me.avatar,
        ts: Date.now(),
        poll,
      };
      addMessage(msg);
      if (leaderRef.current && botsActiveRef.current) {
        BOTS.slice(0, 2).forEach((b, idx) => {
          const t = window.setTimeout(() => {
            if (!botsActiveRef.current) return;
            const cur = messagesRef.current.find((x) => x.id === msg.id);
            if (!cur?.poll) return;
            const pick =
              cur.poll.options[
                Math.floor(Math.random() * cur.poll.options.length)
              ];
            const updated: Message = {
              ...cur,
              poll: {
                ...cur.poll,
                options: cur.poll.options.map((o) =>
                  o.id === pick.id && !o.votes.includes(b.name)
                    ? { ...o, votes: [...o.votes, b.name] }
                    : o
                ),
              },
            };
            persistAndBroadcastUpdate(updated);
          }, 1400 + idx * 1100);
          botTimersRef.current.push(t);
        });
      }
    },
    [addMessage, me, persistAndBroadcastUpdate]
  );

  const triggerSoundDrop = useCallback(
    (soundId: SoundDropId, label?: string, shoutout?: string) => {
      sounds.playSoundDrop(soundId);
      emitEvent({ t: "sound", soundId, by: me.name });
      const item = SOUNDBOARD_ITEMS.find((x) => x.id === soundId);
      const line = shoutout || item?.shoutout || `📯 ${label || "भौकाल साउंड"}!`;
      addMessage({
        id: uid(),
        kind: "chat",
        userId: me.id,
        name: me.name,
        avatar: me.avatar,
        ts: Date.now(),
        text: line,
      });
      notify(`${item?.emoji || "📯"} पूरे रूम में '${item?.label || label}' गूँज गया!`);
    },
    [addMessage, emitEvent, me, notify]
  );

  const send = useCallback(() => {
    const raw = input.trim();
    if (!raw || gameRef.current) return;
    setInput("");
    setPicker(null);
    setSlashMenu(false);

    // Save edit if editing an existing message
    if (editingMsg) {
      const updated: Message = {
        ...editingMsg,
        text: cleanText(raw),
        editedAt: Date.now(),
      };
      setEditingMsg(null);
      sounds.playPop();
      persistAndBroadcastUpdate(updated);
      notify("✏️ Message updated");
      return;
    }

    if (raw.toUpperCase() === "GAME") {
      sounds.playGameTrigger();
      setReplyingTo(null);
      addMessage({
        id: uid(),
        kind: "chat",
        userId: me.id,
        name: me.name,
        avatar: me.avatar,
        ts: Date.now(),
        text: "GAME",
      });
      startGame(me.name);
      return;
    }

    if (raw === "/game") {
      setArcadeOpen(true);
      return;
    }

    if (/^\/(horn|chai|dhol|nagin|ipl|ghanti)\b/i.test(raw)) {
      const soundKey = raw.slice(1).trim().toLowerCase() as SoundDropId;
      triggerSoundDrop(soundKey);
      return;
    }

    if (/^\/poll\b/i.test(raw)) {
      const rest = raw.replace(/^\/poll\s*/i, "").trim();
      const parts = rest.split("|").map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 3) {
        createSquadPoll(parts[0], parts.slice(1));
      } else {
        setPollQuestion(parts[0] || "");
        setPollModalOpen(true);
      }
      return;
    }

    if (
      /^\/(ask|search|find|trip|train|flight|movie|stay|weather|food|calc)\b/i.test(
        raw
      )
    ) {
      sounds.playPop();
      setSearchOpen(raw.replace(/^\/\w+\s*/, ""));
      return;
    }

    sounds.playSend();
    const outgoing: Message = {
      id: uid(),
      kind: "chat",
      userId: me.id,
      name: me.name,
      avatar: me.avatar,
      ts: Date.now(),
      text: cleanText(raw),
      replyTo: replyingTo || undefined,
    };
    setReplyingTo(null);
    addMessage(outgoing);

    if (looksLikeQuestion(raw)) {
      setSearchOpen(raw);
      notify("🔎 Search Console ready — preview live card before sharing!");
    } else {
      maybeBotReply(outgoing);
    }
  }, [
    input,
    editingMsg,
    replyingTo,
    me,
    addMessage,
    startGame,
    createSquadPoll,
    maybeBotReply,
    notify,
    persistAndBroadcastUpdate,
    triggerSoundDrop,
  ]);

  const shareCard = useCallback(
    (card: SearchCard) => {
      setSearchOpen(null);
      sounds.playSend();
      const msg: Message = {
        id: uid(),
        kind: "ai",
        userId: me.id,
        name: me.name,
        avatar: me.avatar,
        ts: Date.now(),
        card,
        reactions: {},
      };
      addMessage(msg);
      notify("📤 Shared live card with the room");

      if (leaderRef.current && botsActiveRef.current) {
        const { bot, reply } = generateBotCardReaction(card);
        botSay(bot, reply, 1400, 1500);
        if (card.askVote && card.poll?.length) {
          const t = window.setTimeout(() => {
            if (!botsActiveRef.current) return;
            const cur = messagesRef.current.find((x) => x.id === msg.id);
            if (!cur?.card?.poll) return;
            const updatedCard: SearchCard = {
              ...cur.card,
              poll: cur.card.poll.map((opt, idx) =>
                idx === 0 && !opt.votes.includes(bot.name)
                  ? { ...opt, votes: [...opt.votes, bot.name] }
                  : opt
              ),
            };
            persistAndBroadcastUpdate({ ...cur, card: updatedCard });
          }, 2200);
          botTimersRef.current.push(t);
        }
      }
    },
    [addMessage, botSay, me, notify, persistAndBroadcastUpdate]
  );

  const voteOnMessagePoll = useCallback(
    (m: Message, optionId: string, kind: "squad" | "card") => {
      sounds.playPop();
      if (kind === "squad" && m.poll) {
        const options = m.poll.options.map((o) => {
          const filtered = o.votes.filter((n) => n !== me.name);
          if (o.id !== optionId) return { ...o, votes: filtered };
          return {
            ...o,
            votes: o.votes.includes(me.name) ? filtered : [...filtered, me.name],
          };
        });
        persistAndBroadcastUpdate({ ...m, poll: { ...m.poll, options } });
      } else if (kind === "card" && m.card?.poll) {
        const poll = m.card.poll.map((o) => {
          const filtered = o.votes.filter((n) => n !== me.name);
          if (o.id !== optionId) return { ...o, votes: filtered };
          return {
            ...o,
            votes: o.votes.includes(me.name) ? filtered : [...filtered, me.name],
          };
        });
        persistAndBroadcastUpdate({ ...m, card: { ...m.card, poll } });
      }
    },
    [me.name, persistAndBroadcastUpdate]
  );

  const sendAttachment = useCallback(
    (att: Attachment, text?: string) => {
      if (gameRef.current) return;
      sounds.playSend();
      const outgoing: Message = {
        id: uid(),
        kind: "chat",
        userId: me.id,
        name: me.name,
        avatar: me.avatar,
        ts: Date.now(),
        text,
        attachment: att,
        replyTo: replyingTo || undefined,
      };
      setReplyingTo(null);
      addMessage(outgoing);
      maybeBotReply({
        ...outgoing,
        text:
          text ||
          (att.type === "gif"
            ? ""
            : att.type === "audio"
            ? "hey check out this note"
            : "shared a file"),
      });
    },
    [me, replyingTo, addMessage, maybeBotReply]
  );

  const react = useCallback(
    (m: Message, emoji: string) => {
      sounds.playPop();
      setReactFor(null);
      const r = { ...(m.reactions || {}) };
      const list = r[emoji] || [];
      r[emoji] = list.includes(me.name)
        ? list.filter((n) => n !== me.name)
        : [...list, me.name];
      if (!r[emoji].length) delete r[emoji];
      persistAndBroadcastUpdate({ ...m, reactions: r });
    },
    [me.name, persistAndBroadcastUpdate]
  );

  const onTyping = (v: string) => {
    setInput(v);
    if (v.startsWith("/") && !v.includes(" ")) {
      setSlashMenu(true);
      setSlashIdx(0);
    } else {
      setSlashMenu(false);
    }
    const now = Date.now();
    if (now - lastTypingBroadcastRef.current > 900) {
      lastTypingBroadcastRef.current = now;
      emitEvent({
        t: "typing",
        uid: me.id,
        name: me.name,
        until: now + 2600,
      });
    }
  };

  const filteredSlash = useMemo(() => {
    const needle = input.trim().toLowerCase();
    if (!needle.startsWith("/")) return SLASH_COMMANDS;
    const matches = SLASH_COMMANDS.filter((s) => s.cmd.startsWith(needle));
    return matches.length ? matches : SLASH_COMMANDS;
  }, [input]);

  const handleSlashSelect = (cmd: string) => {
    sounds.playPop();
    setSlashMenu(false);
    if (cmd === "/game") {
      setArcadeOpen(true);
      setInput("");
    } else if (cmd === "/poll") {
      setPollModalOpen(true);
      setInput("");
    } else if (cmd === "/horn") {
      setInput("");
      triggerSoundDrop("horn");
    } else if (cmd === "/chai") {
      setInput("");
      triggerSoundDrop("chai");
    } else {
      setSearchOpen("");
      setInput("");
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 4 * 1024 * 1024)
      return notify("File too large — keep under 4 MB");
    const reader = new FileReader();
    reader.onload = () => {
      const ephemeral = f.size > 500 * 1024;
      sendAttachment({
        type: f.type.startsWith("image/") ? "image" : "file",
        name: f.name,
        url: String(reader.result),
        mime: f.type || "application/octet-stream",
        size: f.size,
        ephemeral,
      });
      if (ephemeral) notify("Large file broadcast live to online members");
    };
    reader.readAsDataURL(f);
  };

  const toggleRecording = async () => {
    if (recording) return recorderRef.current?.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const started = Date.now();
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        clearInterval(recTimerRef.current);
        setRecording(false);
        setRecSecs(0);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, {
          type: rec.mimeType || "audio/webm",
        });
        if (blob.size < 500) return;
        const duration = Math.max(1, Math.round((Date.now() - started) / 1000));
        const reader = new FileReader();
        reader.onload = () =>
          sendAttachment({
            type: "audio",
            name: "Voice note",
            url: String(reader.result),
            mime: blob.type,
            size: blob.size,
            duration,
            ephemeral: blob.size > 500 * 1024,
          });
        reader.readAsDataURL(blob);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      recTimerRef.current = window.setInterval(
        () =>
          setRecSecs((s) => {
            if (s >= 59) rec.stop();
            return s + 1;
          }),
        1000
      );
    } catch {
      notify("Microphone permission denied");
    }
  };

  const toggleDictation = () => {
    if (dictating) {
      speechRef.current?.stop();
      return setDictating(false);
    }
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return notify("Voice dictation requires Chrome, Edge, or Safari");
    sounds.playPop();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    const base = input;
    rec.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++)
        t += e.results[i][0].transcript;
      setInput((base ? base + " " : "") + t);
    };
    rec.onend = () => setDictating(false);
    rec.onerror = () => {
      setDictating(false);
      notify("Couldn't capture speech audio");
    };
    rec.start();
    speechRef.current = rec;
    setDictating(true);
  };

  const copyLink = async () => {
    const link = roomLink(room);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join /${room} on ChatArena Live`,
          text: `Hop into our live room /${room} — chat & play multiplayer games together!`,
          url: link,
        });
        return;
      } catch {
        /* user dismissed share sheet — fall back to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      sounds.playSuccess();
      notify(`🔗 Copied ${link}`);
    } catch {
      notify(link);
    }
  };

  const deleteMsg = (m: Message) => {
    if (m.userId !== me.id) return notify("🚩 Message flagged for room host");
    setMessages((prev) => prev.filter((p) => p.id !== m.id));
    emitEvent({ t: "del", id: m.id });
    void syncRef.current?.deleteMessage(m.id);
  };

  const changeBotMode = (next: BotMode) => {
    sounds.playPop();
    setBotMode(next);
    setBotModeState(next);
    notify(
      next === "off"
        ? "👤 Humans-only mode — AI regulars hidden"
        : next === "on"
        ? "🤖 AI regulars active in this room"
        : "✨ Smart mode — AI regulars step back when real friends join"
    );
  };

  const saveProfileEdits = () => {
    const clean = editName.trim().slice(0, 24) || me.name;
    const updatedUser: User = {
      ...me,
      name: clean,
      bio: editBio.trim().slice(0, 40) || STATUS_PRESETS[0],
    };
    onUpdateMe(updatedUser);
    syncRef.current?.updateMyPresence(updatedUser);
    sounds.playSuccess();
    notify("✅ Profile updated live across room");
  };

  const typingNames = useMemo(
    () =>
      Object.entries(typing)
        .filter(([id, v]) => id !== me.id && v.until > Date.now())
        .map(([, v]) => v.name),
    [typing, me.id]
  );

  const onlineCount = members.filter(isOnline).length;
  const amHost =
    activeHumans.find((h) => h.id === me.id)?.admin ||
    game?.startedBy === me.name;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white selection:bg-violet-600 selection:text-white">
      {/* Top Navbar */}
      <header className="flex items-center gap-2 border-b border-white/10 bg-slate-900/95 px-3 py-2.5 backdrop-blur-xl sm:gap-3 sm:px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-violet-600 via-indigo-600 to-teal-500 text-lg shadow-lg shadow-violet-950">
          ⚡
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="truncate font-black leading-tight text-white">
              ChatArena
            </h1>
            <span className="rounded-lg bg-violet-500/20 px-2 py-0.5 font-mono text-xs font-bold text-violet-300">
              /{room}
            </span>
            <span
              title={
                syncStatus === "live"
                  ? "Connected to Supabase Realtime — real cross-device sync active"
                  : syncStatus === "connecting"
                  ? "Connecting to cloud sync…"
                  : "Local tab sync mode"
              }
              className={`hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold sm:inline-flex ${
                syncStatus === "live"
                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                  : syncStatus === "connecting"
                  ? "border-amber-500/35 bg-amber-500/10 text-amber-200"
                  : "border-slate-600 bg-slate-800 text-slate-300"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  syncStatus === "live"
                    ? "bg-emerald-400 animate-pulse"
                    : syncStatus === "connecting"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-slate-400"
                }`}
              />
              {syncStatus === "live"
                ? "Cloud Live"
                : syncStatus === "connecting"
                ? "Syncing…"
                : "Local Mode"}
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span>
              {activeHumans.length}{" "}
              {activeHumans.length === 1 ? "person" : "people"} live
              {botsActive ? ` · +${BOTS.length} AI squad` : ""}
            </span>
            {game && (
              <span className="ml-1 truncate rounded bg-amber-500/20 px-1.5 font-bold text-amber-300">
                🔒 {GAME_META[game.id].emoji} {GAME_META[game.id].name}
              </span>
            )}
          </p>
        </div>

        {/* Search & Plan */}
        <button
          onClick={() => {
            sounds.playPop();
            setSearchOpen("");
          }}
          title="Search trains, flights, movies, trips, weather & forex"
          className="group flex items-center gap-1.5 rounded-2xl border border-teal-400/40 bg-gradient-to-r from-teal-500/20 to-teal-400/10 px-3 py-2 text-xs font-black text-teal-300 shadow-md transition hover:border-teal-400 hover:bg-teal-500/25 active:scale-95"
        >
          <span className="text-sm transition group-hover:scale-110">🔎</span>
          <span className="hidden md:inline">Search &amp; Plan</span>
        </button>

        {/* Squad Arcade */}
        <button
          onClick={() => {
            sounds.playPop();
            setArcadeOpen(true);
          }}
          title="Open Squad Arcade — 15 multiplayer games"
          className="rounded-2xl border border-amber-400/40 bg-amber-400/15 px-3 py-2 font-mono text-xs font-black text-amber-300 shadow-md transition hover:bg-amber-400/25 active:scale-95"
        >
          🎮 <span className="hidden sm:inline">Arcade</span>
        </button>

        {/* Share / Copy Invite Link */}
        <button
          onClick={copyLink}
          className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md transition hover:brightness-110 active:scale-95"
        >
          🔗<span className="ml-1 hidden sm:inline">Invite</span>
        </button>

        {/* Settings & Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              sounds.playPop();
              setShowSettings((s) => !s);
            }}
            className="rounded-xl bg-slate-800/90 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Profile & Room Settings"
          >
            ⚙️
          </button>
          {showSettings && (
            <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-3xl border border-white/10 bg-slate-900 p-4 shadow-2xl backdrop-blur-xl">
              {/* Quick Profile Editor */}
              <div className="mb-3.5 border-b border-white/10 pb-3.5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Your Live Profile
                </p>
                <div className="mb-2 flex items-center gap-2.5">
                  <img
                    src={me.avatar}
                    alt={me.name}
                    className="h-11 w-11 rounded-full border border-violet-400/50 object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={24}
                      placeholder="Display name"
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-xs font-bold text-white outline-none focus:border-violet-400"
                    />
                    <input
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      maxLength={36}
                      placeholder="Status"
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300 outline-none focus:border-violet-400"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex gap-1">
                    {AVATAR_SEEDS.slice(0, 4).map((seed) => (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => {
                          const avatar = makeAvatar(editName || me.name, seed);
                          const updated = { ...me, avatar };
                          onUpdateMe(updated);
                          syncRef.current?.updateMyPresence(updated);
                        }}
                        className="rounded-full border border-white/10 p-0.5 hover:border-violet-400"
                      >
                        <img
                          src={makeAvatar(editName || me.name, seed)}
                          alt=""
                          className="h-6 w-6 rounded-full"
                        />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={saveProfileEdits}
                    className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-500"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* AI Squad Mode */}
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                AI Squad Regulars
              </p>
              <div className="mb-3 grid grid-cols-3 gap-1.5">
                {(
                  [
                    ["auto", "Smart Auto"],
                    ["on", "Always On"],
                    ["off", "Humans Only"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => changeBotMode(mode)}
                    className={`rounded-xl py-1.5 text-[11px] font-bold transition ${
                      botMode === mode
                        ? "bg-teal-500 text-slate-950 shadow"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                History Retention
              </p>
              <div className="mb-3 flex gap-1.5">
                {RETENTION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      sounds.playPop();
                      setRetentionDays(d);
                      setRetention(d);
                      notify(`History kept for ${d} days`);
                    }}
                    className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition ${
                      retention === d
                        ? "bg-violet-600 text-white shadow"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>

              <label className="mb-2.5 flex cursor-pointer items-center justify-between text-xs font-semibold text-slate-300">
                <span>Sound Effects</span>
                <button
                  type="button"
                  onClick={() => {
                    sounds.enabled = !soundEnabled;
                    setSoundEnabled(!soundEnabled);
                  }}
                  className={`h-6 w-11 rounded-full p-0.5 transition ${
                    soundEnabled ? "bg-violet-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition ${
                      soundEnabled ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </label>

              <label className="flex cursor-pointer items-center justify-between text-xs font-semibold text-slate-300">
                <span>Profanity Filter</span>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    setProfanityFilter(!profanity);
                    setProfanity(!profanity);
                  }}
                  className={`h-6 w-11 rounded-full p-0.5 transition ${
                    profanity ? "bg-violet-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition ${
                      profanity ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </label>

              <button
                onClick={onLeave}
                className="mt-3.5 w-full rounded-2xl bg-rose-500/15 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
              >
                Switch Profile / Leave Room
              </button>
            </div>
          )}
        </div>

        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setShowSidebar((s) => !s)}
          className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 lg:hidden"
        >
          👥
        </button>
      </header>

      {/* Main Layout */}
      <div className="flex min-h-0 flex-1">
        {/* Chat Stream */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div
            ref={listRef}
            onScroll={onScroll}
            onClick={() => setReactFor(null)}
            className="chat-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-6"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center text-slate-500">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-slate-900 text-3xl shadow-inner">
                  💬
                </div>
                <div>
                  <p className="text-base font-bold text-slate-200">
                    Room /{room} is open &amp; live
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
                    Copy the invite link so teammates join from any phone or laptop · Type{" "}
                    <b className="font-mono text-amber-300">GAME</b> for a live round · Use{" "}
                    <b className="text-violet-300">🗳️ Poll</b> or{" "}
                    <b className="text-teal-300">🔎 Search</b> to decide plans together.
                  </p>
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const dayChanged = !prev || fmtDay(prev.ts) !== fmtDay(m.ts);
              const grouped =
                !dayChanged &&
                prev &&
                prev.kind === "chat" &&
                m.kind === "chat" &&
                prev.userId === m.userId &&
                m.ts - prev.ts < 120_000;

              return (
                <div
                  key={m.id}
                  id={"msg-" + m.id}
                  className={highlightedId === m.id ? "reply-flash" : ""}
                >
                  {dayChanged && (
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {fmtDay(m.ts)}
                      </span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                  )}
                  <MessageRow
                    m={m}
                    meName={me.name}
                    mine={m.userId === me.id}
                    grouped={Boolean(grouped)}
                    onDelete={() => deleteMsg(m)}
                    onReply={() => {
                      setEditingMsg(null);
                      setReplyingTo({
                        id: m.id,
                        userId: m.userId,
                        name: m.name,
                        preview:
                          m.text?.slice(0, 80) ||
                          (m.poll
                            ? `📊 ${m.poll.question}`
                            : m.card
                            ? `${m.card.icon} ${m.card.query}`
                            : m.attachment
                            ? `📎 ${m.attachment.name}`
                            : "Message"),
                      });
                      composerRef.current?.focus();
                    }}
                    onEdit={
                      m.userId === me.id && m.kind === "chat" && m.text
                        ? () => {
                            setReplyingTo(null);
                            setEditingMsg(m);
                            setInput(m.text || "");
                            composerRef.current?.focus();
                          }
                        : undefined
                    }
                    onJumpReply={(targetId) => jumpToMessage(targetId)}
                    onReact={(e) => react(m, e)}
                    onVotePoll={(optId, kind) =>
                      voteOnMessagePoll(m, optId, kind)
                    }
                    pickerOpen={reactFor === m.id}
                    togglePicker={() =>
                      setReactFor(reactFor === m.id ? null : m.id)
                    }
                  />
                </div>
              );
            })}

            {typingNames.length > 0 && (
              <div className="flex items-center gap-2 px-3 pt-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 border border-white/10">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="typing-dot h-1.5 w-1.5 rounded-full bg-teal-400"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
                <span>
                  <b className="text-slate-300">{typingNames.join(", ")}</b>{" "}
                  {typingNames.length === 1 ? "is" : "are"} typing…
                </span>
              </div>
            )}
          </div>

          {unread > 0 && (
            <button
              onClick={() => {
                sounds.playPop();
                listRef.current?.scrollTo({
                  top: listRef.current.scrollHeight,
                  behavior: "smooth",
                });
                setUnread(0);
              }}
              className="absolute bottom-32 left-1/2 z-30 -translate-x-1/2 rounded-full bg-violet-600 px-5 py-2 text-xs font-black shadow-2xl transition hover:bg-violet-500 active:scale-95"
            >
              ↓ {unread} new message{unread > 1 ? "s" : ""}
            </button>
          )}

          {/* Slash Commands Menu */}
          {slashMenu && (
            <div className="absolute bottom-24 left-4 z-40 w-80 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl sm:left-6">
              <p className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Quick Commands
              </p>
              <div className="max-h-60 space-y-0.5 overflow-y-auto">
                {filteredSlash.map((s, idx) => (
                  <button
                    key={s.cmd}
                    onClick={() => handleSlashSelect(s.cmd)}
                    className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition ${
                      idx === slashIdx
                        ? "bg-violet-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-lg">{s.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold">{s.label}</p>
                      <p className="truncate text-[10px] text-slate-400">
                        {s.desc}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] opacity-75">
                      {s.cmd}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Composer Bar */}
          <div className="border-t border-white/10 bg-slate-900/95 px-3 pb-3 pt-2.5 backdrop-blur-xl sm:px-6">
            {game ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 py-3 text-sm font-bold text-amber-300 shadow-inner">
                🔒 Main chat locked during live round: {GAME_META[game.id].emoji}{" "}
                {GAME_META[game.id].name}
              </div>
            ) : (
              <>
                {/* Reply / Edit Context Banner */}
                {(replyingTo || editingMsg) && (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-violet-500/30 bg-slate-950/90 px-3.5 py-2 text-xs">
                    <div className="min-w-0 border-l-2 border-violet-400 pl-2.5">
                      <p className="font-bold text-violet-300">
                        {editingMsg
                          ? "✏️ Editing your message"
                          : `↩ Replying to ${replyingTo?.name}`}
                      </p>
                      <p className="truncate text-slate-400">
                        {editingMsg ? editingMsg.text : replyingTo?.preview}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(null);
                        if (editingMsg) {
                          setEditingMsg(null);
                          setInput("");
                        }
                      }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="relative flex items-end gap-1">
                  {picker === "emoji" && (
                    <EmojiPicker
                      onPick={(e) => setInput((v) => v + e)}
                      onClose={() => setPicker(null)}
                    />
                  )}
                  {picker === "gif" && (
                    <GifPicker
                      onClose={() => setPicker(null)}
                      onPick={(urlOrId, label) => {
                        setPicker(null);
                        const finalUrl =
                          urlOrId.startsWith("data:") || urlOrId.startsWith("http")
                            ? urlOrId
                            : gifUrl(urlOrId);
                        sendAttachment({
                          type: "gif",
                          name: label,
                          url: finalUrl,
                          mime: finalUrl.startsWith("data:image/svg")
                            ? "image/svg+xml"
                            : "image/gif",
                        });
                      }}
                    />
                  )}
                  {picker === "sound" && (
                    <SoundboardPicker
                      onClose={() => setPicker(null)}
                      onTrigger={(soundId, label, shoutout) => {
                        setPicker(null);
                        triggerSoundDrop(soundId, label, shoutout);
                      }}
                    />
                  )}

                  <IconBtn
                    active={picker === "emoji"}
                    onClick={() =>
                      setPicker(picker === "emoji" ? null : "emoji")
                    }
                    title="Desi & All Emojis"
                  >
                    😀
                  </IconBtn>
                  <IconBtn
                    active={picker === "gif"}
                    onClick={() => setPicker(picker === "gif" ? null : "gif")}
                    title="देसी मीम स्टीकर & GIFs"
                  >
                    <span className="text-[10px] font-black text-amber-300">मीम</span>
                  </IconBtn>
                  <IconBtn
                    active={picker === "sound"}
                    onClick={() =>
                      setPicker(picker === "sound" ? null : "sound")
                    }
                    title="लाइव देसी साउंडबोर्ड (हॉर्न, ढोल, नागिन, IPL, चाय)"
                  >
                    📯
                  </IconBtn>
                  <IconBtn
                    onClick={() => fileRef.current?.click()}
                    title="Share Image or File"
                  >
                    📎
                  </IconBtn>
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    onChange={(e) => {
                      onFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <IconBtn
                    onClick={() => setPollModalOpen(true)}
                    title="Create Live Squad Poll"
                  >
                    🗳️
                  </IconBtn>
                  <IconBtn
                    active={dictating}
                    onClick={toggleDictation}
                    title="Voice Dictation"
                  >
                    {dictating ? "🔴" : "🗣️"}
                  </IconBtn>

                  {recording ? (
                    <div className="flex flex-1 items-center gap-3 rounded-2xl border border-rose-500/50 bg-rose-500/10 px-4 py-2.5">
                      <span className="h-3 w-3 animate-pulse rounded-full bg-rose-500" />
                      <span className="font-mono text-sm font-bold text-rose-300">
                        Voice Note · 0:{String(recSecs).padStart(2, "0")}
                      </span>
                      <button
                        onClick={toggleRecording}
                        className="ml-auto rounded-xl bg-rose-600 px-3.5 py-1 text-xs font-bold text-white hover:bg-rose-500"
                      >
                        ■ Send
                      </button>
                    </div>
                  ) : (
                    <textarea
                      ref={composerRef}
                      value={input}
                      onChange={(e) => onTyping(e.target.value)}
                      onKeyDown={(e) => {
                        if (slashMenu && filteredSlash.length > 0) {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setSlashIdx((i) => (i + 1) % filteredSlash.length);
                            return;
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setSlashIdx(
                              (i) =>
                                (i - 1 + filteredSlash.length) %
                                filteredSlash.length
                            );
                            return;
                          }
                          if (e.key === "Tab") {
                            e.preventDefault();
                            handleSlashSelect(filteredSlash[slashIdx].cmd);
                            return;
                          }
                        }
                        if (e.key === "Escape") {
                          setSlashMenu(false);
                          setReplyingTo(null);
                          setEditingMsg(null);
                          return;
                        }
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      rows={1}
                      placeholder={
                        dictating
                          ? "Listening… speak now 🎤"
                          : PLACEHOLDERS[phIdx]
                      }
                      className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-slate-800/90 px-4 py-2.5 text-[15px] placeholder-slate-500 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                    />
                  )}

                  <IconBtn
                    active={recording}
                    onClick={toggleRecording}
                    title="Record Voice Note"
                  >
                    🎤
                  </IconBtn>
                  <button
                    onClick={send}
                    disabled={!input.trim()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-teal-500 text-lg text-white shadow-lg shadow-violet-950 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
                  >
                    {editingMsg ? "✓" : "➤"}
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="hidden truncate text-[11px] text-slate-400 sm:block">
                    💡 <span className="font-mono font-bold text-amber-300">GAME</span> starts a round ·{" "}
                    <span className="font-mono font-bold text-violet-300">/poll</span> creates a live vote ·{" "}
                    <span className="font-mono font-bold text-teal-300">?</span> previews web answers
                  </p>
                  <button
                    onClick={() => {
                      sounds.playPop();
                      setSummary(summarize(messages));
                    }}
                    className="ml-auto shrink-0 rounded-xl border border-violet-500/35 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300 transition hover:bg-violet-500/20 active:scale-95"
                  >
                    ✨ Recap Chat
                  </button>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Right Sidebar: Share Link, Room Switcher, Roster & Bot Toggle */}
        <aside
          className={`${
            showSidebar
              ? "fixed inset-y-0 right-0 z-40 flex w-72 shadow-2xl"
              : "hidden"
          } flex-col border-l border-white/10 bg-slate-900/95 backdrop-blur-xl lg:static lg:flex lg:w-72`}
        >
          <div className="border-b border-white/10 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Live Invite Link
              </p>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-slate-400 hover:text-white lg:hidden"
              >
                ✕
              </button>
            </div>
            <button
              onClick={copyLink}
              className="w-full truncate rounded-2xl border border-teal-500/30 bg-slate-950/80 px-3 py-2 text-left font-mono text-xs font-semibold text-teal-300 transition hover:border-teal-400"
            >
              🔗 {displayHost()}/{room}
            </button>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
              Open this link on any phone or laptop — real players sync messages, polls &amp; games live.
            </p>

            {/* Quick Room Jump */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const target = normalizeRoomSlug(roomInput);
                if (target !== room) {
                  sounds.playPop();
                  onSwitchRoom(target);
                  setShowSidebar(false);
                }
              }}
              className="mt-3 flex gap-1.5"
            >
              <input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                maxLength={24}
                placeholder="Switch room…"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-violet-400"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-violet-300 hover:bg-slate-700"
              >
                Go
              </button>
            </form>
          </div>

          {/* Roster */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                In Room ({onlineCount}/20)
              </p>
              <button
                type="button"
                onClick={() =>
                  changeBotMode(botMode === "off" ? "auto" : "off")
                }
                className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700"
              >
                {botsActive ? "Hide Bots" : "+ Solo Bots"}
              </button>
            </div>

            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-slate-800/45 p-2"
                >
                  <div className="relative shrink-0">
                    <img
                      src={m.avatar}
                      alt={m.name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                        m.bot
                          ? "bg-violet-400"
                          : isOnline(m)
                          ? "bg-emerald-400"
                          : "bg-slate-600"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {m.name}
                      </p>
                      {m.id === me.id && (
                        <span className="text-[10px] font-bold text-teal-300">
                          you
                        </span>
                      )}
                      {m.admin && !m.bot && (
                        <span
                          className="ml-auto text-[10px]"
                          title="Room Host"
                        >
                          👑
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-slate-400">
                      {m.bot
                        ? `AI Squad · ${m.bio || "Ready"}`
                        : m.bio ||
                          (m.device === "mobile"
                            ? "📱 Mobile · Online"
                            : "💻 Desktop · Online")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 p-3.5 text-[11px] leading-relaxed text-slate-400">
            {syncStatus === "live"
              ? "🟢 Cloud synced via Supabase Realtime + Postgres RLS."
              : "⚪ Syncing locally across tabs · Cloud reconnects automatically."}
          </div>
        </aside>
      </div>

      {/* Live Squad Poll Builder Modal */}
      {pollModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={() => setPollModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">
                🗳️ लाइव ग्रुप पोल / मसाला बहस
              </h2>
              <button
                onClick={() => setPollModalOpen(false)}
                className="rounded-xl bg-slate-800 px-2.5 py-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* 1-Tap Desi Masala Poll Presets */}
            <div className="mb-3">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                🔥 1-टैप देसी मसाला सवाल (तुरंत भरें):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DESI_QUICK_POLLS.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      sounds.playPop();
                      setPollQuestion(preset.question);
                      setPollOptions(preset.options);
                    }}
                    className="rounded-xl border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-left text-[11px] font-bold text-amber-200 transition hover:border-amber-400 hover:bg-amber-500/25"
                  >
                    {preset.question.slice(0, 28)}…
                  </button>
                ))}
              </div>
            </div>

            <input
              autoFocus
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              maxLength={100}
              placeholder="ग्रुप से कुछ भी पूछो… (जैसे: आज चाय की पार्टी कौन दे रहा है?)"
              className="mb-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-violet-400"
            />
            <div className="space-y-2">
              {pollOptions.map((opt, idx) => (
                <input
                  key={idx}
                  value={opt}
                  onChange={(e) =>
                    setPollOptions((prev) =>
                      prev.map((x, i) => (i === idx ? e.target.value : x))
                    )
                  }
                  maxLength={60}
                  placeholder={`Option ${idx + 1}${idx >= 2 ? " (optional)" : ""}`}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white outline-none focus:border-teal-400"
                />
              ))}
            </div>
            {pollOptions.length < 5 && (
              <button
                type="button"
                onClick={() => setPollOptions((p) => [...p, ""])}
                className="mt-2 text-xs font-bold text-teal-300 hover:underline"
              >
                + Add another option
              </button>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPollModalOpen(false)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !pollQuestion.trim() ||
                  pollOptions.filter((o) => o.trim()).length < 2
                }
                onClick={() => {
                  createSquadPoll(pollQuestion, pollOptions);
                  setPollQuestion("");
                  setPollOptions(["", "", ""]);
                  setPollModalOpen(false);
                }}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-teal-500 px-5 py-2 text-xs font-black text-white disabled:opacity-40"
              >
                Launch Poll →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Arcade Library */}
      {arcadeOpen && !game && (
        <GameLibrary
          onClose={() => setArcadeOpen(false)}
          onPick={(id) => {
            setArcadeOpen(false);
            startGame(me.name, id || undefined);
          }}
        />
      )}

      {/* Active Multiplayer Game Overlay */}
      {game && (
        <GameOverlay
          g={game}
          me={me}
          isLeader={isLeader}
          canEndGame={Boolean(amHost)}
          mutate={mutate}
          finish={finishGame}
          onAbort={abortGame}
        />
      )}

      {/* Collaborative Search Console */}
      {searchOpen !== null && (
        <SearchConsole
          initialQuery={searchOpen}
          onClose={() => setSearchOpen(null)}
          onShare={shareCard}
        />
      )}

      {/* Session Recap Summary Modal */}
      {summary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={() => setSummary(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">
                  ✨ Room Recap
                </h2>
                <p className="text-xs text-slate-400">
                  /{room} · Last {retention} days
                </p>
              </div>
              <button
                onClick={() => setSummary(null)}
                className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm leading-relaxed text-violet-100">
              {summary.headline}
            </p>

            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
              {[
                ["💬", summary.stats.humans, "messages"],
                ["👥", summary.stats.participants.length, "speakers"],
                ["🎮", summary.stats.games, "missions"],
              ].map(([icon, num, label]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl bg-slate-800/70 p-3"
                >
                  <p className="text-lg">{icon}</p>
                  <p className="text-xl font-black text-white">{num}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {summary.topics.length > 0 && (
              <Section title="🏷 Key Topics">
                <div className="flex flex-wrap gap-1.5">
                  {summary.topics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-violet-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {summary.shared.length > 0 && (
              <Section title="🔎 Shared Cards">
                {summary.shared.map((s, i) => (
                  <li key={i}>
                    <b>{s.label}:</b> "{s.query}"
                    {s.note && (
                      <span className="font-medium text-violet-300">
                        {" "}
                        — {s.note}
                      </span>
                    )}
                  </li>
                ))}
              </Section>
            )}

            {summary.keyPoints.length > 0 && (
              <Section title="📌 Key Highlights">
                {summary.keyPoints.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </Section>
            )}

            {summary.decisions.length > 0 && (
              <Section title="🤝 Decisions & Plans">
                {summary.decisions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </Section>
            )}

            {summary.games.length > 0 && (
              <Section title="🎮 Mission Log">
                {summary.games.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </Section>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-800/95 px-5 py-2.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md">
          {toast}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sounds.playPop();
        onClick();
      }}
      title={title}
      className={`flex h-11 w-9 shrink-0 items-center justify-center rounded-2xl text-base transition active:scale-95 sm:w-10 ${
        active
          ? "bg-violet-600/40 text-white ring-1 ring-violet-400"
          : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <ul className="list-inside list-disc space-y-1.5 text-sm leading-relaxed text-slate-300">
        {children}
      </ul>
    </div>
  );
}

interface RowProps {
  m: Message;
  meName: string;
  mine: boolean;
  grouped: boolean;
  onDelete: () => void;
  onReply: () => void;
  onEdit?: () => void;
  onJumpReply: (id: string) => void;
  onReact: (e: string) => void;
  onVotePoll: (optionId: string, kind: "squad" | "card") => void;
  pickerOpen: boolean;
  togglePicker: () => void;
}

function Reactions({
  m,
  meName,
  onReact,
}: {
  m: Message;
  meName: string;
  onReact: (e: string) => void;
}) {
  if (!m.reactions || !Object.keys(m.reactions).length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {Object.entries(m.reactions).map(([e, names]) => {
        const active = names.includes(meName);
        return (
          <button
            key={e}
            onClick={(ev) => {
              ev.stopPropagation();
              onReact(e);
            }}
            title={names.join(", ")}
            className={`rounded-full border px-2 py-0.5 text-xs font-bold shadow transition active:scale-95 ${
              active
                ? "border-violet-400/70 bg-violet-500/25 text-white"
                : "border-white/10 bg-slate-800/90 text-slate-200 hover:border-violet-400/50"
            }`}
          >
            {e} {names.length}
          </button>
        );
      })}
    </div>
  );
}

function MessageRow({
  m,
  meName,
  mine,
  grouped,
  onDelete,
  onReply,
  onEdit,
  onJumpReply,
  onReact,
  onVotePoll,
  pickerOpen,
  togglePicker,
}: RowProps) {
  if (m.kind === "system") {
    return (
      <div className="my-2.5 flex justify-center">
        <span className="max-w-[92%] rounded-full border border-white/10 bg-slate-900/80 px-4 py-1 text-center text-xs font-medium text-slate-400">
          {m.text}
        </span>
      </div>
    );
  }

  if (m.kind === "ai" && m.card) {
    return (
      <div
        className={`msg-arrive group my-2.5 flex ${
          mine ? "justify-end" : "justify-start"
        }`}
      >
        <div className="relative w-full max-w-[94%] sm:max-w-[82%]">
          <p
            className={`mb-1 text-[11px] font-bold ${
              mine ? "text-right text-slate-400" : "text-violet-300"
            }`}
          >
            {mine ? "You shared a live plan card" : `${m.name} shared a plan card`} ·{" "}
            {fmtTime(m.ts)}
          </p>
          <SearchCardView
            card={m.card}
            meName={meName}
            onVotePoll={(optId) => onVotePoll(optId, "card")}
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {REACTIONS.slice(0, 5).map((e) => (
              <button
                key={e}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onReact(e);
                }}
                className="rounded-xl border border-white/5 bg-slate-800/80 px-2 py-0.5 text-sm shadow transition hover:scale-110 hover:bg-slate-700"
              >
                {e}
              </button>
            ))}
            <button
              onClick={onReply}
              className="rounded-xl border border-white/5 bg-slate-800/80 px-2.5 py-0.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
            >
              ↩ Reply
            </button>
            <Reactions m={m} meName={meName} onReact={onReact} />
          </div>
        </div>
      </div>
    );
  }

  const att = m.attachment;
  const otherReaders = (m.seenBy || []).filter((n) => n !== m.name);
  const pollTotalVotes =
    m.poll?.options.reduce((s, o) => s + o.votes.length, 0) || 0;

  return (
    <div
      className={`msg-arrive group flex items-end gap-2 ${
        grouped ? "pt-0.5" : "pt-2.5"
      } ${mine ? "flex-row-reverse" : ""}`}
    >
      {!mine && (
        <div className="w-8 shrink-0">
          {!grouped && (
            <img
              src={m.avatar}
              alt={m.name}
              className="h-8 w-8 rounded-full border border-white/10 object-cover"
            />
          )}
        </div>
      )}

      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {!mine && !grouped && (
          <p className="mb-0.5 ml-1 text-[11px] font-bold text-violet-300">
            {m.name}
          </p>
        )}

        <div
          className={`rounded-3xl px-4 py-2.5 shadow-md ${
            mine
              ? "rounded-br-md bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
              : "rounded-bl-md border border-white/5 bg-slate-800/95 text-slate-100"
          } ${m.text === "GAME" ? "ring-2 ring-amber-400/80" : ""}`}
        >
          {/* Quoted Reply Header */}
          {m.replyTo && (
            <button
              type="button"
              onClick={() => onJumpReply(m.replyTo!.id)}
              className={`mb-2 block w-full rounded-xl border-l-2 px-2.5 py-1.5 text-left text-xs transition hover:brightness-110 ${
                mine
                  ? "border-teal-300 bg-black/25 text-white/90"
                  : "border-violet-400 bg-slate-950/60 text-slate-300"
              }`}
            >
              <span className="block font-bold text-teal-300">
                {m.replyTo.name}
              </span>
              <span className="block truncate opacity-85">
                {m.replyTo.preview}
              </span>
            </button>
          )}

          {/* Standalone Live Poll */}
          {m.poll ? (
            <div className="min-w-[230px] sm:min-w-[290px]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-200">
                  🗳️ Live Room Poll
                </span>
                <span className="text-[10px] opacity-80">
                  {pollTotalVotes} {pollTotalVotes === 1 ? "vote" : "votes"}
                </span>
              </div>
              <p className="mb-2.5 text-sm font-black leading-snug">
                {m.poll.question}
              </p>
              <div className="space-y-1.5">
                {m.poll.options.map((opt) => {
                  const pct = pollTotalVotes
                    ? Math.round((opt.votes.length / pollTotalVotes) * 100)
                    : 0;
                  const voted = opt.votes.includes(meName);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onVotePoll(opt.id, "squad")}
                      title={
                        opt.votes.length
                          ? `Voted: ${opt.votes.join(", ")}`
                          : "Tap to vote"
                      }
                      className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-xs transition active:scale-[0.99] ${
                        voted
                          ? "border-teal-300 bg-black/35 font-bold"
                          : "border-white/15 bg-black/20 hover:bg-black/30"
                      }`}
                    >
                      <div
                        className="pointer-events-none absolute inset-y-0 left-0 bg-teal-400/30 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative flex items-center justify-between gap-2">
                        <span>
                          {voted ? "✓ " : ""}
                          {opt.label}
                        </span>
                        <span className="font-mono text-[11px] font-bold">
                          {opt.votes.length} ({pct}%)
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : m.text === "GAME" ? (
            <p className="text-center font-mono text-xl font-black tracking-widest text-amber-300">
              🎮 GAME
            </p>
          ) : (
            m.text && (
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                {m.text}
              </p>
            )
          )}

          {/* Attachments */}
          {att && (
            <div className={m.text ? "mt-2.5" : ""}>
              {att.type === "image" &&
                (att.url ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="max-h-64 rounded-2xl shadow"
                  />
                ) : (
                  <Expired label="Image" />
                ))}
              {att.type === "gif" && (
                <img
                  src={att.url}
                  alt={att.name}
                  className="max-h-56 rounded-2xl shadow"
                />
              )}
              {att.type === "audio" &&
                (att.url ? (
                  <div className="flex flex-col gap-1">
                    <audio
                      controls
                      src={att.url}
                      className="h-10 w-60 max-w-full"
                    />
                    {att.duration && (
                      <span className="text-[10px] opacity-75">
                        🎤 Voice note · {att.duration}s
                      </span>
                    )}
                  </div>
                ) : (
                  <Expired label="Voice note" />
                ))}
              {att.type === "file" &&
                (att.url ? (
                  <a
                    href={att.url}
                    download={att.name}
                    className="flex items-center gap-2.5 rounded-2xl bg-black/30 px-3.5 py-3 hover:bg-black/45"
                  >
                    <span className="text-2xl">
                      {att.mime.includes("pdf") ? "📕" : "📄"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {att.name}
                      </span>
                      <span className="text-[10px] opacity-75">
                        {att.size ? (att.size / 1024).toFixed(0) + " KB · " : ""}
                        tap to download
                      </span>
                    </span>
                  </a>
                ) : (
                  <Expired label={att.name} />
                ))}
            </div>
          )}

          {/* Timestamp + Edited Tag + Realistic Read Receipts */}
          <div
            className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
              mine ? "text-white/75" : "text-slate-400"
            }`}
          >
            {m.editedAt && <span className="italic opacity-80">edited</span>}
            <span>{fmtTime(m.ts)}</span>
            {mine && (
              <span
                title={
                  otherReaders.length
                    ? `Seen by ${otherReaders.join(", ")}`
                    : m.delivery === "cloud"
                    ? "Delivered to cloud room"
                    : "Sent"
                }
                className={`font-bold tracking-tighter ${
                  otherReaders.length > 0
                    ? "text-teal-300"
                    : "text-white/75"
                }`}
              >
                {otherReaders.length > 0 || m.delivery === "cloud" ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>

        <Reactions m={m} meName={meName} onReact={onReact} />

        {/* Message Hover Action Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute -top-3 ${
            mine ? "left-0" : "right-0"
          } z-20 hidden items-center gap-0.5 rounded-full border border-white/10 bg-slate-900/95 px-1.5 py-0.5 shadow-xl group-hover:flex`}
        >
          <button
            onClick={togglePicker}
            title="React"
            className="rounded-full p-1 text-[11px] hover:bg-slate-800"
          >
            😊
          </button>
          <button
            onClick={onReply}
            title="Reply"
            className="rounded-full p-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            ↩
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              title="Edit message"
              className="rounded-full p-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              ✏️
            </button>
          )}
          <button
            onClick={onDelete}
            title={mine ? "Delete" : "Report"}
            className="rounded-full p-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-rose-300"
          >
            {mine ? "🗑" : "🚩"}
          </button>
        </div>

        {pickerOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute -top-12 z-30 flex gap-1 rounded-2xl border border-white/10 bg-slate-800 p-1.5 shadow-2xl ${
              mine ? "right-0" : "left-0"
            }`}
          >
            {REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => onReact(e)}
                className="rounded-lg px-2 py-0.5 text-lg transition hover:scale-125 hover:bg-slate-700"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Expired({ label }: { label: string }) {
  return (
    <p className="rounded-xl bg-black/30 px-3 py-2 text-xs italic opacity-70">
      📦 {label} — shared during live room session
    </p>
  );
}
