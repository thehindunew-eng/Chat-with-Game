import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Attachment,
  BotMode,
  BusEvent,
  GameId,
  LiveGame,
  MatchResultCard,
  Member,
  Message,
  SearchCard,
  SquadPoll,
  SyncStatus,
  User,
} from "../lib/types";
import { GAME_META, uid } from "../lib/types";
import { BOTS, BOT_IDLE } from "../lib/data";
import { DESI_QUICK_POLLS } from "../lib/desiStickers";
import { generateContextualBotReply } from "../lib/botBrain";
import { RoomSyncClient } from "../lib/realtime";
import { createGame, joinGame, readGame, writeGame } from "../lib/gameSync";
import {
  claimLeadership,
  cleanText,
  getBotMode,
  getRetentionDays,
  loadMessages,
  roomLink,
  saveMessages,
  setBotMode,
} from "../lib/store";
import {
  getRankTier,
  loadPlayerStats,
  recordMatchResult,
  type PlayerStats,
} from "../lib/ranks";
import { sounds } from "../lib/audio";
import GameLibrary from "./GameLibrary";
import GameOverlay from "./GameOverlay";
import SearchConsole from "./SearchConsole";
import SearchCardView from "./SearchCardView";
import { EmojiPicker, GifPicker, SoundboardPicker } from "./Pickers";

interface Props {
  me: User;
  room: string;
  onUserUpdate?: (patch: Partial<User>) => void;
  onLeave: () => void;
}

const SLASH_COMMANDS: {
  cmd: string;
  desc: string;
  game?: GameId;
  callout?: string;
}[] = [
  { cmd: "/aim", desc: "Start Flick Aim Lab (ms precision)", game: "aimlab" },
  { cmd: "/recall", desc: "Start Sector Recall (4-wave radar)", game: "sector" },
  { cmd: "/duel", desc: "Start Strike · Guard · Feint duel", game: "duel" },
  { cmd: "/connect4", desc: "Start Four-in-a-Row match", game: "connect4" },
  { cmd: "/tictactoe", desc: "Start Tic-Tac-Toe Pro match", game: "tictactoe" },
  { cmd: "/slide", desc: "Start 15-Slide Sprint", game: "slide" },
  { cmd: "/wikirace", desc: "Start Wikipedia Speedrun", game: "wikirace" },
  { cmd: "/bomb", desc: "Start Defuse Protocol co-op", game: "bomb" },
  { cmd: "/blitz", desc: "Start Target Blitz reflex co-op", game: "blitz" },
  { cmd: "/search", desc: "Open web / wiki / dictionary intel" },
  { cmd: "/gg", desc: "Post quick GG WP callout", callout: "GG WP — clean match 🏆" },
];

const CALLOUT_CHIPS = [
  { label: "GG", text: "GG 🤝" },
  { label: "WP", text: "Well played 🔥" },
  { label: "GLHF", text: "GLHF — locked in 🎯" },
  { label: "1v1?", text: "Anyone up for a quick 1v1? ⚔️" },
  { label: "NICE SHOT", text: "Clean shot ⚡" },
  { label: "REMATCH", text: "Run it back! ↻" },
];

const QUICK_REACTIONS = ["🔥", "🎯", "🏆", "⚡", "🤝"];

