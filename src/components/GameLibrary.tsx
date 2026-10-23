import { useState } from "react";
import type { GameId } from "../lib/types";
import { GAME_META } from "../lib/types";
import { sounds } from "../lib/audio";

const GROUPS: { label: string; ids: GameId[] }[] = [
  {
    label: "PRO COMPETITIVE MODES",
    ids: ["aimlab", "sector", "duel"],
  },
  {
    label: "1v1 & SPEED PUZZLES",
    ids: ["tictactoe", "connect4", "slide", "wikirace"],
  },
  {
    label: "SQUAD CO-OP MISSIONS",
    ids: ["bomb", "astro", "reactor", "cipher"],
  },
  {
    label: "PARTY & APM RELAYS",
    ids: ["chain", "blitz", "codebreak", "story"],
  },
  {
    label: "CAMERA CHALLENGES",
    ids: ["controller", "npc", "desk"],
  },
];

export default function GameLibrary({
  onClose,
  onPick,
  onPostLobby,
  defaultQueueMode = false,
}: {
  onClose: () => void;
  onPick: (id: GameId | null) => void;
  onPostLobby?: (id: GameId) => void;
  defaultQueueMode?: boolean;
}) {
  const [launchMode, setLaunchMode] = useState<"instant" | "lobby">(
    defaultQueueMode ? "lobby" : "instant"
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="pro-card flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Crisp Header */}
        <div className="flex flex-wrap items-center gap-3 border-b-2 border-[#111111] bg-[#f3f0e6] px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black tracking-tight text-[#111111]">
              ARCADE MODE SELECT
            </h2>
            <p className="text-xs font-medium text-zinc-600">
              {launchMode === "lobby"
                ? "Post a Ready-Check Challenge card to chat so players ready up first."
                : "Instant launch locks chat and drops all online players into the match."}
            </p>
          </div>

          {onPostLobby && (
            <div className="flex rounded-xl border-2 border-[#111111] bg-white p-0.5">
              <button
                type="button"
                onClick={() => setLaunchMode("instant")}
                className={`rounded-lg px-3 py-1 font-mono text-[11px] font-black transition ${
                  launchMode === "instant"
                    ? "bg-[#111111] text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                INSTANT START
              </button>
              <button
                type="button"
                onClick={() => setLaunchMode("lobby")}
                className={`rounded-lg px-3 py-1 font-mono text-[11px] font-black transition ${
                  launchMode === "lobby"
                    ? "bg-[#ffe500] text-[#111111]"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                READY CHECK
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="pro-btn rounded-lg px-2.5 py-1 text-xs font-black"
          >
            ✕
          </button>
        </div>

        {/* Mode Grid */}
        <div className="chat-scroll min-h-0 flex-1 overflow-y-auto bg-[#f7f5ee] p-4 sm:p-5">
          <button
            onClick={() => {
              sounds.playGameTrigger();
              onPick(null);
            }}
            className="pro-btn-accent mb-5 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left"
          >
            <span className="text-2xl">🎲</span>
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-wider">
                RANDOM RANKED ROTATION
              </p>
              <p className="text-xs font-medium text-zinc-800">
                Instant mystery mode for everyone online (same as typing GAME)
              </p>
            </div>
            <span className="ml-auto font-mono text-sm font-black">PLAY →</span>
          </button>

          {GROUPS.map((group) => (
            <section key={group.label} className="mb-5 last:mb-0">
              <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {group.label}
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {group.ids.map((id) => {
                  const meta = GAME_META[id];
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        sounds.playPop();
                        if (launchMode === "lobby" && onPostLobby) {
                          onPostLobby(id);
                        } else {
                          onPick(id);
                        }
                      }}
                      className="pro-btn flex items-start gap-3 rounded-xl p-3.5 text-left"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-[#111111] bg-[#f3f0e6] text-xl">
                        {meta.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-black text-[#111111]">
                            {meta.name}
                          </span>
                          <span className="ml-auto shrink-0 rounded border border-[#111111] bg-[#f3f0e6] px-1.5 py-0.5 font-mono text-[10px] font-bold">
                            {meta.minutes}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-snug text-zinc-600">
                          {meta.blurb}
                        </span>
                        <span className="mt-1.5 inline-block rounded border border-[#111111] bg-[#ffe500]/60 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase">
                          {launchMode === "lobby" ? "POST READY CHECK" : meta.tag}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
