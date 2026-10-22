import { useEffect, useRef, useState } from "react";
import type { LiveGame, User } from "../lib/types";
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

interface Props {
  g: LiveGame;
  me: User;
  isLeader: boolean;
  canEndGame: boolean;
  mutate: (fn: (g: LiveGame) => LiveGame | null) => void;
  finish: (result: string, bonus?: string) => void;
  onAbort: () => void;
}

const BOT_TALK = [
  "Checking my panel right now 👀",
  "Hold on, reading my piece!",
  "Let's sync before locking the move 🤝",
  "Looking clean — go for it! 🔥",
  "Got eyes on the objective 🎯",
  "Nice pace everyone!",
];

export default function GameOverlay({
  g,
  me,
  isLeader,
  canEndGame,
  mutate,
  finish,
  onAbort,
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

  /* Synced MM:SS countdown */
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((g.endsAt - Date.now()) / 1000));
      setLeft(s);
      if (s <= 10 && s > 0) {
        sounds.playTick();
      }
      if (s === 0 && !endedRef.current && g.phase === "play" && !g.data?.ready) {
        endedRef.current = true;
        sounds.playError();
        finish("time expired — the squad gave it everything ⏱");
      }
    }, 1000);
    return () => clearInterval(t);
  }, [g.endsAt, g.phase, finish, g.data?.ready]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [g.feed.length]);

  /* ---------- Smart Solo-Bot Teammate Simulator ---------- */
  useEffect(() => {
    if (!isLeader || g.phase === "done") return;
    const bots = g.players.filter((p) => p.bot);
    if (!bots.length) return;
    const timers: number[] = [];

    // Occasional natural comms line
    if (g.feed.length < 10) {
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
        }, 3200 + Math.random() * 3500)
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
                    text: `My schematic says: ${clue.replace(/\*\*/g, "")}`,
                    ts: Date.now(),
                  })
            );
          }, 1800 + i * 3200)
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
                      text: `📡 Override key for ${mod.name}: [${mod.code}]`,
                      ts: Date.now(),
                    })
              );
            }, 2200 + i * 2600)
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
                      text: `My cipher keys: ${shard}`,
                      ts: Date.now(),
                    })
              );
            }, 2000 + i * 2800)
          );
        }
      });
    }

    if (cur?.bot) {
      const delay =
        g.id === "tictactoe" || g.id === "connect4"
          ? 750 + Math.random() * 550
          : 2200 + Math.random() * 1600;
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
              if (won)
                outcome = `${cur.name} completed three ${
                  mark === 0 ? "X" : "O"
                } marks — ${
                  mark === 0 ? "Team X" : "Team O"
                } wins Tic-Tac-Toe ⭕`;
              else if (moves === 9)
                outcome = "the shared Tic-Tac-Toe board ended in a draw 🤝";
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
                  won ? 5 : 1
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
              if (won)
                outcome = `${cur.name} connected four ${
                  mark === 0 ? "crimson" : "gold"
                } discs — ${mark === 0 ? "Red" : "Gold"} team wins 🔴`;
              else if (moves === 42)
                outcome = "Connect Four filled the whole board — squad draw 🤝";
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
                  won ? 6 : 1
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
                    text: "Passing baton to next teammate →",
                    ts: Date.now(),
                  })
                );
              }
              const words = [...d.words, { word: w, by: cur.name }];
              if (words.length >= d.target) {
                outcome = `the squad linked an unbroken ${words.length}-word chain 🔗`;
              }
              const n = advance(
                bumpScore({ ...c2, data: { ...d, words } }, cur.uid, 1)
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
                outcome = `${cur.name} cracked the secret vault code in ${guesses.length} turns 🧩`;
              } else if (guesses.length >= d.maxGuesses) {
                outcome = `vault locked — secret sequence was ${d.code
                  .map((i: number) => CODE_SYMBOLS[i])
                  .join("")}`;
              }
              const n = advance(
                bumpScore({ ...c2, data: { ...d, guesses } }, cur.uid, s.exact)
              );
              return feed(n, {
                name: cur.name,
                text: `tested ${guess
                  .map((i: number) => CODE_SYMBOLS[i])
                  .join("")} → ${s.exact}🎯 ${s.partial}🔆`,
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
                outcome = `the squad co-wrote a ${parts.length}-part story 📖`;
              }
              return advance(
                bumpScore({ ...c2, data: { ...d, parts } }, cur.uid, 1)
              );
            }
            return c2;
          });
          if (outcome) finish(outcome);
        }, delay)
      );
    }

    if (g.id === "blitz") {
      const iv = window.setInterval(() => {
        mutate((c2) => {
          if (c2.phase === "done" || c2.id !== "blitz") return c2;
          const b = bots[Math.floor(Math.random() * bots.length)];
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
      }, 1500);
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
  const humans = g.players.filter((p) => !p.bot).length;
  const formattedClock = `${String(Math.floor(left / 60)).padStart(
    2,
    "0"
  )}:${String(left % 60).padStart(2, "0")}`;

  if (g.phase === "done") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/40 bg-slate-900 p-7 text-center shadow-2xl">
          {["🎉", "✨", "🏆", "🎊", "⭐", "💜", "🎯", "🔥"].map((e, i) => (
            <span
              key={i}
              className="confetti absolute text-2xl"
              style={{ left: `${8 + i * 12}%`, animationDelay: `${i * 0.08}s` }}
            >
              {e}
            </span>
          ))}
          <p className="animate-bounce text-5xl">🏆</p>
          <h2 className="mt-2 text-2xl font-black text-white">
            Mission Complete
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            {g.result}
          </p>
          <div className="mt-4 space-y-1.5 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Match Standings
            </p>
            {[...g.players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div
                  key={p.uid}
                  className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-800/80 px-3 py-2"
                >
                  <span className="w-5 font-mono text-xs font-bold text-amber-400">
                    #{i + 1}
                  </span>
                  <img
                    src={p.avatar}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  <span className="truncate text-sm font-semibold text-white">
                    {p.name}{" "}
                    {p.uid === me.id && (
                      <span className="text-xs text-slate-400">(you)</span>
                    )}
                  </span>
                  <span className="ml-auto font-mono text-sm font-black text-teal-300">
                    +{p.score} pts
                  </span>
                </div>
              ))}
          </div>
          <button
            type="button"
            onClick={onAbort}
            className="mt-4 w-full rounded-xl bg-emerald-600/25 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-600/40"
          >
            Return to Chat Now →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-violet-500/40 bg-slate-900 shadow-2xl">
        {/* Tactical Header */}
        <div className="bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900 border-b border-white/10 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-inner">
              {meta.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-violet-500/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-200">
                  {meta.tag}
                </span>
                <span className="text-[10px] font-semibold text-amber-300/90">
                  🔒 Live Squad Session
                </span>
              </div>
              <h2 className="truncate text-base sm:text-lg font-black leading-tight text-white">
                {meta.name}
              </h2>
            </div>

            {/* 7-Segment Style Digital Countdown + End Control */}
            <div className="flex items-center gap-2">
              <span
                className={`rounded-xl border px-3 py-1 font-mono text-base sm:text-lg font-black tracking-wider shadow-inner ${
                  left <= 10
                    ? "border-red-500/60 bg-red-950/80 text-red-300 animate-pulse"
                    : "border-emerald-500/30 bg-slate-950 text-emerald-300"
                }`}
              >
                {formattedClock}
              </span>
              {canEndGame && (
                <button
                  type="button"
                  onClick={onAbort}
                  title="End mission & unlock chat"
                  className="rounded-xl border border-white/10 bg-slate-800/90 px-2.5 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-rose-500/25 hover:text-rose-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <p className="mt-1 text-xs text-slate-300">{meta.blurb}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-violet-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Squad Roster */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 bg-slate-950/60 px-4 py-2">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Active
          </span>
          {g.players.map((p) => {
            const active = currentPlayer(g)?.uid === p.uid;
            return (
              <div
                key={p.uid}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 transition ${
                  active
                    ? "bg-emerald-500/20 ring-1 ring-emerald-400/50 shadow"
                    : "bg-slate-800/80"
                }`}
              >
                <img
                  src={p.avatar}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover"
                />
                <span className="text-xs font-semibold text-white">
                  {p.uid === me.id ? "You" : p.name}
                </span>
                <span className="font-mono text-[10px] font-bold text-teal-300">
                  {p.score}
                </span>
              </div>
            );
          })}
          <span className="ml-auto shrink-0 text-[10px] font-semibold text-slate-400">
            {humans} {humans === 1 ? "human" : "humans"} · {g.players.length} total
          </span>
        </div>

        {/* Game Viewport */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-5">
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

        {/* Live Squad Comms Radio Channel */}
        <div className="border-t border-white/10 bg-slate-950/90 px-4 py-2.5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            📻 Squad Radio Comms — Live Synced Across Players
          </p>
          <div
            ref={feedRef}
            className="mb-2 h-16 space-y-0.5 overflow-y-auto text-xs"
          >
            {g.feed.length === 0 && (
              <p className="text-slate-500">
                Radio channel live — call out clues, coordinates, or moves here!
              </p>
            )}
            {g.feed.map((f, i) => (
              <p
                key={i}
                className={
                  f.sys ? "font-medium text-teal-300/85" : "text-slate-200"
                }
              >
                {!f.sys && (
                  <span className="font-bold text-violet-300">{f.name}: </span>
                )}
                {f.text}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTeam()}
              placeholder="Send quick callout to squad…"
              className="flex-1 rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400"
            />
            <button
              onClick={sendTeam}
              className="rounded-xl bg-violet-600 px-3.5 text-sm font-bold text-white hover:bg-violet-500"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