const NEXT_THRESHOLDS = [950, 1075, 1200, 1350, 1500];

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resizeUploadImage(file: File, max = 760): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ChatRoom({ me, room, onUserUpdate, onLeave }: Props) {
  const [stats, setStats] = useState<PlayerStats>(() => loadPlayerStats());
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = loadMessages(room);
    if (saved.length > 0) return saved;
    return [
      {
        id: uid(),
        kind: "system",
        userId: "system",
        name: "System",
        avatar: "",
        ts: Date.now(),
        text: `#${room} ready · Invite teammates with INVITE or launch a match via READY CHECK or PLAY.`,
      },
    ];
  });

  const [cloudMembers, setCloudMembers] = useState<Member[]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, string>>({});
  const [botMode, setBotModeState] = useState<BotMode>(() => getBotMode());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(
    null
  );

  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showSfx, setShowSfx] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOpts, setPollOpts] = useState<string[]>([
    "Flick Aim Lab",
    "Strike · Guard · Feint",
    "Four-in-a-Row",
  ]);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [libraryMode, setLibraryMode] = useState<"instant" | "lobby" | null>(
    null
  );
  const [sidebarTab, setSidebarTab] = useState<"standings" | "roster">(
    "standings"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);
  const [copied, setCopied] = useState(false);

  const [game, setGame] = useState<LiveGame | null>(() => readGame(room));
  const [gameHidden, setGameHidden] = useState(false);

  const syncRef = useRef<RoomSyncClient | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastTypingSent = useRef(0);
  const gameRef = useRef<LiveGame | null>(game);
  gameRef.current = game;
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;
  const finishHandledSeed = useRef<number | null>(null);

  const meMember = useMemo<Member>(
    () => ({
      ...me,
      elo: stats.elo,
      wins: stats.wins,
      streak: stats.streak,
      lastSeen: Date.now(),
      bot: false,
    }),
    [me, stats]
  );

  const otherHumans = useMemo(
    () => cloudMembers.filter((m) => !m.bot && m.id !== me.id),
    [cloudMembers, me.id]
  );

  const activeBots = useMemo<Member[]>(() => {
    if (botMode === "off") return [];
    if (botMode === "auto" && otherHumans.length > 0) return [];
    return BOTS;
  }, [botMode, otherHumans.length]);

  const everyone = useMemo<Member[]>(
    () => [meMember, ...otherHumans, ...activeBots],
    [meMember, otherHumans, activeBots]
  );

  const leaderboard = useMemo(
    () =>
      [...everyone].sort(
        (a, b) =>
          (b.elo ?? 1000) - (a.elo ?? 1000) ||
          (b.wins ?? 0) - (a.wins ?? 0)
      ),
    [everyone]
  );

  const isLeader = useMemo(() => {
    const humanIds = [me.id, ...otherHumans.map((h) => h.id)].sort();
    return humanIds[0] === me.id && claimLeadership(room);
  }, [me.id, otherHumans, room]);

  const myTier = useMemo(() => getRankTier(stats.elo), [stats.elo]);
  const nextThreshold = useMemo(
    () => NEXT_THRESHOLDS.find((n) => n > stats.elo) ?? null,
    [stats.elo]
  );
  const tierProgress = useMemo(() => {
    if (!nextThreshold) return 100;
    const prevIdx = NEXT_THRESHOLDS.indexOf(nextThreshold) - 1;
    const floor = prevIdx >= 0 ? NEXT_THRESHOLDS[prevIdx] : 800;
    return Math.min(
      100,
      Math.max(6, ((stats.elo - floor) / Math.max(1, nextThreshold - floor)) * 100)
    );
  }, [stats.elo, nextThreshold]);

  useEffect(() => {
    saveMessages(room, messages);
  }, [room, messages]);

  /* ---------- Incoming Realtime Bus Events ---------- */
  const handleBusEvent = useCallback(
    (ev: BusEvent) => {
      if (ev.t === "msg") {
        setMessages((cur) => {
          if (cur.some((x) => x.id === ev.m.id)) return cur;
          return [...cur, ev.m];
        });
        if (ev.m.userId !== me.id && ev.m.kind !== "system") {
          sounds.playPop();
        }
      } else if (ev.t === "update") {
        setMessages((cur) =>
          cur.map((x) => (x.id === ev.m.id ? ev.m : x))
        );
      } else if (ev.t === "del") {
        setMessages((cur) => cur.filter((x) => x.id !== ev.id));
      } else if (ev.t === "seen") {
        setMessages((cur) =>
          cur.map((m) =>
            ev.ids.includes(m.id) && !(m.seenBy || []).includes(ev.reader)
              ? { ...m, seenBy: [...(m.seenBy || []), ev.reader] }
              : m
          )
        );
      } else if (ev.t === "typing") {
        if (ev.uid === me.id) return;
        setTypingMap((cur) => ({ ...cur, [ev.uid]: ev.name }));
        window.setTimeout(() => {
          setTypingMap((cur) => {
            const copy = { ...cur };
            delete copy[ev.uid];
            return copy;
          });
        }, 2600);
      } else if (ev.t === "sound") {
        if (ev.by !== me.id) sounds.playSoundDrop(ev.soundId);
      } else if (ev.t === "game") {
        setGame((cur) => {
          if (ev.g === null) {
            writeGame(room, null);
            return null;
          }
          if (cur && ev.g.seed === cur.seed && ev.g.v < cur.v) return cur;
          let incoming = ev.g;
          if (
            incoming.phase === "play" &&
            !incoming.players.some((p) => p.uid === me.id)
          ) {
            incoming = {
              ...incoming,
              players: [
                ...incoming.players,
                { uid: me.id, name: me.name, avatar: me.avatar, score: 0 },
              ],
            };
          }
          if (!cur || cur.seed !== incoming.seed) setGameHidden(false);
          writeGame(room, incoming);
          return incoming;
        });
      }
    },
    [me.avatar, me.id, me.name, room]
  );

  /* ---------- Connect Live Supabase + BroadcastChannel ---------- */
  useEffect(() => {
    const client = new RoomSyncClient(room, meMember, {
      onStatus: setSyncStatus,
      onHydrateMessages: (cloudMsgs) => {
        if (!cloudMsgs.length) return;
        setMessages((cur) => {
          const map = new Map<string, Message>();
          for (const m of cur) {
            if (m.userId !== "system") map.set(m.id, m);
          }
          for (const m of cloudMsgs) map.set(m.id, m);
          const merged = [...map.values()].sort((a, b) => a.ts - b.ts);
          return merged.length ? merged : cur;
        });
      },
      onEvent: handleBusEvent,
      onCloudMembers: setCloudMembers,
    });
    syncRef.current = client;
    const cutoff = Date.now() - getRetentionDays() * 86400000;
    void client.connect(cutoff);

    return () => {
      client.disconnect();
      syncRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, me.id, handleBusEvent]);

  // Mark incoming messages seen
  useEffect(() => {
    const unseen = messages
      .filter(
        (m) =>
          m.userId !== me.id &&
          m.kind !== "system" &&
          !(m.seenBy || []).includes(me.id)
      )
      .map((m) => m.id);
    if (unseen.length > 0) {
      syncRef.current?.emit({ t: "seen", reader: me.id, ids: unseen });
    }
  }, [messages, me.id]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, Object.keys(typingMap).length]);

  /* ---------- Publish & Update Message Helpers ---------- */
  const publishMessage = useCallback(
    (partial: Partial<Message>, author?: Member): Message => {
      const sender = author ?? meMember;
      const msg: Message = {
        id: uid(),
        kind: "chat",
        userId: sender.id,
        name: sender.name,
        avatar: sender.avatar,
        ts: Date.now(),
        senderElo: sender.elo ?? 1000,
        reactions: {},
        seenBy: [sender.id],
        delivery: "sent",
        ...partial,
      };
      setMessages((cur) => [...cur, msg]);
      syncRef.current?.emit({ t: "msg", m: msg });
      void syncRef.current?.persistMessage(msg).then((ok) => {
        if (ok) {
          setMessages((cur) =>
            cur.map((x) => (x.id === msg.id ? { ...x, delivery: "cloud" } : x))
          );
        }
      });
      return msg;
    },
    [meMember]
  );

  const commitMessageUpdate = useCallback((updated: Message) => {
    setMessages((cur) => cur.map((m) => (m.id === updated.id ? updated : m)));
    syncRef.current?.emit({ t: "update", m: updated });
    void syncRef.current?.persistMessage(updated);
  }, []);

  // Clean welcome callout when entering solo
  useEffect(() => {
    if (!activeBots.length) return;
    const key = `arena_pro_welcome_${room}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const t = window.setTimeout(() => {
      const bot = activeBots[0];
      if (!bot) return;
      publishMessage(
        {
          text: `Welcome to #${room}, ${me.name}. Queue a match with READY CHECK or hit PLAY for instant start 🎯`,
        },
        bot
      );
    }, 850);
    return () => clearTimeout(t);
  }, [activeBots, me.name, publishMessage, room]);

  // Occasional solo sparring chatter when lobby is idle
  useEffect(() => {
    if (!isLeader || !activeBots.length) return;
    const iv = window.setInterval(() => {
      if (gameRef.current) return;
      const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
      setTypingMap((cur) => ({ ...cur, [bot.id]: bot.name }));
      window.setTimeout(() => {
        setTypingMap((cur) => {
          const next = { ...cur };
          delete next[bot.id];
          return next;
        });
        if (!gameRef.current) {
          publishMessage(
            {
              text: BOT_IDLE[Math.floor(Math.random() * BOT_IDLE.length)],
            },
            bot
          );
        }
      }, 950);
    }, 55000);
    return () => clearInterval(iv);
  }, [activeBots, isLeader, publishMessage]);

  /* ---------- Multiplayer Game Lifecycle ---------- */
  const launchGame = useCallback(
    (id: GameId | null) => {
      if (!id) return;
      finishHandledSeed.current = null;
      const players = everyone.map((u) => ({
        uid: u.id,
        name: u.name,
        avatar: u.avatar,
        score: 0,
        bot: u.bot,
      }));
      const g = createGame(id, Math.floor(Math.random() * 1e9), me.id, players);
      setGame(g);
      setGameHidden(false);
      setLibraryMode(null);
      writeGame(room, g);
      syncRef.current?.emit({ t: "game", g });
      void syncRef.current?.persistGame(g);
      sounds.playGameTrigger();
      publishMessage({
        kind: "system",
        text: `${GAME_META[id].emoji} ${me.name} started ${GAME_META[id].name}`,
      });
    },
    [everyone, me.id, me.name, publishMessage, room]
  );

  // Auto-join active game if another player started one
  useEffect(() => {
    if (game && game.phase === "play" && !game.players.some((p) => p.uid === me.id)) {
      const joined = joinGame(room, {
        uid: me.id,
        name: me.name,
        avatar: me.avatar,
        score: 0,
      });
      if (joined) {
        setGame(joined);
        syncRef.current?.emit({ t: "game", g: joined });
        void syncRef.current?.persistGame(joined);
      }
    }
  }, [game, me.avatar, me.id, me.name, room]);

  const postReadyCheck = useCallback(
    (gameId: GameId) => {
      setLibraryMode(null);
      sounds.playClack();
      const created = publishMessage({
        text: "",
        lobby: {
          gameId,
          hostName: me.name,
          readyNames: [me.name],
          launched: false,
        },
      });
      // Solo AI sparring partners ready up automatically
      if (activeBots.length > 0) {
        activeBots.slice(0, 2).forEach((b, idx) => {
          window.setTimeout(() => {
            const current = messagesRef.current.find((m) => m.id === created.id);
            if (!current?.lobby || current.lobby.launched) return;
            if (current.lobby.readyNames.includes(b.name)) return;
            const updated: Message = {
              ...current,
              lobby: {
                ...current.lobby,
                readyNames: [...current.lobby.readyNames, b.name],
              },
            };
            commitMessageUpdate(updated);
            sounds.playTick();
          }, 900 + idx * 800);
        });
      }
    },
    [activeBots, commitMessageUpdate, me.name, publishMessage]
  );

  const toggleLobbyReady = (m: Message) => {
    if (!m.lobby || m.lobby.launched) return;
    sounds.playClack();
    const has = m.lobby.readyNames.includes(me.name);
    const readyNames = has
      ? m.lobby.readyNames.filter((n) => n !== me.name)
      : [...m.lobby.readyNames, me.name];
    commitMessageUpdate({
      ...m,
      lobby: { ...m.lobby, readyNames },
    });
  };

  const launchFromLobby = (m: Message) => {
    if (!m.lobby) return;
    commitMessageUpdate({
      ...m,
      lobby: { ...m.lobby, launched: true },
    });
    launchGame(m.lobby.gameId);
  };

  const handleMutateGame = useCallback(
    (fn: (cur: LiveGame) => LiveGame | null) => {
      setGame((cur) => {
        if (!cur) return null;
        const next = fn(cur);
        if (!next) return cur;
        const stamped: LiveGame = { ...next, v: cur.v + 1 };
        writeGame(room, stamped);
        syncRef.current?.emit({ t: "game", g: stamped });
        void syncRef.current?.persistGame(stamped);
        return stamped;
      });
    },
    [room]
  );

  const handleFinishGame = useCallback(
    (result: string, bonus?: string) => {
      setGame((cur) => {
        if (!cur || cur.phase === "done") return cur;
        if (finishHandledSeed.current === cur.seed) return cur;
        finishHandledSeed.current = cur.seed;

        const done: LiveGame = {
          ...cur,
          phase: "done",
          result,
          bonus,
          v: cur.v + 1,
        };
        writeGame(room, done);
        syncRef.current?.emit({ t: "game", g: done });
        void syncRef.current?.persistGame(done);

        const standings = [...done.players]
          .sort((a, b) => b.score - a.score)
          .map((p) => ({ name: p.name, score: p.score }));
        const topScore = standings[0]?.score ?? 0;
        const myScore =
          done.players.find((p) => p.uid === me.id)?.score ?? 0;
        const won =
          (myScore >= topScore && topScore > 0) ||
          result.toLowerCase().includes(me.name.toLowerCase()) ||
          result.toLowerCase().includes("cleared") ||
          result.toLowerCase().includes("defused");
        const bestMs =
          typeof done.data?.bestMs === "number" ? done.data.bestMs : undefined;

        const { next, delta } = recordMatchResult(won, bestMs);
        setStats(next);
        const updatedMe: User = {
          ...me,
          elo: next.elo,
          wins: next.wins,
          streak: next.streak,
        };
        onUserUpdate?.({
          elo: next.elo,
          wins: next.wins,
          streak: next.streak,
        });
        syncRef.current?.updateMyPresence(updatedMe);

        const card: MatchResultCard = {
          gameId: cur.id,
          summary: result,
          mvp: standings[0]?.name || me.name,
          eloDelta: delta,
          standings: standings.slice(0, 4),
        };
        publishMessage({
          text: "",
          matchResult: card,
        });
        return done;
      });
    },
    [me, onUserUpdate, publishMessage, room]
  );

  const abortGame = useCallback(() => {
    setGame(null);
    writeGame(room, null);
    syncRef.current?.emit({ t: "game", g: null });
    void syncRef.current?.persistGame(null);
  }, [room]);

  const triggerSmartBotReply = useCallback(
    (sentText: string) => {
      if (!activeBots.length) return;
      const plan = generateContextualBotReply(
        me.name,
        sentText,
        messagesRef.current
      );
      if (!plan) return;

      window.setTimeout(() => {
        setTypingMap((cur) => ({ ...cur, [plan.bot.id]: plan.bot.name }));
        window.setTimeout(() => {
          setTypingMap((cur) => {
            const copy = { ...cur };
            delete copy[plan.bot.id];
            return copy;
          });
          publishMessage(
            {
              text: plan.reply,
              attachment: plan.stickerUrl
                ? {
                    type: "gif",
                    name: plan.stickerName || "Callout",
                    url: plan.stickerUrl,
                    mime: "image/svg+xml",
                  }
                : undefined,
            },
            plan.bot
          );
        }, plan.typingMs);
      }, plan.readDelayMs);
    },
    [activeBots.length, me.name, publishMessage]
  );

  const handleSend = () => {
    const trimmed = cleanText(text.trim());
    if (!trimmed && !pendingAttachment) return;
    sounds.playSend();

    if (editingId) {
      const target = messages.find((m) => m.id === editingId);
      if (target) {
        commitMessageUpdate({
          ...target,
          text: trimmed,
          editedAt: Date.now(),
        });
      }
      setEditingId(null);
      setText("");
      return;
    }

    // Slash commands
    if (trimmed.startsWith("/") && !pendingAttachment) {
      const [rawCmd, ...rest] = trimmed.split(" ");
      const arg = rest.join(" ").trim();
      const cmd = rawCmd.toLowerCase();

      const matchedCmd = SLASH_COMMANDS.find((c) => c.cmd === cmd);
      if (matchedCmd?.game) {
        setText("");
        launchGame(matchedCmd.game);
        return;
      }
      if (matchedCmd?.callout) {
        publishMessage({ text: matchedCmd.callout });
        setText("");
        return;
      }
      const directGame = cmd.slice(1) as GameId;
      if (GAME_META[directGame]) {
        setText("");
        launchGame(directGame);
        return;
      }
      if (cmd === "/search") {
        setText("");
        setSearchQuery(arg);
        return;
      }
      if (cmd === "/shrug") {
        publishMessage({ text: `${arg} ¯\\_(ツ)_/¯`.trim() });
        setText("");
        return;
      }
    }

    publishMessage({
      text: trimmed,
      attachment: pendingAttachment || undefined,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            userId: replyTo.userId,
            name: replyTo.name,
            preview:
              replyTo.text ||
              replyTo.attachment?.name ||
              "Shared card",
          }
        : undefined,
    });
    setText("");
    setPendingAttachment(null);
    setReplyTo(null);
    triggerSmartBotReply(trimmed);
  };

  const toggleReaction = (m: Message, emoji: string) => {
    sounds.playPop();
    const map = { ...(m.reactions || {}) };
    const list = map[emoji] || [];
    const next = list.includes(me.id)
      ? list.filter((x) => x !== me.id)
      : [...list, me.id];
    if (next.length) map[emoji] = next;
    else delete map[emoji];
    commitMessageUpdate({ ...m, reactions: map });
  };

  const votePoll = (m: Message, optionId: string) => {
    if (!m.poll) return;
    sounds.playPop();
    const poll: SquadPoll = {
      ...m.poll,
      options: m.poll.options.map((o) => ({
        ...o,
        votes:
          o.id === optionId
            ? o.votes.includes(me.id)
              ? o.votes
              : [...o.votes, me.id]
            : o.votes.filter((v) => v !== me.id),
      })),
    };
    commitMessageUpdate({ ...m, poll });
  };

  const createSquadPoll = () => {
    const q = pollQuestion.trim();
    const cleanOpts = pollOpts.map((o) => o.trim()).filter(Boolean);
    if (!q || cleanOpts.length < 2) return;
    const poll: SquadPoll = {
      question: q,
      createdBy: me.name,
      options: cleanOpts.map((label) => ({ id: uid(), label, votes: [] })),
    };
    const created = publishMessage({ text: "", poll });
    setShowPollModal(false);
    setPollQuestion("");

    activeBots.forEach((b, i) => {
      window.setTimeout(() => {
        const cur = messagesRef.current.find((x) => x.id === created.id);
        if (!cur?.poll) return;
        const pick =
          cur.poll.options[Math.floor(Math.random() * cur.poll.options.length)];
        commitMessageUpdate({
          ...cur,
          poll: {
            ...cur.poll,
            options: cur.poll.options.map((o) =>
              o.id === pick.id && !o.votes.includes(b.id)
                ? { ...o, votes: [...o.votes, b.id] }
                : o
            ),
          },
        });
      }, 900 + i * 700);
    });
  };

  const removeMessage = (id: string) => {
    setMessages((cur) => cur.filter((m) => m.id !== id));
    syncRef.current?.emit({ t: "del", id });
    void syncRef.current?.deleteMessage(id);
  };

  const copyInviteLink = () => {
    navigator.clipboard?.writeText(roomLink(room));
    sounds.playClack();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const cycleBotMode = () => {
    const next: BotMode =
      botMode === "auto" ? "off" : botMode === "off" ? "on" : "auto";
    setBotMode(next);
    setBotModeState(next);
    sounds.playClack();
  };

  const slashSuggestions =
    text.startsWith("/") && !text.includes(" ")
      ? SLASH_COMMANDS.filter((s) => s.cmd.startsWith(text.toLowerCase()))
      : [];

  const typingNames = Object.values(typingMap);
  const canEndActiveGame = Boolean(
    game && (game.startedBy === me.id || isLeader)
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f7f5ee] text-[#111111]">
      {/* Clean White/Cream + #111111 Top Command Header */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-[#111111] bg-[#f3f0e6] px-3 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#111111] bg-[#ffe500] text-lg shadow-[2px_2px_0px_#111111]">
            🎮
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate font-mono text-sm font-black sm:text-base">
              #{room}
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-md border-[1.5px] border-[#111111] px-2 py-0.5 font-mono text-[10px] font-black uppercase ${
                syncStatus === "live"
                  ? "bg-[#bbf7d0]"
                  : syncStatus === "connecting"
                  ? "bg-[#fef9c3]"
                  : "bg-white"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
              {syncStatus === "live"
                ? "LIVE SYNC"
                : syncStatus === "connecting"
                ? "CONNECTING"
                : "LOCAL"}
            </span>
            <span className="hidden rounded-md border-[1.5px] border-[#111111] bg-white px-2 py-0.5 font-mono text-[10px] font-black sm:inline-block">
              {everyone.length} ONLINE
            </span>
          </div>
        </div>

        {/* Clean Pro Action Triggers */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={copyInviteLink}
            title="Copy invite URL"
            className="pro-btn hidden rounded-xl px-3 py-1.5 font-mono text-xs font-black uppercase md:inline-flex"
          >
            {copied ? "✓ COPIED" : "🔗 INVITE"}
          </button>

          <button
            type="button"
            onClick={() => setLibraryMode("lobby")}
            className="pro-btn rounded-xl px-2.5 py-1.5 font-mono text-xs font-black uppercase sm:px-3"
          >
            ⚔️ <span className="hidden sm:inline">READY CHECK</span>
          </button>

          <button
            type="button"
            onClick={() => setLibraryMode("instant")}
            className="pro-btn-accent rounded-xl px-3 py-1.5 font-mono text-xs font-black uppercase"
          >
            ▶ PLAY
          </button>

          <button
            type="button"
            onClick={() =>
              setSearchQuery((cur) => (cur === null ? "" : null))
            }
            title="Open Intel Search"
            className={`pro-btn rounded-xl px-2.5 py-1.5 font-mono text-xs font-black uppercase ${
              searchQuery !== null ? "bg-[#bae6fd]" : ""
            }`}
          >
            🔎 <span className="hidden lg:inline">INTEL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.enabled = !sounds.enabled;
              setSoundEnabled(sounds.enabled);
            }}
            title={soundEnabled ? "Mute SFX" : "Unmute SFX"}
            className="pro-btn rounded-xl px-2.5 py-1.5 text-xs font-black"
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="pro-btn rounded-xl px-2.5 py-1.5 text-xs font-black lg:hidden"
          >
            🏆
          </button>

          <button
            type="button"
            onClick={onLeave}
            title="Exit lobby"
            className="pro-btn rounded-xl px-2.5 py-1.5 font-mono text-xs font-black uppercase"
          >
            EXIT
          </button>
        </div>
      </header>

      {/* Active Minimized Match Banner */}
      {game && gameHidden && (
        <div className="flex items-center justify-between gap-2 border-b-2 border-[#111111] bg-[#ffe500] px-4 py-2 text-xs font-black">
          <span>
            {GAME_META[game.id].emoji} LIVE MATCH: {GAME_META[game.id].name} ·{" "}
            {game.players.length} PLAYERS
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGameHidden(false)}
              className="pro-btn rounded-lg px-3 py-1 font-mono text-[11px] font-black uppercase"
            >
              REJOIN →
            </button>
            {canEndActiveGame && (
              <button
                onClick={abortGame}
                className="pro-btn rounded-lg px-2 py-1 text-xs font-black"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="relative flex min-h-0 flex-1">
        {/* Left: Crisp Chat Stream + Pro Composer */}
        <main className="pro-grid-bg flex min-w-0 flex-1 flex-col">
          <div
            ref={listRef}
            className="chat-scroll flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-6"
          >
            {messages.map((m) => {
              if (m.kind === "system") {
                return (
                  <div key={m.id} className="msg-in flex justify-center">
                    <span className="rounded-lg border-[1.5px] border-[#111111] bg-[#efece2] px-3 py-1 text-center font-mono text-[11px] font-bold text-zinc-800">
                      {m.text}
                    </span>
                  </div>
                );
              }

              const mine = m.userId === me.id;
              const isBotMsg = BOTS.some((b) => b.id === m.userId);
              const tier = getRankTier(m.senderElo ?? 1000);
              const totalVotes =
                m.poll?.options.reduce((s, o) => s + o.votes.length, 0) || 0;
              const reactionEntries = Object.entries(m.reactions || {});
              const seenCount = (m.seenBy || []).filter(
                (id) => id !== m.userId
              ).length;

              return (
                <div
                  key={m.id}
                  className={`msg-in group flex items-start gap-2.5 ${
                    mine ? "flex-row-reverse" : ""
                  }`}
                >
                  <img
                    src={
                      m.avatar ||
                      everyone.find((u) => u.id === m.userId)?.avatar ||
                      me.avatar
                    }
                    alt={m.name}
                    className="mt-0.5 h-9 w-9 shrink-0 rounded-full border-2 border-[#111111] bg-white object-cover"
                  />

                  <div
                    className={`flex max-w-[84%] flex-col sm:max-w-[72%] ${
                      mine ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Sender + ELO Tier Badge + Timestamp */}
                    <div
                      className={`mb-1 flex flex-wrap items-center gap-1.5 text-[11px] ${
                        mine ? "flex-row-reverse" : ""
                      }`}
                    >
                      <span className="font-black text-[#111111]">
                        {mine ? "You" : m.name}
                      </span>
                      <span
                        style={{
                          backgroundColor: tier.bg,
                          color: tier.text,
                        }}
                        className="rounded border border-[#111111] px-1.5 font-mono text-[10px] font-black"
                      >
                        {tier.short} · {m.senderElo ?? 1000}
                      </span>
                      {isBotMsg && (
                        <span className="rounded border border-[#111111] bg-white px-1.5 font-mono text-[9px] font-black">
                          AI
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-zinc-500">
                        {formatClock(m.ts)}
                      </span>
                      {m.editedAt && (
                        <span className="font-mono text-[10px] text-zinc-400">
                          (edited)
                        </span>
                      )}
                    </div>

                    {/* Crisp #111111 Bordered Message Card */}
                    <div
                      className={`relative rounded-2xl border-2 border-[#111111] px-3.5 py-2.5 shadow-[3px_3px_0px_#111111] ${
                        mine ? "bg-[#fffef7]" : "bg-white"
                      }`}
                    >
                      {m.replyTo && (
                        <div className="mb-2 rounded-lg border-[1.5px] border-[#111111] bg-[#f3f0e6] px-2.5 py-1 text-xs">
                          <span className="font-black text-[#111111]">
                            ↩ {m.replyTo.name}:{" "}
                          </span>
                          <span className="text-zinc-700">
                            {m.replyTo.preview}
                          </span>
                        </div>
                      )}

                      {m.text && (
                        <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-[#111111]">
                          {m.text}
                        </p>
                      )}

                      {m.attachment && m.attachment.url && (
                        <img
                          src={m.attachment.url}
                          alt={m.attachment.name}
                          className={
                            m.attachment.type === "gif"
                              ? "mt-1 max-h-40 rounded-xl object-contain"
                              : "mt-2 max-h-64 rounded-xl border-2 border-[#111111] object-cover"
                          }
                        />
                      )}

                      {m.card && (
                        <div className="mt-1 w-72 sm:w-96">
                          <SearchCardView
                            card={m.card}
                            meName={me.name}
                            onVotePoll={(optionId) => {
                              if (!m.card?.poll) return;
                              const nextPoll = m.card.poll.map((o) => ({
                                ...o,
                                votes:
                                  o.id === optionId
                                    ? o.votes.includes(me.name)
                                      ? o.votes.filter((n) => n !== me.name)
                                      : [...o.votes, me.name]
                                    : o.votes.filter((n) => n !== me.name),
                              }));
                              commitMessageUpdate({
                                ...m,
                                card: { ...m.card, poll: nextPoll },
                              });
                            }}
                          />
                        </div>
                      )}

                      {/* Interactive Ready-Check Lobby Card */}
                      {m.lobby && (
                        <div className="w-64 sm:w-80">
                          <div className="flex items-center justify-between border-b-2 border-[#111111] pb-2">
                            <span className="rounded border border-[#111111] bg-[#ffe500] px-2 py-0.5 font-mono text-[10px] font-black uppercase">
                              ⚔️ READY CHECK
                            </span>
                            <span className="font-mono text-[11px] font-black text-zinc-600">
                              {m.lobby.readyNames.length} READY
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center gap-2.5">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#111111] bg-[#f7f5ee] text-xl">
                              {GAME_META[m.lobby.gameId]?.emoji || "🎮"}
                            </span>
                            <div>
                              <p className="text-sm font-black text-[#111111]">
                                {GAME_META[m.lobby.gameId]?.name ||
                                  m.lobby.gameId}
                              </p>
                              <p className="text-xs text-zinc-600">
                                Host: {m.lobby.hostName}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {m.lobby.readyNames.map((rName) => (
                              <span
                                key={rName}
                                className="rounded-lg border-[1.5px] border-[#111111] bg-[#bbf7d0] px-2 py-0.5 font-mono text-[11px] font-black"
                              >
                                ✓ {rName}
                              </span>
                            ))}
                          </div>

                          {!m.lobby.launched ? (
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => toggleLobbyReady(m)}
                                className="pro-btn flex-1 rounded-xl py-1.5 font-mono text-xs font-black uppercase"
                              >
                                {m.lobby.readyNames.includes(me.name)
                                  ? "✓ READY"
                                  : "READY UP"}
                              </button>
                              <button
                                type="button"
                                onClick={() => launchFromLobby(m)}
                                className="pro-btn-accent flex-1 rounded-xl py-1.5 font-mono text-xs font-black uppercase"
                              >
                                ▶ START
                              </button>
                            </div>
                          ) : (
                            <p className="mt-2.5 rounded-lg border border-[#111111] bg-[#f3f0e6] py-1 text-center font-mono text-[11px] font-black uppercase">
                              MATCH LAUNCHED
                            </p>
                          )}
                        </div>
                      )}

                      {/* Post-Match Result + ELO Delta + 1-Click Rematch Card */}
                      {m.matchResult && (
                        <div className="w-64 sm:w-80">
                          <div className="flex items-center justify-between border-b-2 border-[#111111] pb-2">
                            <span className="font-mono text-xs font-black uppercase">
                              {GAME_META[m.matchResult.gameId]?.emoji || "🏆"}{" "}
                              {GAME_META[m.matchResult.gameId]?.name ||
                                m.matchResult.gameId}
                            </span>
                            {typeof m.matchResult.eloDelta === "number" && (
                              <span
                                className={`rounded border border-[#111111] px-2 py-0.5 font-mono text-[10px] font-black ${
                                  m.matchResult.eloDelta >= 0
                                    ? "bg-[#bbf7d0]"
                                    : "bg-[#fecaca]"
                                }`}
                              >
                                {m.matchResult.eloDelta >= 0
                                  ? `+${m.matchResult.eloDelta} ELO ▲`
                                  : `${m.matchResult.eloDelta} ELO ▼`}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-xs font-bold text-zinc-800">
                            {m.matchResult.summary}
                          </p>
                          <div className="mt-2 space-y-1">
                            {m.matchResult.standings.map((s, idx) => (
                              <div
                                key={s.name + idx}
                                className={`flex items-center justify-between rounded-lg border border-[#111111] px-2.5 py-1 text-xs font-bold ${
                                  idx === 0 ? "bg-[#ffe500]" : "bg-[#f7f5ee]"
                                }`}
                              >
                                <span>
                                  #{idx + 1} {s.name} {idx === 0 ? "👑" : ""}
                                </span>
                                <span className="font-mono font-black">
                                  {s.score} PTS
                                </span>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => launchGame(m.matchResult!.gameId)}
                            className="pro-btn-accent mt-2.5 w-full rounded-xl py-1.5 font-mono text-xs font-black uppercase"
                          >
                            ↻ REMATCH
                          </button>
                        </div>
                      )}

                      {/* Live Squad Poll Card */}
                      {m.poll && (
                        <div className="mt-1 w-64 space-y-2 sm:w-76">
                          <p className="text-sm font-black text-[#111111]">
                            📊 {m.poll.question}
                          </p>
                          {m.poll.options.map((opt) => {
                            const pct = totalVotes
                              ? Math.round(
                                  (opt.votes.length / totalVotes) * 100
                                )
                              : 0;
                            const picked = opt.votes.includes(me.id);
                            return (
                              <button
                                key={opt.id}
                                onClick={() => votePoll(m, opt.id)}
                                className={`relative block w-full overflow-hidden rounded-xl border-2 border-[#111111] px-3 py-1.5 text-left text-xs font-bold transition ${
                                  picked ? "bg-[#ffe500]" : "bg-[#f7f5ee]"
                                }`}
                              >
                                <span className="relative flex justify-between">
                                  <span>
                                    {picked ? "✓ " : ""}
                                    {opt.label}
                                  </span>
                                  <span className="font-mono font-black">
                                    {pct}%
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Delivery / Seen Receipt */}
                      {mine && (
                        <div className="mt-1 flex justify-end">
                          <span
                            className={`font-mono text-[10px] font-black ${
                              seenCount > 0 || activeBots.length > 0
                                ? "text-[#16a34a]"
                                : "text-zinc-400"
                            }`}
                          >
                            ✓✓
                          </span>
                        </div>
                      )}

                      {/* Hover Quick Action Bar */}
                      <div
                        className={`absolute -top-3 ${
                          mine ? "left-2" : "right-2"
                        } hidden items-center gap-0.5 rounded-lg border-[1.5px] border-[#111111] bg-white px-1 py-0.5 shadow-[2px_2px_0px_#111111] group-hover:flex`}
                      >
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(m, emoji)}
                            className="rounded px-1 text-xs hover:bg-[#ffe500]"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => setReplyTo(m)}
                          title="Reply"
                          className="rounded px-1.5 font-mono text-[10px] font-black hover:bg-[#ffe500]"
                        >
                          ↩
                        </button>
                        {mine && m.text && (
                          <button
                            onClick={() => {
                              setEditingId(m.id);
                              setText(m.text || "");
                            }}
                            title="Edit"
                            className="rounded px-1 font-mono text-[10px] font-black hover:bg-[#ffe500]"
                          >
                            ✎
                          </button>
                        )}
                        {mine && (
                          <button
                            onClick={() => removeMessage(m.id)}
                            title="Delete"
                            className="rounded px-1 font-mono text-[10px] font-black text-[#dc2626] hover:bg-[#fecaca]"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reaction Pills */}
                    {reactionEntries.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {reactionEntries.map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(m, emoji)}
                            className={`flex items-center gap-1 rounded-lg border-[1.5px] border-[#111111] px-2 py-0.5 text-xs font-black ${
                              users.includes(me.id)
                                ? "bg-[#ffe500]"
                                : "bg-white"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="font-mono text-[10px]">
                              {users.length}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {typingNames.length > 0 && (
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-600">
                <span className="flex gap-1 rounded-lg border border-[#111111] bg-white px-2.5 py-1.5">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#111111]" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#111111]" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#111111]" />
                </span>
                <span>{typingNames.join(", ")} typing…</span>
              </div>
            )}
          </div>

          {/* Reply / Edit / Image Attachment Bar */}
          {(replyTo || editingId || pendingAttachment) && (
            <div className="flex items-center gap-3 border-t-2 border-[#111111] bg-[#fef9c3] px-4 py-2 text-xs font-bold">
              {pendingAttachment?.url && (
                <img
                  src={pendingAttachment.url}
                  alt="Preview"
                  className="h-10 w-10 rounded-lg border-2 border-[#111111] object-cover"
                />
              )}
              <div className="min-w-0 flex-1 truncate">
                {editingId
                  ? "Editing message"
                  : replyTo
                  ? `Replying to ${replyTo.name}: ${replyTo.text || "Shared card"}`
                  : `Attached: ${pendingAttachment?.name}`}
              </div>
              <button
                onClick={() => {
                  setReplyTo(null);
                  setEditingId(null);
                  setPendingAttachment(null);
                }}
                className="pro-btn rounded-lg px-2 py-0.5 text-xs font-black"
              >
                ✕
              </button>
            </div>
          )}

          {/* Pro Gamer Composer Footer */}
          <div className="relative border-t-2 border-[#111111] bg-[#f3f0e6] px-3 py-2.5 sm:px-5">
            {/* Slash Autocomplete Menu */}
            {slashSuggestions.length > 0 && (
              <div className="pro-card absolute bottom-full left-4 right-4 mb-2 max-w-md overflow-hidden rounded-xl bg-white">
                {slashSuggestions.map((s) => (
                  <button
                    key={s.cmd}
                    onClick={() => {
                      if (s.game) {
                        setText("");
                        launchGame(s.game);
                      } else if (s.callout) {
                        publishMessage({ text: s.callout });
                        setText("");
                      } else {
                        setText(`${s.cmd} `);
                      }
                    }}
                    className="flex w-full items-center justify-between border-b border-zinc-200 px-3.5 py-2 text-left text-xs hover:bg-[#ffe500]"
                  >
                    <span className="font-mono font-black text-[#111111]">
                      {s.cmd}
                    </span>
                    <span className="font-semibold text-zinc-600">
                      {s.desc}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {showEmoji && (
              <EmojiPicker
                onPick={(e) => setText((t) => t + e)}
                onClose={() => setShowEmoji(false)}
              />
            )}

            {showStickers && (
              <GifPicker
                onPick={(url, label) => {
                  publishMessage({
                    text: "",
                    attachment: {
                      type: "gif",
                      name: label,
                      url,
                      mime: url.startsWith("data:image/svg")
                        ? "image/svg+xml"
                        : "image/gif",
                    },
                  });
                  setShowStickers(false);
                  triggerSmartBotReply("");
                }}
                onClose={() => setShowStickers(false)}
              />
            )}

            {showSfx && (
              <SoundboardPicker
                onTrigger={(soundId, _label, shoutout) => {
                  sounds.playSoundDrop(soundId);
                  syncRef.current?.emit({ t: "sound", soundId, by: me.id });
                  publishMessage({ kind: "system", text: shoutout });
                  setShowSfx(false);
                }}
                onClose={() => setShowSfx(false)}
              />
            )}

            {/* 1-Click Quick Gamer Callouts */}
            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="shrink-0 font-mono text-[10px] font-black uppercase text-zinc-500">
                CALLOUTS:
              </span>
              {CALLOUT_CHIPS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    sounds.playSend();
                    publishMessage({ text: c.text });
                    triggerSmartBotReply(c.text);
                  }}
                  className="shrink-0 rounded-lg border-[1.5px] border-[#111111] bg-white px-2.5 py-0.5 font-mono text-[10px] font-black hover:bg-[#ffe500]"
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Clean Input Row */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowStickers(false);
                  setShowSfx(false);
                  setShowEmoji((v) => !v);
                }}
                title="Emojis"
                className="pro-btn rounded-xl px-2.5 py-2 text-sm"
              >
                😀
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmoji(false);
                  setShowSfx(false);
                  setShowStickers((v) => !v);
                }}
                title="Callout Stamps & GIFs"
                className="pro-btn rounded-xl px-2.5 py-2 text-sm"
              >
                🏷️
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmoji(false);
                  setShowStickers(false);
                  setShowSfx((v) => !v);
                }}
                title="Room SFX Ping"
                className="pro-btn hidden rounded-xl px-2.5 py-2 text-sm sm:inline-flex"
              >
                🔔
              </button>
              <button
                type="button"
                onClick={() => setShowPollModal(true)}
                title="Create Poll"
                className="pro-btn hidden rounded-xl px-2.5 py-2 text-sm sm:inline-flex"
              >
                📊
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title="Upload Screenshot / Image"
                className="pro-btn hidden rounded-xl px-2.5 py-2 text-sm sm:inline-flex"
              >
                📷
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const dataUrl = await resizeUploadImage(file, 760);
                    setPendingAttachment({
                      type: "image",
                      name: file.name,
                      url: dataUrl,
                      mime: "image/jpeg",
                    });
                  }
                  e.target.value = "";
                }}
              />

              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (Date.now() - lastTypingSent.current > 1800) {
                    lastTypingSent.current = Date.now();
                    syncRef.current?.emit({
                      t: "typing",
                      uid: me.id,
                      name: me.name,
                      until: Date.now() + 2600,
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Message #${room} or type /aim, /duel, /connect4…`}
                className="pro-input min-w-0 flex-1 rounded-xl px-3.5 py-2 text-sm font-semibold"
              />

              <button
                type="button"
                onClick={handleSend}
                className="pro-btn-dark shrink-0 rounded-xl px-4 py-2 font-mono text-xs font-black uppercase"
              >
                {editingId ? "SAVE" : "SEND"}
              </button>
            </div>
          </div>
        </main>

        {/* Right Pro Sidebar: Rank Card + Standings / Roster */}
        <aside
          className={`${
            sidebarOpen
              ? "fixed inset-y-0 right-0 z-30 flex"
              : "hidden lg:flex"
          } w-72 shrink-0 flex-col border-l-2 border-[#111111] bg-[#f3f0e6]`}
        >
          {/* Player Rank & Stats Card */}
          <div className="border-b-2 border-[#111111] bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2.5">
                <img
                  src={me.avatar}
                  alt={me.name}
                  className="h-10 w-10 rounded-full border-2 border-[#111111] object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{me.name}</p>
                  <p className="font-mono text-[10px] font-bold text-zinc-500">
                    {me.bio || "Competitive"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="pro-btn rounded-lg px-2 py-1 text-xs font-black lg:hidden"
              >
                ✕
              </button>
            </div>

            <div
              className="mt-3 flex items-center justify-between rounded-xl border-2 border-[#111111] px-3 py-1.5"
              style={{ backgroundColor: myTier.bg, color: myTier.text }}
            >
              <span className="font-mono text-xs font-black uppercase">
                ◆ {myTier.label}
              </span>
              <span className="font-mono text-xs font-black">
                {stats.elo} ELO
              </span>
            </div>

            <div className="mt-2">
              <div className="flex justify-between font-mono text-[10px] font-bold text-zinc-500">
                <span>
                  W: {stats.wins} · M: {stats.matches}
                </span>
                <span>
                  {nextThreshold ? `NEXT TIER: ${nextThreshold}` : "MASTER TIER"}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full border border-[#111111] bg-[#f7f5ee]">
                <div
                  className="h-full bg-[#111111] transition-all"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] font-bold text-zinc-600">
                <span>STREAK: {stats.streak}🔥</span>
                <span>
                  BEST AIM:{" "}
                  {stats.bestReactionMs ? `${stats.bestReactionMs}ms` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Standings vs Roster Tabs */}
          <div className="grid grid-cols-2 gap-1.5 border-b-2 border-[#111111] p-2.5">
            <button
              type="button"
              onClick={() => setSidebarTab("standings")}
              className={`rounded-xl border-2 border-[#111111] py-1.5 font-mono text-[11px] font-black uppercase ${
                sidebarTab === "standings" ? "bg-[#ffe500]" : "bg-white"
              }`}
            >
              🏆 STANDINGS
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("roster")}
              className={`rounded-xl border-2 border-[#111111] py-1.5 font-mono text-[11px] font-black uppercase ${
                sidebarTab === "roster" ? "bg-[#ffe500]" : "bg-white"
              }`}
            >
              👥 ROSTER ({everyone.length})
            </button>
          </div>

          <div className="chat-scroll flex-1 space-y-2 overflow-y-auto p-3">
            {sidebarTab === "standings" ? (
              leaderboard.map((u, idx) => {
                const t = getRankTier(u.elo ?? 1000);
                return (
                  <div
                    key={u.id}
                    className={`flex items-center gap-2 rounded-xl border-2 border-[#111111] px-2.5 py-2 ${
                      idx === 0 ? "bg-[#fffef0]" : "bg-white"
                    }`}
                  >
                    <span className="w-5 font-mono text-xs font-black">
                      #{idx + 1}
                    </span>
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="h-7 w-7 rounded-full border border-[#111111] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black">
                        {u.name} {u.id === me.id ? "(YOU)" : ""}
                      </p>
                      <p className="font-mono text-[10px] font-bold text-zinc-500">
                        {t.short} · {u.wins ?? 0}W
                      </p>
                    </div>
                    <span
                      style={{ backgroundColor: t.bg, color: t.text }}
                      className="rounded border border-[#111111] px-1.5 py-0.5 font-mono text-[10px] font-black"
                    >
                      {u.elo ?? 1000}
                    </span>
                  </div>
                );
              })
            ) : (
              everyone.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2.5 rounded-xl border-2 border-[#111111] bg-white px-2.5 py-2"
                >
                  <div className="relative shrink-0">
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="h-8 w-8 rounded-full border border-[#111111] object-cover"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#111111] bg-[#22c55e]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black">
                      {u.name} {u.id === me.id ? "(YOU)" : ""}
                    </p>
                    <p className="truncate text-[10px] font-semibold text-zinc-500">
                      {u.bot ? "AI Sparring Partner" : u.bio || "Online"}
                    </p>
                  </div>
                  {u.id !== me.id && (
                    <button
                      type="button"
                      onClick={() => postReadyCheck("aimlab")}
                      title="Challenge to 1v1"
                      className="pro-btn rounded-lg px-2 py-0.5 font-mono text-[10px] font-black"
                    >
                      1v1
                    </button>
                  )}
                </div>
              ))
            )}

            {/* Quick Mode Queue Cards */}
            <div className="pt-2">
              <p className="mb-1.5 font-mono text-[10px] font-black uppercase tracking-wider text-zinc-500">
                QUICK QUEUE
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["aimlab", "sector", "duel", "connect4"] as GameId[]).map(
                  (gid) => (
                    <button
                      key={gid}
                      type="button"
                      onClick={() => launchGame(gid)}
                      className="pro-btn flex flex-col items-start rounded-xl p-2 text-left"
                    >
                      <span className="text-base">{GAME_META[gid].emoji}</span>
                      <span className="mt-0.5 line-clamp-1 text-[11px] font-black">
                        {GAME_META[gid].name}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Solo AI Sparring Toggle */}
          <div className="border-t-2 border-[#111111] bg-white p-3">
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-black">AI Sparring Bots</p>
                <p className="font-mono text-[10px] text-zinc-500">
                  {botMode === "auto"
                    ? otherHumans.length > 0
                      ? "Paused (human present)"
                      : "Auto while solo"
                    : botMode === "on"
                    ? "Always active"
                    : "Disabled"}
                </p>
              </div>
              <button
                type="button"
                onClick={cycleBotMode}
                className={`rounded-lg border-2 border-[#111111] px-2.5 py-1 font-mono text-[10px] font-black uppercase ${
                  botMode === "off" ? "bg-[#f7f5ee]" : "bg-[#bbf7d0]"
                }`}
              >
                {botMode.toUpperCase()}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Squad Poll Modal */}
      {showPollModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowPollModal(false)}
        >
          <div
            className="pro-card w-full max-w-md rounded-2xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3">
              <h3 className="font-mono text-sm font-black uppercase">
                📊 CREATE SQUAD POLL
              </h3>
              <button
                onClick={() => setShowPollModal(false)}
                className="pro-btn rounded-lg px-2 py-0.5 text-xs font-black"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {DESI_QUICK_POLLS.map((preset) => (
                <button
                  key={preset.question}
                  type="button"
                  onClick={() => {
                    setPollQuestion(preset.question);
                    setPollOpts([...preset.options]);
                  }}
                  className="pro-btn rounded-lg px-2.5 py-1 text-[11px] font-bold"
                >
                  {preset.question}
                </button>
              ))}
            </div>

            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Poll question…"
              className="pro-input mt-3 w-full rounded-xl px-3 py-2 text-xs font-semibold"
            />
            <div className="mt-2 space-y-1.5">
              {pollOpts.map((opt, idx) => (
                <input
                  key={idx}
                  value={opt}
                  onChange={(e) =>
                    setPollOpts((cur) =>
                      cur.map((x, i) => (i === idx ? e.target.value : x))
                    )
                  }
                  placeholder={`Option ${idx + 1}`}
                  className="pro-input w-full rounded-xl px-3 py-1.5 text-xs font-semibold"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={createSquadPoll}
              className="pro-btn-accent mt-4 w-full rounded-xl py-2.5 font-mono text-xs font-black uppercase"
            >
              POST POLL →
            </button>
          </div>
        </div>
      )}

      {searchQuery !== null && (
        <SearchConsole
          initialQuery={searchQuery}
          onClose={() => setSearchQuery(null)}
          onShare={(card: SearchCard) => {
            publishMessage({ text: "", card });
            setSearchQuery(null);
          }}
        />
      )}

      {libraryMode && (
        <GameLibrary
          defaultQueueMode={libraryMode === "lobby"}
          onPick={launchGame}
          onPostLobby={postReadyCheck}
          onClose={() => setLibraryMode(null)}
        />
      )}

      {game && !gameHidden && (
        <GameOverlay
          g={game}
          me={me}
          isLeader={isLeader}
          canEndGame={canEndActiveGame}
          mutate={handleMutateGame}
          finish={handleFinishGame}
          onAbort={() => {
            if (game.phase === "done") abortGame();
            else setGameHidden(true);
          }}
          onRematch={(gid) => {
            abortGame();
            window.setTimeout(() => launchGame(gid), 50);
          }}
        />
      )}
    </div>
  );
}
