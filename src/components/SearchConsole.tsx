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
  "for 4 players",
  "top rated",
  "budget friendly",
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
  const formatted =
    per >= 100
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
  const inputRef = useRef<HTMLInputElement>(null);
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

  const composedCard: SearchCard | null = card
    ? {
        ...card,
        note: note.trim() || undefined,
        askVote,
        splitEstimate: computeSplitForCount(card.splitEstimate, paxCount),
      }
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="pro-card flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b-2 border-[#111111] bg-[#f3f0e6] px-5 py-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-[#111111]">
                SQUAD INTEL &amp; PLANNER
              </h2>
              <p className="text-xs text-zinc-600">
                Live weather, trips, schedules, split math &amp; group vote cards
              </p>
            </div>
            <button
              onClick={onClose}
              className="pro-btn rounded-lg px-2.5 py-1 text-xs font-black"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search weather, trip plan, currency split, movies, schedules…"
              className="pro-input flex-1 rounded-xl px-3.5 py-2.5 text-sm font-semibold"
            />
            <button
              onClick={() => search()}
              disabled={loading || !query.trim()}
              className="pro-btn-accent rounded-xl px-4 font-mono text-xs font-black uppercase"
            >
              {loading ? "…" : "SEARCH"}
            </button>
          </div>

          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {VERTICALS.map((v) => {
              const active = vertical === v.id;
              const auto = vertical === "auto" && v.id === guessed;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    sounds.playPop();
                    setVertical(v.id);
                    if (query.trim()) search(query, v.id);
                  }}
                  className={`shrink-0 rounded-lg border-[1.5px] border-[#111111] px-2.5 py-1 text-xs font-bold transition ${
                    active
                      ? "bg-[#111111] text-white"
                      : auto
                      ? "bg-[#ffe500] text-[#111111]"
                      : "bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {v.icon} {v.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="chat-scroll flex-1 overflow-y-auto bg-[#f7f5ee] p-4 sm:p-5">
          {!card && !loading && (
            <div>
              <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-wider text-zinc-500">
                QUICK TEMPLATES
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SEARCH_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setQuery(p.query);
                      search(p.query, "auto");
                    }}
                    className="pro-btn rounded-xl px-3.5 py-2.5 text-left text-xs font-bold"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="py-12 text-center font-mono text-xs font-black uppercase text-zinc-600">
              Fetching live intel…
            </div>
          )}

          {composedCard && !loading && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {REFINERS.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      const q2 = `${query} ${r}`.trim();
                      setQuery(q2);
                      search(q2, vertical);
                    }}
                    className="rounded-lg border border-[#111111] bg-white px-2.5 py-1 text-[11px] font-bold hover:bg-[#ffe500]"
                  >
                    + {r}
                  </button>
                ))}
              </div>

              <SearchCardView card={composedCard} preview />

              <div className="pro-panel space-y-2.5 rounded-xl p-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={askVote}
                      onChange={(e) => setAskVote(e.target.checked)}
                      className="accent-[#111111]"
                    />
                    Include squad vote buttons
                  </label>
                  {composedCard.splitEstimate && (
                    <div className="ml-auto flex items-center gap-1.5 text-xs font-bold">
                      <span>Split by:</span>
                      {[2, 3, 4, 6].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setPaxCount(n)}
                          className={`rounded border border-[#111111] px-2 py-0.5 font-mono text-xs ${
                            paxCount === n ? "bg-[#111111] text-white" : "bg-white"
                          }`}
                        >
                          {n}p
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note for the lobby…"
                  className="pro-input w-full rounded-lg px-3 py-1.5 text-xs font-semibold"
                />
                <button
                  onClick={() => {
                    sounds.playSend();
                    onShare(composedCard);
                  }}
                  className="pro-btn-accent w-full rounded-xl py-2.5 font-mono text-xs font-black uppercase"
                >
                  POST INTEL CARD TO CHAT →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
