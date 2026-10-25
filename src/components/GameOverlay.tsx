import { useEffect, useRef, useState } from "react";
import type { GameId, LiveGame, User } from "../lib/types";
import { GAME_META } from "../lib/types";
import {
  BOT_STORY_BITS,
  CODE_SYMBOLS,
  botCodeGuess,
  botWordFor,
  bumpScore,
  currentPlayer,
  feed,
  scoreGuess,
} from "../lib/gameSync";
import {
  AstroGame,
  BlitzGame,
  BombGame,
  ChainGame,
  CipherGame,
  CodeGame,
  ReactorGame,
  StoryGame,
  type GameProps,
} from "./games/CoopGames";
import { sounds } from "../lib/audio";
import {
  bestC4Move,
  bestTttMove,
  c4DropRow,
  c4Winner,
  tttWinner,
} from "../lib/classic";
import {
  Connect4Game,
  SlidingPuzzleGame,
  TicTacToeGame,
} from "./games/ClassicGames";
import WikiRaceGame from "./games/WikiRaceGame";
import VideoChallengeGame from "./games/VideoGames";
import {
  AutoBargainGame,
  DialogueBaaziGame,
  GolgappaChaatGame,
} from "./games/DesiGames";

interface Props {
  g: LiveGame;
  me: User;
  isLeader: boolean;
  canEndGame: boolean;
  mutate: (fn: (g: LiveGame) => LiveGame | null) => void;
  finish: (result: string, bonus?: string) => void;
  onAbort: () => void;
  onRematch?: (gameId: GameId) => void;
}

const BOT_TALK = [
  "Comms clear — watching my sector 🎯",
  "Locked in, make the call 🤝",
  "Clean pace everyone 🔥",
  "Ready on next rotation ⚡",
];

