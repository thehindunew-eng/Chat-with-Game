import type { GameId } from "../lib/types";
import { GAME_META } from "../lib/types";
import { sounds } from "../lib/audio";

const GROUPS: { label: string; icon: string; ids: GameId[] }[] = [
  { label: "Instant Digital Games & Puzzles", icon: "⚡", ids: ["tictactoe", "connect4", "slide", "wikirace"] },
  { label: "Camera & Social Video Challenges", icon: "🎬", ids: ["controller", "npc", "desk"] },
  { label: "Co-op Missions", icon: "🛡️", ids: ["bomb", "astro", "reactor", "cipher"] },
  { label: "Party, Word & Speed", icon: "🎉", ids: ["chain", "blitz", "codebreak", "story"] },
];

export default function GameLibrary({ onClose, onPick }: { onClose: () => void; onPick: (id: GameId | null) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-violet-500/30 bg-slate-900 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-violet-950/70 via-slate-900 to-fuchsia-950/60 px-5 py-4">
          <span className="text-3xl">🕹️</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black text-white">Squad Arcade</h2>
            <p className="text-xs text-slate-400">Choose a game for everyone online, or let the arena surprise you.</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-800 px-3 py-2 text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <button onClick={() => { sounds.playGameTrigger(); onPick(null); }}
            className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-rose-500/20 p-4 text-left transition hover:border-amber-300 hover:brightness-110 active:scale-[0.99]">
            <span className="text-3xl">🎲</span>
            <div>
              <p className="font-black text-amber-200">Random Squad Game</p>
              <p className="text-xs text-amber-100/70">The classic GAME trigger — instant random mission, no camera required.</p>
            </div>
            <span className="ml-auto text-xl text-amber-300">→</span>
          </button>

          {GROUPS.map((group) => (
            <section key={group.label} className="mb-5 last:mb-0">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{group.icon} {group.label}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.ids.map((id) => {
                  const meta = GAME_META[id];
                  return (
                    <button key={id} onClick={() => { sounds.playPop(); onPick(id); }}
                      className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-800/60 p-3.5 text-left transition hover:border-violet-400/60 hover:bg-slate-800 active:scale-[0.98]">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950/70 text-2xl shadow-inner">{meta.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-black text-white">{meta.name}</span>
                          <span className="ml-auto shrink-0 rounded bg-black/25 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">{meta.minutes}</span>
                        </span>
                        <span className="mt-1 block text-[11px] leading-snug text-slate-400">{meta.blurb}</span>
                        <span className="mt-1.5 inline-block rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold text-violet-300">{meta.tag}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="border-t border-white/10 bg-slate-950/80 px-5 py-3 text-center text-[11px] text-slate-400">
          🔒 Starting a game locks the main chat · Everyone online joins automatically · Video games only record after your explicit camera tap
        </div>
      </div>
    </div>
  );
}