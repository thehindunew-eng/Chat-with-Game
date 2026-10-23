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
        localStorage.getItem("arena_pro_emojis") ||
          '["🏆","🎯","⚔️","🔥","👑","🎮","⚡","🤝"]'
      );
    } catch {
      return ["🏆", "🎯", "⚔️", "🔥", "👑", "🎮", "⚡", "🤝"];
    }
  });

  const handlePick = (emoji: string) => {
    sounds.playPop();
    const updated = [emoji, ...recent.filter((x) => x !== emoji)].slice(0, 12);
    setRecent(updated);
    try {
      localStorage.setItem("arena_pro_emojis", JSON.stringify(updated));
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
    <div className="pro-card absolute bottom-full left-0 z-40 mb-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b-2 border-[#111111] bg-[#f3f0e6] p-2.5">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search emojis… (gg, trophy, aim, fire)"
          className="pro-input w-full rounded-lg px-3 py-1.5 text-xs font-semibold"
        />
        <button
          onClick={onClose}
          className="pro-btn rounded-lg px-2 py-1 text-xs font-black"
        >
          ✕
        </button>
      </div>

      {!q && recent.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-2.5 py-1.5">
          <span className="shrink-0 font-mono text-[10px] font-black uppercase text-zinc-500">
            RECENT:
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

      {!q && (
        <div className="flex gap-1 overflow-x-auto border-b-2 border-[#111111] bg-[#f7f5ee] px-2 py-1.5">
          {EMOJI_GROUPS.map((g, i) => (
            <button
              key={g.label}
              onClick={() => setTab(i)}
              title={g.label}
              className={`shrink-0 rounded-lg border border-[#111111] px-2 py-0.5 text-xs font-bold transition ${
                i === tab
                  ? "bg-[#111111] text-white"
                  : "bg-white text-[#111111] hover:bg-[#ffe500]"
              }`}
            >
              {g.icon}
            </button>
          ))}
        </div>
      )}

      <div className="chat-scroll grid max-h-56 grid-cols-8 gap-1 overflow-y-auto bg-white p-2.5">
        {results.map(([emoji, tags], i) => (
          <button
            key={emoji + i}
            onClick={() => handlePick(emoji)}
            title={tags}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-[#f3f0e6]"
          >
            {emoji}
          </button>
        ))}
        {results.length === 0 && (
          <div className="col-span-8 py-6 text-center text-xs font-semibold text-zinc-500">
            No matching emojis for "{q}"
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
  onPick: (urlOrId: string, label: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"callouts" | "giphy">("callouts");
  const [q, setQ] = useState("");
  const [giphyCat, setGiphyCat] = useState<string>("all");

  const calloutResults = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return DESI_STICKERS;
    return DESI_STICKERS.filter((s) =>
      `${s.line1} ${s.line2} ${s.tags}`.toLowerCase().includes(needle)
    );
  }, [q]);

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
    <div className="pro-card absolute bottom-full left-0 z-40 mb-2 w-[28rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl">
      <div className="flex items-center gap-1.5 border-b-2 border-[#111111] bg-[#f3f0e6] p-2">
        <button
          type="button"
          onClick={() => setMode("callouts")}
          className={`flex-1 rounded-lg border-[1.5px] border-[#111111] py-1 font-mono text-xs font-black transition ${
            mode === "callouts"
              ? "bg-[#ffe500] text-[#111111]"
              : "bg-white text-zinc-700"
          }`}
        >
          PRO CALLOUTS
        </button>
        <button
          type="button"
          onClick={() => setMode("giphy")}
          className={`flex-1 rounded-lg border-[1.5px] border-[#111111] py-1 font-mono text-xs font-black transition ${
            mode === "giphy"
              ? "bg-[#111111] text-white"
              : "bg-white text-zinc-700"
          }`}
        >
          ANIMATED GIFS
        </button>
        <button
          onClick={onClose}
          className="pro-btn rounded-lg px-2 py-1 text-xs font-black"
        >
          ✕
        </button>
      </div>

      <div className="border-b-2 border-[#111111] bg-white p-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            mode === "callouts"
              ? "Filter callouts… (gg, clutch, rematch, mvp)"
              : "Search GIFs… (win, gaming, hype, lol)"
          }
          className="pro-input w-full rounded-lg px-3 py-1.5 text-xs font-semibold"
        />
      </div>

      {mode === "callouts" ? (
        <div className="chat-scroll grid max-h-64 grid-cols-2 gap-2.5 overflow-y-auto bg-[#f7f5ee] p-3">
          {calloutResults.map((s) => {
            const dataUrl = renderDesiStickerUrl(s);
            return (
              <button
                key={s.id}
                onClick={() => {
                  sounds.playPop();
                  onPick(dataUrl, `${s.emoji} ${s.line1}`);
                }}
                className="overflow-hidden rounded-xl transition hover:-translate-y-0.5 active:scale-95"
              >
                <img
                  src={dataUrl}
                  alt={s.line1}
                  className="h-24 w-full object-contain"
                />
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-[#f7f5ee] px-2 py-1.5">
            {GIF_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setGiphyCat(c.id)}
                className={`shrink-0 rounded-lg border border-[#111111] px-2 py-0.5 text-[11px] font-bold ${
                  giphyCat === c.id
                    ? "bg-[#111111] text-white"
                    : "bg-white text-zinc-800"
                }`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div className="chat-scroll grid max-h-64 grid-cols-3 gap-2 overflow-y-auto bg-white p-2.5">
            {giphyResults.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  sounds.playPop();
                  onPick(gifUrl(g.id), g.label);
                }}
                className="relative aspect-video overflow-hidden rounded-lg border-2 border-[#111111] bg-zinc-100 transition hover:scale-[1.02]"
              >
                <img
                  src={gifUrl(g.id)}
                  alt={g.label}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
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
    <div className="pro-card absolute bottom-full left-0 z-40 mb-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b-2 border-[#111111] bg-[#f3f0e6] px-3.5 py-2.5">
        <span className="font-mono text-xs font-black uppercase">
          LIVE ROOM SFX PING
        </span>
        <button
          onClick={onClose}
          className="pro-btn rounded-lg px-2 py-0.5 text-xs font-black"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 bg-white p-3">
        {SOUNDBOARD_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onTrigger(item.id, item.label, item.shoutout)}
            className="pro-btn flex items-center gap-2 rounded-xl p-2.5 text-left"
          >
            <span className="text-lg">{item.emoji}</span>
            <span className="truncate font-mono text-xs font-black">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
