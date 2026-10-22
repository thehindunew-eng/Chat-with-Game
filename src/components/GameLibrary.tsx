import type { GameId } from "../lib/types";
import { GAME_META } from "../lib/types";
import { sounds } from "../lib/audio";

const GROUPS: { label: string; icon: string; highlight?: boolean; ids: GameId[] }[] = [
  {
    label: "🇮🇳 UP & दिल्ली भौकाल स्पेशल (NEW!)",
    icon: "🔥",
    highlight: true,
    ids: ["dialogue", "golgappa", "bargain"],
  },
  {
    label: "तुरंत दिमागी & बोर्ड मुकाबले",
    icon: "⚡",
    ids: ["tictactoe", "connect4", "slide", "wikirace"],
  },
  {
    label: "पलटन को-ऑप मिशन (सब साथ खेलें)",
    icon: "🛡️",
    ids: ["bomb", "astro", "reactor", "cipher"],
  },
  {
    label: "मस्ती, गपशप & स्पीड अड्डा",
    icon: "🎉",
    ids: ["chain", "blitz", "codebreak", "story"],
  },
  {
    label: "लाइव कैमरा & वीडियो भौकाल",
    icon: "🎬",
    ids: ["controller", "npc", "desk"],
  },
];

export default function GameLibrary({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (id: GameId | null) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-amber-500/35 bg-slate-900 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-orange-950/75 via-slate-900 to-emerald-950/65 px-5 py-4">
          <span className="text-3xl">🕹️</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black text-white">
              देसी पलटन आर्केड <span className="text-xs font-extrabold text-amber-300">(18 लाइव गेम्स)</span>
            </h2>
            <p className="text-xs text-slate-300">
              कोई भी गेम चुनते ही पूरे ग्रुप के फोन पे एक साथ चालू होगा — हारने वाला समोसा पार्टी देगा! 🥟🔥
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-3 py-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <button
            onClick={() => {
              sounds.playGameTrigger();
              onPick(null);
            }}
            className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-rose-500/20 p-4 text-left transition hover:border-amber-300 hover:brightness-110 active:scale-[0.99]"
          >
            <span className="text-3xl">🎲</span>
            <div>
              <p className="font-black text-amber-200">
                किस्मत का पिटारा — कोई भी सरप्राइज़ गेम चलाओ!
              </p>
              <p className="text-xs text-amber-100/80">
                चैट में <b className="font-mono text-white">GAME</b> लिखने जैसा ही तुरंत सरप्राइज़ मुकाबला!
              </p>
            </div>
            <span className="ml-auto text-xl text-amber-300">→</span>
          </button>

          {GROUPS.map((group) => (
            <section key={group.label} className="mb-5 last:mb-0">
              <p
                className={`mb-2 text-[11px] font-black uppercase tracking-wider ${
                  group.highlight ? "text-amber-300" : "text-slate-400"
                }`}
              >
                {group.icon} {group.label}
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {group.ids.map((id) => {
                  const meta = GAME_META[id];
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        sounds.playPop();
                        onPick(id);
                      }}
                      className={`group flex items-start gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.98] ${
                        group.highlight
                          ? "border-amber-400/40 bg-gradient-to-br from-amber-950/45 via-slate-900 to-orange-950/35 hover:border-amber-300 shadow-lg shadow-amber-950/20"
                          : "border-white/10 bg-slate-800/60 hover:border-violet-400/60 hover:bg-slate-800"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950/80 text-2xl shadow-inner">
                        {meta.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-black text-white">
                            {meta.name}
                          </span>
                          <span className="ml-auto shrink-0 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[9px] text-amber-200/90">
                            {meta.minutes}
                          </span>
                        </span>
                        <span className="mt-1 block text-[11px] leading-snug text-slate-300">
                          {meta.blurb}
                        </span>
                        <span
                          className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            group.highlight
                              ? "bg-amber-500/20 text-amber-200"
                              : "bg-violet-500/15 text-violet-300"
                          }`}
                        >
                          {meta.tag}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="border-t border-white/10 bg-slate-950/85 px-5 py-3 text-center text-[11px] text-slate-400">
          🔒 गेम चालू होते ही चैट लॉक · सारे ऑनलाइन दोस्त अपने-आप जुड़ेंगे · 🇮🇳 UP-दिल्ली स्पेशल
        </div>
      </div>
    </div>
  );
}
