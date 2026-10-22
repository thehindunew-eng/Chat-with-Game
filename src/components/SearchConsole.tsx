import { useEffect, useRef, useState } from "react";
import type { SearchCard, Vertical } from "../lib/types";
import {
  SEARCH_PRESETS,
  VERTICALS,
  detectVertical,
  runSearch,
} from "../lib/search";
import SearchCardView from "./SearchCardView";
import { sounds } from "../lib/audio";

interface Props {
  initialQuery: string;
  onClose: () => void;
  onShare: (card: SearchCard) => void;
}

const REFINERS = [
  "cheapest options",
  "this weekend",
  "for 4 people",
  "near the city centre",
  "with top ratings",
  "budget friendly",
  "morning timings",
  "family friendly",
];

function computeSplitForCount(
  split: SearchCard["splitEstimate"],
  count: number
): SearchCard["splitEstimate"] {
  if (!split) return undefined;
  const numMatch = split.total.match(/([^0-9]*)([\d,]+(?:\.\d+)?)(.*)/);
  if (!numMatch) return { ...split, count };
  const prefix = numMatch[1] || "";
  const totalVal = parseFloat(numMatch[2].replace(/,/g, ""));
  const suffix = numMatch[3] || "";
  if (!Number.isFinite(totalVal)) return { ...split, count };
  const per = totalVal / Math.max(1, count);
  const formatted = per >= 100
    ? Math.round(per).toLocaleString()
    : per.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return {
    total: split.total,
    perPerson: `${prefix}${formatted}${suffix}`.trim(),
    count,
  };
}

