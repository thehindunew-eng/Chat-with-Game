import type { Message } from "./types";

const STOP = new Set(
  "the a an and or but of to in on at for with is are was were be been it this that i you he she we they me my your our its as so if then than just very really what who where when why how do does did have has had not no yes ok okay im dont cant will would can could should about from up out get got go going hey hi hello game lol haha".split(" ")
);

export interface Summary {
  headline: string;
  stats: { total: number; humans: number; participants: string[]; span: string; games: number };
  topics: string[];
  keyPoints: string[];
  questions: { q: string; a?: string }[];
  shared: { label: string; query: string; note?: string }[];
  decisions: string[];
  games: string[];
}

function fmtDuration(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "under a minute";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

export function summarize(msgs: Message[]): Summary {
  const chat = msgs.filter((m) => m.kind === "chat" && m.text);
  const ai = msgs.filter((m) => m.kind === "ai");
  const sys = msgs.filter((m) => m.kind === "system");
  const participants = [...new Set(chat.map((m) => m.name))];
  const games = sys.filter((m) => /completed|unlocked/i.test(m.text || "")).map((m) => m.text!);

  // topics by frequency
  const freq = new Map<string, number>();
  for (const m of chat) {
    for (const w of (m.text || "").toLowerCase().match(/[a-z]{4,}/g) || []) {
      if (!STOP.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  const topics = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);

  // key points: longest / most information-dense human messages, deduped per author
  const scored = chat
    .map((m) => ({ m, score: (m.text || "").length + ((m.text || "").split(" ").length > 6 ? 20 : 0) }))
    .sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const keyPoints: string[] = [];
  for (const { m } of scored) {
    if (seen.has(m.name) && keyPoints.length >= 3) continue;
    seen.add(m.name);
    keyPoints.push(`${m.name}: “${(m.text || "").slice(0, 140)}${(m.text || "").length > 140 ? "…" : ""}”`);
    if (keyPoints.length >= 5) break;
  }

  const questions = chat
    .filter((m) => (m.text || "").trim().endsWith("?") || /^\/ask/i.test(m.text || ""))
    .slice(-5)
    .map((m) => {
      const ans = ai.find((a) => a.ts >= m.ts && a.ts - m.ts < 60000);
      return { q: `${m.name} asked: ${(m.text || "").slice(0, 110)}`, a: ans ? (ans.card?.headline || ans.text || "").slice(0, 160) + "…" : undefined };
    });

  const decisions = chat
    .filter((m) => /\b(let's|lets|decided|agree|agreed|plan|we will|we'll|final)\b/i.test(m.text || ""))
    .slice(-4)
    .map((m) => `${m.name}: “${(m.text || "").slice(0, 120)}”`);

  const shared = msgs
    .filter((m) => m.card)
    .slice(-6)
    .map((m) => ({ label: `${m.card!.icon} ${m.card!.label} · ${m.name}`, query: m.card!.query, note: m.card!.note }));

  const span = msgs.length > 1 ? fmtDuration(msgs[msgs.length - 1].ts - msgs[0].ts) : "just started";
  const headline =
    chat.length === 0
      ? "The session has just begun — no conversation to summarize yet."
      : `${participants.length} participant${participants.length === 1 ? "" : "s"} exchanged ${chat.length} message${chat.length === 1 ? "" : "s"} over ${span}` +
        (topics.length ? `, mainly about ${topics.slice(0, 3).join(", ")}.` : ".") +
        (games.length ? ` ${games.length} team game${games.length === 1 ? " was" : "s were"} played.` : "") +
        (shared.length ? ` ${shared.length} search result${shared.length === 1 ? " was" : "s were"} shared for the group to decide on.` : "");

  return {
    headline,
    stats: { total: msgs.length, humans: chat.length, participants, span, games: games.length },
    topics,
    keyPoints,
    questions,
    shared,
    decisions,
    games,
  };
}