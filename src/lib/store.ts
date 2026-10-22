import type { BotMode, Member, Message, User } from "./types";

const P = "chatarena_";

export const RETENTION_OPTIONS = [2, 7, 30] as const;

export function detectDevice(): "mobile" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    ? "mobile"
    : "desktop";
}

export function getRetentionDays(): number {
  const v = Number(localStorage.getItem(P + "retention"));
  return RETENTION_OPTIONS.includes(v as (typeof RETENTION_OPTIONS)[number])
    ? v
    : 7;
}
export function setRetentionDays(d: number) {
  localStorage.setItem(P + "retention", String(d));
}

export function getProfanityFilter(): boolean {
  return localStorage.getItem(P + "profanity") !== "off";
}
export function setProfanityFilter(on: boolean) {
  localStorage.setItem(P + "profanity", on ? "on" : "off");
}

export function getBotMode(): BotMode {
  const raw = localStorage.getItem(P + "bot_mode");
  if (raw === "on" || raw === "off" || raw === "auto") return raw;
  return "auto";
}
export function setBotMode(mode: BotMode) {
  localStorage.setItem(P + "bot_mode", mode);
}

const BAD_WORDS = [
  "damn",
  "hell",
  "crap",
  "ass",
  "bastard",
  "shit",
  "fuck",
  "bitch",
];
export function cleanText(text: string): string {
  if (!getProfanityFilter()) return text;
  return text.replace(/\b\w+\b/g, (w) =>
    BAD_WORDS.includes(w.toLowerCase())
      ? w[0] + "•".repeat(Math.max(1, w.length - 1))
      : w
  );
}

// ---------- user ----------
export function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(P + "user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    return {
      ...parsed,
      device: detectDevice(),
    };
  } catch {
    return null;
  }
}
export function saveUser(u: User) {
  localStorage.setItem(
    P + "user",
    JSON.stringify({ ...u, device: detectDevice() })
  );
}

// ---------- messages ----------
export function loadMessages(room: string): Message[] {
  try {
    const raw = localStorage.getItem(P + "msgs_" + room);
    if (!raw) return [];
    const cutoff = Date.now() - getRetentionDays() * 86400000;
    return (JSON.parse(raw) as Message[]).filter((m) => m.ts >= cutoff);
  } catch {
    return [];
  }
}

export function saveMessages(room: string, msgs: Message[]) {
  const cutoff = Date.now() - getRetentionDays() * 86400000;
  let keep = msgs.filter((m) => m.ts >= cutoff).slice(-400);
  const attempt = (list: Message[]) =>
    localStorage.setItem(P + "msgs_" + room, JSON.stringify(list));
  try {
    attempt(keep);
  } catch {
    keep = keep.map((m, i) =>
      m.attachment?.url.startsWith("data:") && i < keep.length - 20
        ? { ...m, attachment: { ...m.attachment, url: "", ephemeral: true } }
        : m
    );
    try {
      attempt(keep);
    } catch {
      attempt(
        keep.slice(-100).map((m) =>
          m.attachment
            ? {
                ...m,
                attachment: {
                  ...m.attachment,
                  url: m.attachment.url.startsWith("data:")
                    ? ""
                    : m.attachment.url,
                  ephemeral: true,
                },
              }
            : m
        )
      );
    }
  }
}

// ---------- members ----------
export function loadMembers(room: string): Member[] {
  try {
    return JSON.parse(
      localStorage.getItem(P + "members_" + room) || "[]"
    ) as Member[];
  } catch {
    return [];
  }
}
export function saveMembers(room: string, members: Member[]) {
  try {
    localStorage.setItem(
      P + "members_" + room,
      JSON.stringify(members.slice(0, 40))
    );
  } catch {
    /* ignore */
  }
}
export const ONLINE_WINDOW = 18000;
export const isOnline = (m: Member) =>
  !!m.bot || Date.now() - m.lastSeen < ONLINE_WINDOW;

// ---------- leader election (only one browser/device drives solo bots) ----------
const TAB_ID = Math.random().toString(36).slice(2);
export function claimLeadership(room: string): boolean {
  const key = P + "leader_" + room;
  try {
    const cur = JSON.parse(localStorage.getItem(key) || "null") as {
      id: string;
      ts: number;
    } | null;
    if (!cur || cur.id === TAB_ID || Date.now() - cur.ts > 12000) {
      localStorage.setItem(key, JSON.stringify({ id: TAB_ID, ts: Date.now() }));
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function normalizeRoomSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/^\/+/, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "lobby"
  );
}

/**
 * Supports clean Vercel SPA paths (`/friday-squad`) AND query param (`?room=friday-squad`).
 */
export function getRoomFromUrl(): string {
  if (typeof window === "undefined") return "lobby";
  const param = new URLSearchParams(window.location.search).get("room");
  if (param) return normalizeRoomSlug(param);
  const pathSeg = window.location.pathname
    .split("/")
    .filter(Boolean)[0];
  if (pathSeg && pathSeg !== "api" && pathSeg !== "assets" && pathSeg !== "index.html") {
    return normalizeRoomSlug(pathSeg);
  }
  return "lobby";
}

export function setRoomInUrl(room: string): void {
  if (typeof window === "undefined") return;
  const slug = normalizeRoomSlug(room);
  const url = new URL(window.location.href);
  url.pathname = "/" + slug;
  url.search = "";
  url.hash = "";
  window.history.replaceState({}, "", url.toString());
}

export function roomLink(room: string): string {
  if (typeof window === "undefined") return `/${room}`;
  const slug = normalizeRoomSlug(room);
  return `${window.location.origin}/${slug}`;
}

export function displayHost(): string {
  if (typeof window === "undefined") return "chatarena.vercel.app";
  return window.location.host;
}
