import { useEffect, useState } from "react";
import type { GameProps } from "./CoopGames";
import { bumpScore, currentPlayer, feed, isMyTurn } from "../../lib/gameSync";
import {
  c4DropRow,
  c4Winner,
  slideNeighbors,
  slideSolved,
  tttWinner,
  type Mark,
} from "../../lib/classic";
import { sounds } from "../../lib/audio";

function TurnBar({ g, me, label }: GameProps & { label?: string }) {
  const player = currentPlayer(g);
  const mine = player?.uid === me.id;
  return (
    <div
      className={`mb-3 flex items-center gap-2.5 rounded-2xl border px-3.5 py-2 text-xs font-bold shadow ${
        mine
          ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
          : "border-white/10 bg-slate-800/80 text-slate-300"
      }`}
    >
      {player && (
        <img
          src={player.avatar}
          alt=""
          className="h-6 w-6 rounded-full border border-white/20 object-cover"
        />
      )}
      <span>
        {mine ? "🫵 Your move" : `${player?.name}'s move`}
        {label ? ` · ${label}` : ""}
      </span>
      <span className="ml-auto rounded-lg bg-black/35 px-2.5 py-0.5 font-mono text-[10px] tracking-wider">
        {g.turn % 2 === 0 ? "TEAM X / RED" : "TEAM O / GOLD"}
      </span>
    </div>
  );
}

