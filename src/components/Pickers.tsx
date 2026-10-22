import { useMemo, useState } from "react";
import { EMOJI_GROUPS, GIFS, GIF_CATEGORIES, gifUrl } from "../lib/data";
import {
  DESI_STICKERS,
  SOUNDBOARD_ITEMS,
  renderDesiStickerUrl,
} from "../lib/desiStickers";
import { sounds, type SoundDropId } from "../lib/audio";

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
      return JSON.parse(
        localStorage.getItem("chatarena_recent_emojis") ||
          '["🙏","🔥","🤣","☕","🥟","👑","😎","🏏","🛺","💸"]'
      );
    } catch {
      return ["🙏", "🔥", "🤣", "☕", "🥟", "👑", "😎", "🏏"];
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
    <div className="absolute bottom-full left-0 z-40 mb-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-amber-500/30 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
      {/* Header Search */}
      <div className="flex items-center gap-2 border-b border-white/10 p-2.5">
        <span className="text-sm text-amber-300">🇮🇳</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="इमोजी खोजें… (chai, samosa, bhaukaal, binod, dhol)"
          className="w-full rounded-xl bg-slate-800/80 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-amber-400"
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
        <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-slate-950/40 px-2.5 py-1.5">
          <span className="shrink-0 text-[10px] font-bold uppercase text-amber-400/90">
            पसंदीदा:
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
              className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                i === tab
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md"
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
            <p className="text-2xl">🧐</p>
            <p className="mt-1 text-xs text-slate-400">"{q}" का कोई इमोजी नहीं मिला</p>
          </div>
        )}
      </div>
    </div>
  );
}

const DESI_CATS = [
  { id: "all", label: "सब मीम्स", icon: "🔥" },
  { id: "bhaukaal", label: "भौकाल UP", icon: "👑" },
  { id: "bollywood", label: "फिल्मी", icon: "🎬" },
  { id: "ncr", label: "दिल्ली-NCR", icon: "🛺" },
  { id: "chai", label: "चाय/पार्टी", icon: "☕" },
];

export function GifPicker({
  onPick,
  onClose,
}: {
  onPick: (urlOrId: string, label: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"desi" | "giphy">("desi");
  const [q, setQ] = useState("");
  const [desiCat, setDesiCat] = useState<string>("all");
  const [giphyCat, setGiphyCat] = useState<string>("all");

  const desiResults = useMemo(() => {
    let pool = DESI_STICKERS;
    if (desiCat !== "all") {
      pool = pool.filter((s) => s.category === desiCat);
    }
    const needle = q.trim().toLowerCase();
    if (!needle) return pool;
    return pool.filter((s) =>
      `${s.line1} ${s.line2} ${s.sub} ${s.tags}`.toLowerCase().includes(needle)
    );
  }, [q, desiCat]);

  const giphyResults = useMemo(() => {
    let pool = GIFS;
    if (giphyCat !== "all") {
      pool = pool.filter((g) => g.category === giphyCat);
    }
    const needle = q.trim().toLowerCase();
    if (!needle) return pool;
    return pool.filter((g) =>
      (g.tags + " " + g.label).toLowerCase().includes(needle)
    );
  }, [q, giphyCat]);

  return (
    <div className="absolute bottom-full left-0 z-40 mb-2 w-[30rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-amber-500/35 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
      {/* Top Mode Switcher: Desi Memes vs Animated GIPHY */}
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-slate-950/70 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            sounds.playPop();
            setMode("desi");
          }}
          className={`flex-1 rounded-xl py-1.5 text-xs font-black transition ${
            mode === "desi"
              ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md"
              : "bg-slate-800/80 text-slate-300 hover:text-white"
          }`}
        >
          🇮🇳 देसी मीम स्टीकर (16)
        </button>
        <button
          type="button"
          onClick={() => {
            sounds.playPop();
            setMode("giphy");
          }}
          className={`flex-1 rounded-xl py-1.5 text-xs font-black transition ${
            mode === "giphy"
              ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md"
              : "bg-slate-800/80 text-slate-300 hover:text-white"
          }`}
        >
          🎬 Animated GIFs (50+)
        </button>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-sm">{mode === "desi" ? "🔥" : "🎬"}</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            mode === "desi"
              ? "मीम खोजें… (binod, jalwa, 150, chai, chappal, systumm)"
              : "Search animated GIFs… (dance, hype, lol, gaming)"
          }
          className="w-full rounded-xl bg-slate-800/80 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-amber-400"
        />
      </div>

      {mode === "desi" ? (
        <>
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2.5 py-1.5">
            {DESI_CATS.map((c) => (
              <button
                key={c.id}
                onClick={() => setDesiCat(c.id)}
                className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                  desiCat === c.id
                    ? "bg-amber-500/25 border border-amber-400/50 text-amber-200"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span className="mr-1">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid max-h-72 grid-cols-2 gap-2.5 overflow-y-auto p-3">
            {desiResults.map((s) => {
              const dataUrl = renderDesiStickerUrl(s);
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    sounds.playPop();
                    onPick(dataUrl, `${s.emoji} ${s.line1} ${s.line2}`);
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950 text-left shadow-md transition hover:scale-[1.03] hover:border-amber-400 active:scale-95"
                >
                  <img
                    src={dataUrl}
                    alt={`${s.line1} ${s.line2}`}
                    className="h-28 w-full object-cover"
                  />
                </button>
              );
            })}
            {desiResults.length === 0 && (
              <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                "{q}" वाला कोई स्टीकर नहीं मिला भाई 😅
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-1.5">
            {GIF_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setGiphyCat(c.id)}
                className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                  giphyCat === c.id
                    ? "bg-violet-600 text-white shadow-md shadow-violet-900/50"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span className="mr-1">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto p-2.5 sm:grid-cols-3">
            {giphyResults.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  sounds.playPop();
                  onPick(gifUrl(g.id), g.label);
                }}
                className="group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-800 transition hover:scale-[1.03] hover:border-violet-400"
              >
                <img
                  src={gifUrl(g.id)}
                  alt={g.label}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 py-1 text-left text-[10px] font-bold text-white">
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function SoundboardPicker({
  onTrigger,
  onClose,
}: {
  onTrigger: (soundId: SoundDropId, label: string, shoutout: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-full left-0 z-40 mb-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-amber-500/40 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-amber-950/75 via-slate-900 to-orange-950/65 px-4 py-2.5">
        <div>
          <p className="text-xs font-black text-amber-300">
            📯 लाइव देसी साउंडबोर्ड (Live Audio Drop)
          </p>
          <p className="text-[10px] text-slate-300">
            दबाते ही ग्रुप में सबके फोन पर लाइव आवाज़ बजेगी! 🔥
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        {SOUNDBOARD_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onTrigger(item.id, item.label, item.shoutout)}
            className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-slate-800/80 p-3 text-left transition hover:border-amber-400/60 hover:bg-slate-800 active:scale-95"
          >
            <span className="text-2xl">{item.emoji}</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-white">
                {item.label}
              </p>
              <p className="truncate text-[10px] text-amber-200/80">
                {item.shoutout}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