export default function GameOverlay({
  g,
  me,
  isLeader,
  canEndGame,
  mutate,
  finish,
  onAbort,
  onRematch,
}: Props) {
  const meta = GAME_META[g.id];
  const [left, setLeft] = useState(
    Math.max(0, Math.ceil((g.endsAt - Date.now()) / 1000))
  );
  const [chat, setChat] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    endedRef.current = false;
    sounds.playGameTrigger();
  }, [g.seed]);

  useEffect(() => {
    if (g.phase === "done") sounds.playFanfare();
  }, [g.phase]);

  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((g.endsAt - Date.now()) / 1000));
      setLeft(s);
      if (s <= 10 && s > 0) sounds.playTick();
      if (s === 0 && !endedRef.current && g.phase === "play" && !g.data?.ready) {
        endedRef.current = true;
        sounds.playError();
        finish("Time expired — match over");
      }
    }, 1000);
    return () => clearInterval(t);
  }, [g.endsAt, g.phase, finish, g.data?.ready]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [g.feed.length]);

  /* ---------- Solo AI Sparring & Co-op Teammate Simulator ---------- */
  useEffect(() => {
    if (!isLeader || g.phase === "done") return;
    const bots = g.players.filter((p) => p.bot);
    if (!bots.length) return;
    const timers: number[] = [];

    if (g.feed.length < 6) {
      timers.push(
        window.setTimeout(() => {
          const b = bots[Math.floor(Math.random() * bots.length)];
          mutate((cur) =>
            feed(cur, {
              name: b.name,
              text: BOT_TALK[Math.floor(Math.random() * BOT_TALK.length)],
              ts: Date.now(),
            })
          );
        }, 3800 + Math.random() * 3500)
      );
    }

    const cur = currentPlayer(g);

    if (g.id === "bomb" && g.v <= 2) {
      const d = g.data;
      bots.forEach((b, i) => {
        const idx = g.players.findIndex((p) => p.uid === b.uid);
        const clue = d.clues[idx % d.clues.length];
        timers.push(
          window.setTimeout(() => {
            mutate((c2) =>
              c2.phase === "done"
                ? c2
                : feed(c2, {
                    name: b.name,
                    text: `Intel: ${clue.replace(/\*\*/g, "")}`,
                    ts: Date.now(),
                  })
            );
          }, 1600 + i * 2600)
        );
      });
    }

    if (g.id === "astro" && g.v <= 2) {
      const d = g.data;
      bots.forEach((b, i) => {
        const idx = g.players.findIndex((p) => p.uid === b.uid);
        const mod = d.modules.find(
          (m: any) => m.assignedTo === idx && !m.fixed
        );
        if (mod) {
          timers.push(
            window.setTimeout(() => {
              mutate((c2) =>
                c2.phase === "done"
                  ? c2
                  : feed(c2, {
                      name: b.name,
                      text: `Override code for ${mod.name}: [${mod.code}]`,
                      ts: Date.now(),
                    })
              );
            }, 2000 + i * 2400)
          );
        }
      });
    }

    if (g.id === "cipher" && g.v <= 2) {
      const d = g.data;
      const entries = Object.entries(d.cipherMap as Record<string, string>);
      bots.forEach((b, i) => {
        const idx = g.players.findIndex((p) => p.uid === b.uid);
        const shard = entries
          .filter((_, kIdx) => kIdx % g.players.length === idx)
          .map(([l, r]) => `${r}=${l}`)
          .join("  ");
        if (shard) {
          timers.push(
            window.setTimeout(() => {
              mutate((c2) =>
                c2.phase === "done"
                  ? c2
                  : feed(c2, {
                      name: b.name,
                      text: `Key shard: ${shard}`,
                      ts: Date.now(),
                    })
              );
            }, 1900 + i * 2500)
          );
        }
      });
    }

    if (cur?.bot) {
      const delay =
        g.id === "tictactoe" || g.id === "connect4"
          ? 700 + Math.random() * 500
          : 2000 + Math.random() * 1400;
      timers.push(
        window.setTimeout(() => {
          let outcome: string | null = null;
          mutate((c2) => {
            if (c2.phase === "done") return c2;
            const d = c2.data;
            const advance = (x: LiveGame): LiveGame => ({
              ...x,
              turn: (x.turn + 1) % Math.max(1, x.players.length),
            });

            if (c2.id === "tictactoe") {
              const mark = (c2.turn % 2) as 0 | 1;
              const index = bestTttMove(d.board, mark);
              if (index < 0) return c2;
              const board = [...d.board];
              board[index] = mark;
              const won = tttWinner(board);
              const moves = d.moves + 1;
              sounds.playClack();
              if (won) outcome = `${cur.name} won Tic-Tac-Toe Pro`;
              else if (moves === 9) outcome = "Tic-Tac-Toe Pro ended in a draw";
              return advance(
                bumpScore(
                  {
                    ...c2,
                    data: {
                      ...d,
                      board,
                      moves,
                      lastIdx: index,
                      winner: won?.line || null,
                    },
                  },
                  cur.uid,
                  won ? 15 : 2
                )
              );
            }

            if (c2.id === "connect4") {
              const mark = (c2.turn % 2) as 0 | 1;
              const col = bestC4Move(d.board, mark);
              const row = c4DropRow(d.board, col);
              if (row < 0) return c2;
              const board = d.board.map((r: any[]) => [...r]);
              board[row][col] = mark;
              const won = c4Winner(board, row, col, mark);
              const moves = d.moves + 1;
              sounds.playClack();
              if (won) outcome = `${cur.name} won Four-in-a-Row`;
              else if (moves === 42) outcome = "Four-in-a-Row ended in a draw";
              return advance(
                bumpScore(
                  {
                    ...c2,
                    data: {
                      ...d,
                      board,
                      moves,
                      lastMove: [row, col],
                      winner: won || null,
                    },
                  },
                  cur.uid,
                  won ? 20 : 2
                )
              );
            }

            if (c2.id === "chain") {
              const last = d.words[d.words.length - 1];
              const need = (
                last ? last.word[last.word.length - 1] : d.startLetter
              ).toLowerCase();
              const w = botWordFor(
                need,
                d.words.map((x: any) => x.word)
              );
              if (!w) {
                return advance(
                  feed(c2, {
                    name: cur.name,
                    text: "Passing turn →",
                    ts: Date.now(),
                  })
                );
              }
              const words = [...d.words, { word: w, by: cur.name }];
              if (words.length >= d.target) {
                outcome = `Lexicon Relay cleared (${words.length} words)`;
              }
              const n = advance(
                bumpScore({ ...c2, data: { ...d, words } }, cur.uid, 5)
              );
              return feed(n, {
                name: cur.name,
                text: `chained "${w}"`,
                ts: Date.now(),
                sys: true,
              });
            }

            if (c2.id === "codebreak") {
              const guess = botCodeGuess(d.guesses);
              const s = scoreGuess(d.code, guess);
              const guesses = [
                ...d.guesses,
                { by: cur.name, guess, exact: s.exact, partial: s.partial },
              ];
              if (s.exact === 4) {
                outcome = `${cur.name} cracked Vault Breaker in ${guesses.length} turns`;
              } else if (guesses.length >= d.maxGuesses) {
                outcome = `Vault locked — code was ${d.code
                  .map((i: number) => CODE_SYMBOLS[i])
                  .join("")}`;
              }
              const n = advance(
                bumpScore({ ...c2, data: { ...d, guesses } }, cur.uid, s.exact * 4)
              );
              return feed(n, {
                name: cur.name,
                text: `tested ${guess
                  .map((i: number) => CODE_SYMBOLS[i])
                  .join("")} → ${s.exact} exact, ${s.partial} partial`,
                ts: Date.now(),
                sys: true,
              });
            }

            if (c2.id === "story") {
              const bit =
                BOT_STORY_BITS[
                  Math.floor(Math.random() * BOT_STORY_BITS.length)
                ];
              const parts = [...d.parts, { by: cur.name, text: bit }];
              if (parts.length >= d.target) {
                outcome = `Lore Builder complete (${parts.length} chapters)`;
              }
              return advance(
                bumpScore({ ...c2, data: { ...d, parts } }, cur.uid, 5)
              );
            }
            return c2;
          });
          if (outcome) finish(outcome);
        }, delay)
      );
    }

    // Competitive bot score pressure in Aim Lab & Target Blitz
    if (g.id === "blitz" || g.id === "aimlab") {
      const iv = window.setInterval(() => {
        mutate((c2) => {
          if (c2.phase === "done") return c2;
          const b = bots[Math.floor(Math.random() * bots.length)];
          if (c2.id === "aimlab") {
            return bumpScore(c2, b.uid, 10);
          }
          const d = c2.data;
          if (d.total >= d.target - 1) return c2;
          return bumpScore(
            {
              ...c2,
              data: {
                ...d,
                total: d.total + 1,
                hits: { ...d.hits, [b.uid]: (d.hits[b.uid] || 0) + 1 },
              },
            },
            b.uid,
            1
          );
        });
      }, 1700);
      timers.push(iv);
    }

    return () => {
      timers.forEach((t) => {
        clearTimeout(t);
        clearInterval(t);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeader, g.v, g.phase]);

  const sendTeam = () => {
    const t = chat.trim();
    if (!t) return;
    sounds.playSend();
    setChat("");
    mutate((cur) => feed(cur, { name: me.name, text: t, ts: Date.now() }));
  };

  const props: GameProps = { g, me, mutate, finish };
  const pct = Math.max(
    0,
    Math.min(100, ((g.endsAt - Date.now()) / (g.endsAt - g.startedAt)) * 100)
  );
  const formattedClock = `${String(Math.floor(left / 60)).padStart(
    2,
    "0"
  )}:${String(left % 60).padStart(2, "0")}`;

  /* ---------- Post-Match Scoreboard Modal ---------- */
  if (g.phase === "done") {
    const sorted = [...g.players].sort((a, b) => b.score - a.score);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="pro-card w-full max-w-md overflow-hidden rounded-2xl">
          <div className="border-b-2 border-[#111111] bg-[#ffe500] px-6 py-4 text-center">
            <span className="inline-block rounded-lg border-2 border-[#111111] bg-white px-2.5 py-0.5 font-mono text-[10px] font-black uppercase">
              MATCH COMPLETE
            </span>
            <h2 className="mt-1.5 text-xl font-black text-[#111111]">
              {meta.emoji} {meta.name}
            </h2>
            {g.result && (
              <p className="mt-1 text-xs font-bold text-zinc-900">{g.result}</p>
            )}
          </div>

          <div className="space-y-2 bg-white p-5">
            <p className="font-mono text-[10px] font-black uppercase tracking-wider text-zinc-500">
              FINAL STANDINGS
            </p>
            {sorted.map((p, i) => (
              <div
                key={p.uid}
                className={`flex items-center gap-2.5 rounded-xl border-2 border-[#111111] px-3 py-2 ${
                  i === 0 ? "bg-[#bbf7d0]" : "bg-[#f7f5ee]"
                }`}
              >
                <span className="w-6 font-mono text-xs font-black">
                  #{i + 1}
                </span>
                <img
                  src={p.avatar}
                  alt=""
                  className="h-6 w-6 rounded-full border border-[#111111] object-cover"
                />
                <span className="truncate text-sm font-black text-[#111111]">
                  {p.name} {p.uid === me.id ? "(YOU)" : ""}
                </span>
                <span className="ml-auto font-mono text-xs font-black">
                  +{p.score} PTS
                </span>
              </div>
            ))}

            <div className="mt-4 flex gap-2 pt-2">
              {onRematch && (
                <button
                  type="button"
                  onClick={() => onRematch(g.id)}
                  className="pro-btn-accent flex-1 rounded-xl py-2.5 font-mono text-xs font-black uppercase"
                >
                  ↻ REMATCH
                </button>
              )}
              <button
                type="button"
                onClick={onAbort}
                className="pro-btn flex-1 rounded-xl py-2.5 font-mono text-xs font-black uppercase"
              >
                BACK TO CHAT →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="pro-card game-light-stage flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl">
        {/* Crisp Esports HUD Header */}
        <div className="border-b-2 border-[#111111] bg-[#f3f0e6] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#111111] bg-[#ffe500] text-xl">
              {meta.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="rounded border border-[#111111] bg-white px-1.5 py-0.5 font-mono text-[9px] font-black uppercase">
                  {meta.tag}
                </span>
                <span className="font-mono text-[10px] font-bold text-zinc-600">
                  LIVE SYNCED MATCH
                </span>
              </div>
              <h2 className="truncate text-base font-black text-[#111111] sm:text-lg">
                {meta.name}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-xl border-2 border-[#111111] px-3 py-1 font-mono text-base font-black ${
                  left <= 10
                    ? "bg-[#fecaca] text-[#991b1b] animate-pulse"
                    : "bg-white text-[#111111]"
                }`}
              >
                {formattedClock}
              </span>
              {canEndGame && (
                <button
                  type="button"
                  onClick={onAbort}
                  title="End match"
                  className="pro-btn rounded-xl px-2.5 py-1.5 text-xs font-black"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full border border-[#111111] bg-white">
            <div
              className="h-full bg-[#111111] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Active Squad Strip */}
        <div className="flex items-center gap-2 overflow-x-auto border-b-2 border-[#111111] bg-white px-4 py-2">
          <span className="shrink-0 font-mono text-[10px] font-black uppercase text-zinc-500">
            PLAYERS:
          </span>
          {g.players.map((p) => {
            const active = currentPlayer(g)?.uid === p.uid;
            return (
              <div
                key={p.uid}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border-[1.5px] border-[#111111] px-2.5 py-0.5 text-xs font-bold ${
                  active ? "bg-[#ffe500]" : "bg-[#f7f5ee]"
                }`}
              >
                <img
                  src={p.avatar}
                  alt=""
                  className="h-4 w-4 rounded-full border border-[#111111] object-cover"
                />
                <span>{p.uid === me.id ? "YOU" : p.name}</span>
                <span className="font-mono font-black">{p.score}</span>
              </div>
            );
          })}
        </div>

        {/* Game Viewport */}
        <div className="chat-scroll flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f7f5ee] px-4 py-4 sm:px-5">
          {g.id === "aimlab" && <DialogueBaaziGame {...props} />}
          {g.id === "sector" && <GolgappaChaatGame {...props} />}
          {g.id === "duel" && <AutoBargainGame {...props} />}
          {g.id === "bomb" && <BombGame {...props} />}
          {g.id === "astro" && <AstroGame {...props} />}
          {g.id === "reactor" && <ReactorGame {...props} />}
          {g.id === "cipher" && <CipherGame {...props} />}
          {g.id === "chain" && <ChainGame {...props} />}
          {g.id === "blitz" && <BlitzGame {...props} />}
          {g.id === "codebreak" && <CodeGame {...props} />}
          {g.id === "story" && <StoryGame {...props} />}
          {g.id === "tictactoe" && <TicTacToeGame {...props} />}
          {g.id === "connect4" && <Connect4Game {...props} />}
          {g.id === "slide" && <SlidingPuzzleGame {...props} />}
          {g.id === "wikirace" && <WikiRaceGame {...props} />}
          {(g.id === "controller" || g.id === "npc" || g.id === "desk") && (
            <VideoChallengeGame {...props} />
          )}
        </div>

        {/* Live Match Comms Strip */}
        <div className="border-t-2 border-[#111111] bg-[#f3f0e6] px-4 py-2.5">
          <div
            ref={feedRef}
            className="chat-scroll mb-2 h-14 space-y-0.5 overflow-y-auto rounded-lg border-[1.5px] border-[#111111] bg-white px-3 py-1.5 text-xs"
          >
            {g.feed.length === 0 && (
              <p className="font-mono text-[11px] text-zinc-400">
                MATCH COMMS LIVE — Call out intel or moves here…
              </p>
            )}
            {g.feed.map((f, i) => (
              <p key={i} className="text-[#111111]">
                {!f.sys ? (
                  <span className="font-black">{f.name}: </span>
                ) : (
                  <span className="font-mono text-[10px] font-black text-zinc-500">
                    [SYS]{" "}
                  </span>
                )}
                <span className="font-medium">{f.text}</span>
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTeam()}
              placeholder="Team callout…"
              className="pro-input flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
            />
            <button
              onClick={sendTeam}
              className="pro-btn-dark rounded-xl px-4 font-mono text-xs font-black uppercase"
            >
              SEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