export function TicTacToeGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as {
    board: Mark[];
    moves: number;
    winner: number[] | null;
    lastIdx?: number;
  };
  const mine = isMyTurn(g, me.id);
  const mark = (g.turn % 2) as 0 | 1;

  const play = (index: number) => {
    if (!mine || d.board[index] !== null || d.winner) return;
    const board = [...d.board];
    board[index] = mark;
    const won = tttWinner(board);
    const moves = d.moves + 1;
    sounds.playClack();
    mutate((cur) =>
      bumpScore(
        {
          ...cur,
          turn: (cur.turn + 1) % cur.players.length,
          data: {
            ...cur.data,
            board,
            moves,
            lastIdx: index,
            winner: won?.line || null,
          },
        },
        me.id,
        won ? 5 : 1
      )
    );
    if (won) {
      sounds.playSuccess();
      finish(
        `${me.name} completed a winning ${
          mark === 0 ? "X" : "O"
        } line — ${mark === 0 ? "Team X" : "Team O"} wins Tic-Tac-Toe ⭕`
      );
    } else if (moves === 9) {
      finish("the shared Tic-Tac-Toe board ended in a clean draw 🤝");
    }
  };

  return (
    <div>
      <TurnBar
        g={g}
        me={me}
        mutate={mutate}
        finish={finish}
        label={mark === 0 ? "Neon Cyan X" : "Coral Rose O"}
      />
      <div className="mx-auto w-full max-w-[310px] rounded-3xl border border-white/15 bg-gradient-to-b from-slate-800/90 to-slate-950 p-3 shadow-2xl">
        <div className="grid grid-cols-3 gap-2.5">
          {d.board.map((cell, i) => {
            const isWin = d.winner?.includes(i);
            const isLast = d.lastIdx === i;
            return (
              <button
                key={i}
                onClick={() => play(i)}
                disabled={!mine || cell !== null}
                className={`group relative flex aspect-square items-center justify-center rounded-2xl border text-5xl font-black shadow-inner transition active:scale-95 ${
                  isWin
                    ? "border-emerald-400 bg-emerald-500/25 shadow-lg shadow-emerald-500/20"
                    : isLast
                    ? "border-violet-400/50 bg-slate-900/95"
                    : "border-white/10 bg-slate-900/80 hover:border-violet-400/60 hover:bg-slate-800/90"
                }`}
              >
                {cell === 0 && (
                  <svg viewBox="0 0 64 64" className="h-12 w-12 drop-shadow-[0_0_10px_rgba(34,211,238,0.65)]">
                    <line
                      x1="15"
                      y1="15"
                      x2="49"
                      y2="49"
                      stroke="#22d3ee"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                    <line
                      x1="49"
                      y1="15"
                      x2="15"
                      y2="49"
                      stroke="#22d3ee"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {cell === 1 && (
                  <svg viewBox="0 0 64 64" className="h-12 w-12 drop-shadow-[0_0_10px_rgba(251,113,133,0.65)]">
                    <circle
                      cx="32"
                      cy="32"
                      r="17"
                      fill="none"
                      stroke="#fb7185"
                      strokeWidth="7"
                    />
                  </svg>
                )}
                {cell === null && mine && (
                  <span className="text-3xl font-black text-white/0 transition group-hover:text-white/20">
                    {mark === 0 ? "✕" : "○"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">
        {d.moves}/9 squares played · Live synced across every connected device.
      </p>
    </div>
  );
}

export function Connect4Game({ g, me, mutate, finish }: GameProps) {
  const d = g.data as {
    board: Mark[][];
    moves: number;
    winner: [number, number][] | null;
    lastMove?: [number, number];
  };
  const mine = isMyTurn(g, me.id);
  const mark = (g.turn % 2) as 0 | 1;
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const play = (col: number) => {
    if (!mine || d.winner) return;
    const row = c4DropRow(d.board, col);
    if (row < 0) return;
    const board = d.board.map((r) => [...r]);
    board[row][col] = mark;
    const won = c4Winner(board, row, col, mark);
    const moves = d.moves + 1;
    sounds.playClack();
    mutate((cur) =>
      bumpScore(
        {
          ...cur,
          turn: (cur.turn + 1) % cur.players.length,
          data: {
            ...cur.data,
            board,
            moves,
            lastMove: [row, col],
            winner: won || null,
          },
        },
        me.id,
        won ? 6 : 1
      )
    );
    if (won) {
      sounds.playSuccess();
      finish(
        `${me.name} dropped the winning ${
          mark === 0 ? "crimson" : "gold"
        } disc — ${mark === 0 ? "Red" : "Gold"} team wins Connect Four 🔴`
      );
    } else if (moves === 42) {
      finish("Connect Four filled all 42 slots — squad draw 🤝");
    }
  };

  return (
    <div>
      <TurnBar
        g={g}
        me={me}
        mutate={mutate}
        finish={finish}
        label={mark === 0 ? "Crimson Disc" : "Solar Gold Disc"}
      />

      {/* Hovering preview slot row */}
      <div className="mx-auto max-w-[430px] px-3">
        <div className="mb-1.5 grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, col) => {
            const canDrop = mine && c4DropRow(d.board, col) >= 0;
            const active = hoverCol === col && canDrop;
            return (
              <button
                key={col}
                onClick={() => play(col)}
                disabled={!canDrop}
                onMouseEnter={() => setHoverCol(col)}
                onMouseLeave={() => setHoverCol(null)}
                className="flex h-7 items-center justify-center rounded-xl transition disabled:opacity-20"
              >
                {active ? (
                  <span
                    className={`h-6 w-6 rounded-full shadow-lg ${
                      mark === 0
                        ? "bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/40"
                        : "bg-gradient-to-br from-amber-200 to-amber-500 shadow-amber-400/40"
                    }`}
                  />
                ) : (
                  <span className="text-[11px] font-black text-blue-300/60">
                    ▼
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Physical Beveled Royal-Blue Rack */}
      <div className="mx-auto max-w-[430px] rounded-3xl border-2 border-blue-400/40 bg-gradient-to-b from-blue-800 via-blue-900 to-indigo-950 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.9),inset_0_2px_4px_rgba(255,255,255,0.25)]">
        <div className="grid grid-cols-7 gap-2">
          {d.board.flatMap((row, r) =>
            row.map((cell, c) => {
              const winning = d.winner?.some(([wr, wc]) => wr === r && wc === c);
              const isNew =
                d.lastMove && d.lastMove[0] === r && d.lastMove[1] === c;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => play(c)}
                  disabled={!mine}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-full border-2 shadow-[inset_0_4px_10px_rgba(0,0,0,0.85)] transition ${
                    hoverCol === c && mine && cell === null
                      ? "border-blue-400/60 bg-slate-900/90"
                      : "border-blue-950 bg-slate-950/95"
                  }`}
                >
                  {cell !== null && (
                    <span
                      className={`h-[88%] w-[88%] rounded-full border shadow-inner ${
                        isNew ? "disc-drop" : ""
                      } ${
                        winning
                          ? "ring-4 ring-emerald-300 brightness-110"
                          : ""
                      } ${
                        cell === 0
                          ? "border-rose-300/60 bg-gradient-to-br from-rose-400 via-red-600 to-rose-900"
                          : "border-amber-100/70 bg-gradient-to-br from-fde047 via-amber-400 to-amber-700"
                      }`}
                      style={
                        cell === 1
                          ? {
                              background:
                                "radial-gradient(circle at 32% 28%, #fef08a 0%, #f59e0b 62%, #b45309 100%)",
                            }
                          : {
                              background:
                                "radial-gradient(circle at 32% 28%, #fda4af 0%, #e11d48 60%, #881337 100%)",
                            }
                      }
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
        {/* Molded table stand feet */}
        <div className="mt-2.5 flex justify-between px-2">
          <div className="h-2 w-12 rounded-full bg-blue-950/90" />
          <div className="h-2 w-12 rounded-full bg-blue-950/90" />
        </div>
      </div>

      <p className="mt-2.5 text-center text-xs text-slate-400">
        {d.moves}/42 discs dropped · Tap any column to drop a disc with gravity.
      </p>
    </div>
  );
}

export function SlidingPuzzleGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as { board: number[]; size: number; moves: number };
  const mine = isMyTurn(g, me.id);
  const blank = d.board.indexOf(0);
  const movable = slideNeighbors(blank, d.size);
  const player = currentPlayer(g);

  const move = (index: number) => {
    if (!mine || !movable.includes(index)) return;
    const board = [...d.board];
    [board[blank], board[index]] = [board[index], board[blank]];
    const moves = d.moves + 1;
    sounds.playClack();
    mutate((cur) =>
      feed(
        bumpScore(
          {
            ...cur,
            turn: (cur.turn + 1) % cur.players.length,
            data: { ...cur.data, board, moves },
          },
          me.id,
          1
        ),
        {
          name: me.name,
          text: `slid tile ${d.board[index]} · move ${moves}`,
          ts: Date.now(),
          sys: true,
        }
      )
    );
    if (slideSolved(board)) {
      sounds.playSuccess();
      finish(
        `the squad restored the sliding grid in ${moves} coordinated moves 🧩 (${me.name} placed the final tile)`
      );
    }
  };

  // Support physical keyboard arrows when it's your turn
  useEffect(() => {
    if (!mine) return;
    const onKey = (e: KeyboardEvent) => {
      const row = Math.floor(blank / d.size);
      const col = blank % d.size;
      let target = -1;
      if (e.key === "ArrowUp" && row < d.size - 1) target = blank + d.size;
      if (e.key === "ArrowDown" && row > 0) target = blank - d.size;
      if (e.key === "ArrowLeft" && col < d.size - 1) target = blank + 1;
      if (e.key === "ArrowRight" && col > 0) target = blank - 1;
      if (target >= 0) {
        e.preventDefault();
        move(target);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, blank, d.board]);

  return (
    <div>
      <div
        className={`mb-3 flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold ${
          mine
            ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
            : "border-white/10 bg-slate-800/70"
        }`}
      >
        {player && (
          <img
            src={player.avatar}
            alt=""
            className="h-6 w-6 rounded-full object-cover"
          />
        )}
        {mine
          ? "Your turn — tap a glowing tile or use arrow keys"
          : `${player?.name} is sliding the next tile`}
        <span className="ml-auto font-mono">{d.moves} moves</span>
      </div>
      <div className="mx-auto grid w-full max-w-[330px] grid-cols-3 gap-2.5 rounded-3xl border border-white/15 bg-slate-950/90 p-3 shadow-2xl">
        {d.board.map((tile, i) => {
          const inHome = tile !== 0 && tile === i + 1;
          const canSlide = movable.includes(i) && mine;
          return (
            <button
              key={i}
              onClick={() => move(i)}
              disabled={!canSlide || tile === 0}
              className={`relative flex aspect-square items-center justify-center rounded-2xl border text-3xl font-black transition active:scale-95 ${
                tile === 0
                  ? "border-dashed border-white/10 bg-slate-950/50 text-transparent shadow-inner"
                  : canSlide
                  ? "border-violet-300/70 bg-gradient-to-b from-violet-500 via-violet-600 to-indigo-800 text-white shadow-[0_6px_0_#312e81,0_10px_20px_rgba(0,0,0,0.5)] hover:brightness-110"
                  : inHome
                  ? "border-emerald-500/40 bg-gradient-to-b from-slate-700 to-slate-800 text-emerald-200 shadow-[0_4px_0_#0f172a]"
                  : "border-white/15 bg-gradient-to-b from-slate-700 to-slate-800 text-slate-200 shadow-[0_4px_0_#0f172a]"
              }`}
            >
              {tile || "·"}
              {inHome && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">
        Green dot = tile locked in home position (1 → 8) · Guaranteed solvable.
      </p>
    </div>
  );
}