export default function SearchConsole({
  initialQuery,
  onClose,
  onShare,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [vertical, setVertical] = useState<Vertical | "auto">("auto");
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<SearchCard | null>(null);
  const [note, setNote] = useState("");
  const [askVote, setAskVote] = useState(true);
  const [paxCount, setPaxCount] = useState(4);
  const [dictating, setDictating] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const speechRef = useRef<any>(null);
  const ranRef = useRef(false);

  const search = async (q = query, v = vertical) => {
    const clean = q.trim();
    if (!clean) return;
    sounds.playPop();
    setLoading(true);
    setCard(null);
    try {
      const res = await runSearch(clean, v);
      setCard(res);
      setHistory((h) => (h[0] === clean ? h : [clean, ...h].slice(0, 6)));
      sounds.playSuccess();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (initialQuery.trim()) search(initialQuery, "auto");
    else inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guessed = detectVertical(query || initialQuery);

  const refine = (extra: string) => {
    sounds.playPop();
    const q = `${query} ${extra}`.replace(/\s+/g, " ").trim();
    setQuery(q);
    search(q, vertical);
  };

  const composedCard: SearchCard | null = card
    ? {
        ...card,
        note: note.trim() || undefined,
        askVote,
        splitEstimate: computeSplitForCount(card.splitEstimate, paxCount),
      }
    : null;

  const share = () => {
    if (!composedCard) return;
    sounds.playSend();
    onShare(composedCard);
  };

  const toggleVoice = () => {
    if (dictating) {
      speechRef.current?.stop();
      setDictating(false);
      return;
    }
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;
    sounds.playPop();
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setQuery(t);
      if (e.results[0].isFinal) {
        search(t, vertical);
      }
    };
    rec.onend = () => setDictating(false);
    rec.onerror = () => setDictating(false);
    rec.start();
    speechRef.current = rec;
    setDictating(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-slate-900 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 bg-gradient-to-r from-teal-950/60 via-slate-900 to-violet-950/60 px-4 py-3 sm:px-6">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-sm text-teal-300">
              🔎
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black text-white">
                Search &amp; Collaborative Planner
              </h2>
              <p className="text-[11px] text-slate-400">
                Live browser data for trains, flights, movies, weather &amp; forex · Preview privately before sharing
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-800/80 p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="relative flex items-center gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="जैसे: Rishikesh trip for 4 · trains Delhi to Varanasi · 3600 split 4 friends"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 pr-24 text-sm text-white placeholder-slate-500 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                onClick={toggleVoice}
                title="Voice search"
                className={`rounded-xl p-1.5 transition ${
                  dictating
                    ? "animate-pulse bg-rose-500 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {dictating ? "🔴" : "🎤"}
              </button>
              <button
                onClick={() => search()}
                disabled={loading || !query.trim()}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-violet-600 px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-40"
              >
                {loading ? "…" : "Search"}
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
            {VERTICALS.map((v) => {
              const active = vertical === v.id;
              const auto = vertical === "auto" && v.id === guessed;
              return (
                <button
                  key={v.id}
                  title={v.hint}
                  onClick={() => {
                    sounds.playPop();
                    setVertical(v.id);
                    if (query.trim()) search(query, v.id);
                  }}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-950/50"
                      : auto
                      ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-400/50"
                      : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className="mr-1">{v.icon}</span>
                  {v.label}
                  {auto && " ·auto"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {!card && !loading && (
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                💡 Instant Inspiration Presets
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SEARCH_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setQuery(p.query);
                      search(p.query, "auto");
                    }}
                    className="flex flex-col items-start gap-1 rounded-2xl border border-white/5 bg-slate-800/70 p-3 text-left transition hover:border-teal-500/40 hover:bg-slate-800 active:scale-95"
                  >
                    <span className="text-xs font-bold text-white">{p.label}</span>
                    <span className="w-full truncate text-[10px] text-slate-400">
                      {p.query}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="space-y-3 py-6">
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-800" />
              <div className="h-28 animate-pulse rounded-2xl bg-slate-800" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 animate-pulse rounded-xl bg-slate-800/60" />
                <div className="h-12 animate-pulse rounded-xl bg-slate-800/60" />
              </div>
              <p className="animate-pulse pt-2 text-center text-xs font-semibold text-teal-400">
                Querying live weather, maps &amp; web sources…
              </p>
            </div>
          )}

          {!loading && composedCard && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Card Preview (Private until shared)
                </p>
                {composedCard.splitEstimate && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                    <span>Split size:</span>
                    <button
                      onClick={() => setPaxCount(Math.max(1, paxCount - 1))}
                      className="px-1 font-bold text-slate-400 hover:text-white"
                    >
                      −
                    </button>
                    <span className="font-mono font-bold text-teal-300">
                      {paxCount}
                    </span>
                    <button
                      onClick={() => setPaxCount(Math.min(20, paxCount + 1))}
                      className="px-1 font-bold text-slate-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              <SearchCardView card={composedCard} preview />

              <p className="mb-1.5 mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                ✍️ Refine &amp; Tweak Query
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {REFINERS.map((r) => (
                  <button
                    key={r}
                    onClick={() => refine(r)}
                    className="rounded-xl border border-white/5 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-teal-400/40 hover:bg-slate-700"
                  >
                    + {r}
                  </button>
                ))}
                <button
                  onClick={() => search(query, vertical)}
                  className="rounded-xl bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-300 hover:bg-teal-500/20"
                >
                  🔄 Re-run search
                </button>
              </div>

              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={140}
                placeholder="Add your note for the room (e.g. 'Day 2 plan looks awesome, thoughts?')"
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-400"
              />

              <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={askVote}
                  onChange={(e) => setAskVote(e.target.checked)}
                  className="h-4 w-4 rounded accent-violet-500"
                />
                <span>
                  <b>Attach interactive live poll</b> — everyone in the room can vote with live % bars
                </span>
              </label>

              {history.length > 1 && (
                <div className="mt-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Recent Searches
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {history.slice(1).map((h) => (
                      <button
                        key={h}
                        onClick={() => {
                          setQuery(h);
                          search(h, vertical);
                        }}
                        className="max-w-[14rem] truncate rounded-lg bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-400 hover:bg-slate-700 hover:text-white"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 bg-slate-950 px-4 py-3 sm:px-6">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
          >
            Discard
          </button>
          <button
            onClick={() => inputRef.current?.focus()}
            className="hidden rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 sm:block"
          >
            ✏️ Edit Query
          </button>
          <button
            onClick={share}
            disabled={!composedCard}
            className="ml-auto rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-teal-500 px-6 py-2.5 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:opacity-40"
          >
            📤 Share Card to Room
          </button>
        </div>
      </div>
    </div>
  );
}
