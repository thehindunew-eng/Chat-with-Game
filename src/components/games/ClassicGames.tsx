import { useState } from "react";
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
      className={`mb-3 flex items-center gap-2.5 rounded-xl border-2 border-[#111111] px-3.5 py-2 text-xs font-black ${
        mine ? "bg-[#ffe500] text-[#111111]" : "bg-[#f3f0e6] text-zinc-700"
      }`}
    >
      {player && (
        <img
          src={player.avatar}
          alt=""
          className="h-6 w-6 rounded-full border-[1.5px] border-[#111111] object-cover"
        />
      )}
      <span>
        {mine ? "YOUR MOVE" : `${player?.name?.toUpperCase()}'S MOVE`}
        {label ? ` · ${label}` : ""}
      </span>
      <span className="ml-auto rounded border border-[#111111] bg-white px-2 py-0.5 font-mono text-[10px] font-black text-[#111111]">
        {g.turn % 2 === 0 ? "SIDE X / RED" : "SIDE O / GOLD"}
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
        won ? 15 : 2
      )
    );
    if (won) {
      sounds.playSuccess();
      finish(`${me.name} won Tic-Tac-Toe Pro (${mark === 0 ? "Side X" : "Side O"})`);
    } else if (moves === 9) {
      finish("Tic-Tac-Toe Pro ended in a draw");
    }
  };

  return (
    <div>
      <TurnBar g={g} me={me} mutate={mutate} finish={finish} label={mark === 0 ? "X" : "O"} />
      <div className="mx-auto w-full max-w-[300px] rounded-2xl border-2 border-[#111111] bg-[#f3f0e6] p-3 shadow-[4px_4px_0px_#111111]">
        <div className="grid grid-cols-3 gap-2.5">
          {d.board.map((cell, i) => {
            const isWin = d.winner?.includes(i);
            const isLast = d.lastIdx === i;
            return (
              <button
                key={i}
                onClick={() => play(i)}
                disabled={!mine || cell !== null}
                className={`flex aspect-square items-center justify-center rounded-xl border-2 border-[#111111] text-4xl font-black transition active:scale-95 ${
                  isWin
                    ? "bg-[#bbf7d0]"
                    : isLast
                    ? "bg-[#fef9c3]"
                    : "bg-white hover:bg-zinc-50"
                }`}
              >
                {cell === 0 && <span className="text-[#111111]">✕</span>}
                {cell === 1 && <span className="text-[#dc2626]">○</span>}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-center font-mono text-xs text-zinc-600">
        {d.moves}/9 moves played
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
        won ? 20 : 2
      )
    );
    if (won) {
      sounds.playSuccess();
      finish(`${me.name} connected four (${mark === 0 ? "Red" : "Gold"} wins)`);
    } else if (moves === 42) {
      finish("Four-in-a-Row filled all 42 slots — draw");
    }
  };

  return (
    <div>
      <TurnBar
        g={g}
        me={me}
        mutate={mutate}
        finish={finish}
        label={mark === 0 ? "RED DISC" : "GOLD DISC"}
      />

      <div className="mx-auto max-w-[400px] rounded-2xl border-2 border-[#111111] bg-[#f3f0e6] p-3 shadow-[4px_4px_0px_#111111]">
        <div className="grid grid-cols-7 gap-2">
          {d.board.flatMap((row, r) =>
            row.map((cell, c) => {
              const winning = d.winner?.some(([wr, wc]) => wr === r && wc === c);
              const isNew = d.lastMove && d.lastMove[0] === r && d.lastMove[1] === c;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => play(c)}
                  disabled={!mine}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={`flex aspect-square items-center justify-center rounded-full border-2 border-[#111111] transition ${
                    hoverCol === c && mine && cell === null
                      ? "bg-[#fef9c3]"
                      : "bg-white"
                  }`}
                >
                  {cell !== null && (
                    <span
                      className={`h-[84%] w-[84%] rounded-full border-2 border-[#111111] ${
                        isNew ? "disc-drop" : ""
                      } ${winning ? "ring-2 ring-[#16a34a]" : ""} ${
                        cell === 0 ? "bg-[#ef4444]" : "bg-[#ffe500]"
                      }`}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <p className="mt-2.5 text-center font-mono text-xs text-zinc-600">
        {d.moves}/42 discs dropped · Click any column to drop
      </p>
    </div>
  );
}

export function SlidingPuzzleGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as { board: number[]; size: number; moves: number };
  const mine = isMyTurn(g, me.id);
  const blank = d.board.indexOf(0);
  const movable = slideNeighbors(blank, d.size);

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
          2
        ),
        {
          name: me.name,
          text: `slid tile ${d.board[index]} (#${moves})`,
          ts: Date.now(),
          sys: true,
        }
      )
    );
    if (slideSolved(board)) {
      sounds.playSuccess();
      finish(`15-Slide Sprint solved in ${moves} moves`);
    }
  };

  return (
    <div>
      <TurnBar g={g} me={me} mutate={mutate} finish={finish} label={`${d.moves} moves`} />
      <div className="mx-auto max-w-[300px] rounded-2xl border-2 border-[#111111] bg-[#f3f0e6] p-3 shadow-[4px_4px_0px_#111111]">
        <div className="grid grid-cols-3 gap-2">
          {d.board.map((tile, i) => {
            const isBlank = tile === 0;
            const inPlace = !isBlank && tile === i + 1;
            const canSlide = mine && movable.includes(i);
            return (
              <button
                key={i}
                disabled={isBlank || !canSlide}
                onClick={() => move(i)}
                className={`flex aspect-square items-center justify-center rounded-xl font-mono text-2xl font-black transition ${
                  isBlank
                    ? "border-2 border-dashed border-zinc-400 bg-transparent"
                    : inPlace
                    ? "pro-btn bg-[#bbf7d0]"
                    : canSlide
                    ? "pro-btn bg-[#ffe500]"
                    : "border-2 border-[#111111] bg-white text-[#111111]"
                }`}
              >
                {isBlank ? "" : tile}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
