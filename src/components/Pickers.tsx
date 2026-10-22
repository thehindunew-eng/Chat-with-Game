import { useMemo, useState } from "react";
import { EMOJI_GROUPS, GIFS, GIF_CATEGORIES, gifUrl } from "../lib/data";
import { sounds } from "../lib/audio";

export function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (e: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("chatarena_recent_emojis") || '["😀","😂","🔥","❤️","👍","🎉","🎮","✈️"]');
    } catch {
      return ["😀","😂","🔥","❤️","👍","🎉","🎮","✈️"];
    }
  });

  const handlePick = (emoji: string) => {
    sounds.playPop();
    const updated = [emoji, ...recent.filter((x) => x !== emoji)].slice(0, 16);
    setRecent(updated);
    try {
      localStorage.setItem("chatarena_recent_emojis", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    onPick(emoji);
  };

  const results = useMemo(() => {
    if (!q.trim()) return EMOJI_GROUPS[tab].emojis;
    const needle = q.toLowerCase();
    return EMOJI_GROUPS.flatMap((g) => g.emojis).filter(([, tags]) =>
      tags.includes(needle)
    );
  }, [q, tab]);

  return (
    <div className="absolute bottom-full left-0 z-40 mb-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
      {/* Header Search */}
      <div className="flex items-center gap-2 border-b border-white/10 p-2.5">
        <span className="text-sm text-slate-400">🔍</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 350+ emojis… (fire, pizza, clap, heart, win)"
          className="w-full rounded-xl bg-slate-800/80 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-violet-400"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        )}
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Quick Recents row */}
      {!q && recent.length > 0 && (
        <div className="flex items-center gap-1 border-b border-white/10 bg-slate-950/40 px-2.5 py-1.5 overflow-x-auto">
          <span className="shrink-0 text-[10px] font-bold uppercase text-slate-500">
            Recent:
          </span>
          {recent.map((e, i) => (
            <button
              key={i}
              onClick={() => handlePick(e)}
              className="shrink-0 text-base transition hover:scale-125"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Category Tabs */}
      {!q && (
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-1.5">
          {EMOJI_GROUPS.map((g, i) => (
            <button
              key={g.label}
              onClick={() => setTab(i)}
              title={g.label}
              className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                i === tab
                  ? "bg-violet-600 text-white shadow-md shadow-violet-900/50"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="mr-1">{g.icon}</span>
              <span className="hidden sm:inline">{g.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="grid max-h-60 grid-cols-8 gap-1 overflow-y-auto p-2.5 sm:grid-cols-9">
        {results.map(([emoji, tags], i) => (
          <button
            key={emoji + i}
            onClick={() => handlePick(emoji)}
            title={tags}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-xl transition hover:scale-125 hover:bg-slate-800/80 active:scale-95"
          >
            {emoji}
          </button>
        ))}
        {results.length === 0 && (
          <div className="col-span-8 py-8 text-center sm:col-span-9">
            <p className="text-2xl">🔍</p>
            <p className="mt-1 text-xs text-slate-400">No emojis found for "{q}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function GifPicker({
  onPick,
  onClose,
}: {
  onPick: (id: string, label: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const results = useMemo(() => {
    let pool = GIFS;
    if (cat !== "all") {
      pool = pool.filter((g) => g.category === cat);
    }
    const needle = q.trim().toLowerCase();
    if (!needle) return pool;
    return pool.filter((g) =>
      (g.tags + " " + g.label).toLowerCase().includes(needle)
    );
  }, [q, cat]);

  return (
    <div className="absolute bottom-full left-0 z-40 mb-2 w-[28rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
      {/* Header Search */}
      <div className="flex items-center gap-2 border-b border-white/10 p-2.5">
        <span className="text-sm text-slate-400">🎬</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 50+ animated GIFs… (cat, party, hype, lol)"
          className="w-full rounded-xl bg-slate-800/80 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-violet-400"
        />
        <span className="shrink-0 rounded-lg bg-slate-800 px-2 py-0.5 text-[9px] font-black uppercase text-slate-400">
          GIPHY
        </span>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-1.5">
        {GIF_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCat(c.id);
            }}
            className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
              cat === c.id
                ? "bg-violet-600 text-white shadow-md shadow-violet-900/50"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <span className="mr-1">{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* GIF Grid */}
      <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto p-2.5 sm:grid-cols-3">
        {results.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              sounds.playPop();
              onPick(g.id, g.label);
            }}
            className="group relative h-28 overflow-hidden rounded-2xl bg-slate-950 transition hover:ring-2 hover:ring-violet-400 active:scale-95"
            title={g.label}
          >
            <img
              src={gifUrl(g.id)}
              alt={g.label}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2 pb-1.5 pt-4 text-left text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100">
              {g.label}
            </span>
          </button>
        ))}
        {results.length === 0 && (
          <div className="col-span-2 py-8 text-center sm:col-span-3">
            <p className="text-3xl">🍿</p>
            <p className="mt-1 text-xs text-slate-400">
              No GIFs found for "{q}" in this category
            </p>
          </div>
        )}
      </div>
    </div>
  );
}