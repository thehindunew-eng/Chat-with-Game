import { useEffect, useMemo, useRef, useState } from "react";
import type { LiveGame, User } from "../../lib/types";
import {
  CODE_SYMBOLS,
  bumpScore,
  currentPlayer,
  feed,
  isMyTurn,
  mulberry32,
  scoreGuess,
} from "../../lib/gameSync";
import { sounds } from "../../lib/audio";

export interface GameProps {
  g: LiveGame;
  me: User;
  mutate: (fn: (g: LiveGame) => LiveGame | null) => void;
  finish: (result: string, bonus?: string) => void;
}

const nextTurn = (g: LiveGame): LiveGame => ({
  ...g,
  turn: (g.turn + 1) % Math.max(1, g.players.length),
});

function TurnBanner({ g, me }: { g: LiveGame; me: User }) {
  const cur = currentPlayer(g);
  const mine = cur?.uid === me.id;
  return (
    <div
      className={`mb-3 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
        mine
          ? "border border-emerald-400/40 bg-[#bbf7d0] text-emerald-800 shadow-md shadow-emerald-950/40"
          : "border border-[#111111] bg-[#efece2] text-zinc-800"
      }`}
    >
      {cur && (
        <img
          src={cur.avatar}
          alt=""
          className="h-6 w-6 rounded-full border border-[#111111] object-cover"
        />
      )}
      {mine
        ? "🫵 Your turn — squad is counting on you!"
        : `⏳ ${cur?.name ?? "…"} is taking this turn`}
      <span className="ml-auto text-xs font-semibold text-zinc-600">
        {g.players.length} in squad
      </span>
    </div>
  );
}

/* ================= 1. Defuse the Bomb (Tactile C4 Hardware Chassis) ================= */
export function BombGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as {
    wires: { color: string; hex: string; emoji: string }[];
    correct: number;
    clues: string[];
    cut: number[];
    strikes: number;
  };
  const [sparkWire, setSparkWire] = useState<number | null>(null);
  const [shaking, setShaking] = useState(false);

  const myIdx = Math.max(0, g.players.findIndex((p) => p.uid === me.id));
  const solo = g.players.filter((p) => !p.bot).length <= 1;
  const myClues = solo
    ? d.clues
    : d.clues.filter((_, i) => i % g.players.length === myIdx);

  const cut = (i: number) => {
    if (d.cut.includes(i) || g.phase === "done") return;
    sounds.playSnip();
    setSparkWire(i);
    window.setTimeout(() => setSparkWire(null), 550);

    if (i === d.correct) {
      sounds.playSuccess();
      mutate((cur) =>
        feed(
          bumpScore(
            { ...cur, data: { ...cur.data, cut: [...cur.data.cut, i] } },
            me.id,
            4
          ),
          {
            name: "",
            text: `✅ ${me.name} snipped Wire #${i + 1} (${d.wires[i].color.toUpperCase()}) — C4 DISARMED!`,
            ts: Date.now(),
            sys: true,
          }
        )
      );
      finish(
        `the squad disarmed the bomb 🧨 (${me.name} snipped the safe ${d.wires[i].color} wire)`
      );
    } else {
      sounds.playError();
      setShaking(true);
      window.setTimeout(() => setShaking(false), 450);
      const strikes = d.strikes + 1;
      mutate((cur) =>
        feed(
          { ...cur, data: { ...cur.data, cut: [...cur.data.cut, i], strikes } },
          {
            name: "",
            text: `💥 ${me.name} snipped Wire #${i + 1} (${d.wires[i].color}) — FAULT! Strike ${strikes}/3`,
            ts: Date.now(),
            sys: true,
          }
        )
      );
      if (strikes >= 3) {
        finish(
          `the device detonated after 3 wrong cuts 💥 (safe wire was #${
            d.correct + 1
          }, ${d.wires[d.correct].color})`
        );
      }
    }
  };

  return (
    <div className={shaking ? "shake" : ""}>
      {/* Confidential Intel Dossier */}
      <div className="mb-3 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-slate-900 p-3.5 shadow-inner">
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-900">
          <span>📋</span>
          <span>
            Field Manual Schematic{" "}
            {solo
              ? "(Solo Dispatch — Full Intel)"
              : `(Encrypted Fragment ${myIdx + 1}/${g.players.length})`}
          </span>
        </p>
        <div className="space-y-1">
          {myClues.map((c, i) => (
            <p
              key={i}
              className="text-xs sm:text-sm leading-relaxed text-amber-900"
              dangerouslySetInnerHTML={{
                __html:
                  "▸ " +
                  c.replace(
                    /\*\*(.+?)\*\*/g,
                    "<b class='text-[#111111] font-bold underline decoration-amber-400/60'>$1</b>"
                  ),
              }}
            />
          ))}
        </div>
        {!solo && (
          <p className="mt-2 text-[11px] font-medium text-amber-400/90">
            💬 Relay your fragment in Squad Comms below so everyone confirms the exact wire!
          </p>
        )}
      </div>

      {/* Physical Brushed-Aluminum C4 Housing */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#111111] bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.2)]">
        {/* Corner Hex Screws */}
        <span className="absolute left-2.5 top-2.5 h-2.5 w-2.5 rounded-full border border-[#111111] bg-slate-700 shadow-inner" />
        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border border-[#111111] bg-slate-700 shadow-inner" />
        <span className="absolute bottom-2.5 left-2.5 h-2.5 w-2.5 rounded-full border border-[#111111] bg-slate-700 shadow-inner" />
        <span className="absolute bottom-2.5 right-2.5 h-2.5 w-2.5 rounded-full border border-[#111111] bg-slate-700 shadow-inner" />

        {/* Hazard Strip + Strike LEDs */}
        <div className="hazard-stripes mb-3.5 flex items-center justify-between rounded-xl border border-amber-500/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-red-500" />
            <span className="font-mono text-[11px] font-black uppercase tracking-widest text-amber-900">
              MK-IV BUS TERMINAL
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 border border-[#111111]">
            <span className="text-[10px] font-mono font-bold text-zinc-600">
              STRIKES
            </span>
            {[0, 1, 2].map((s) => (
              <span
                key={s}
                className={`h-3 w-3 rounded-full border transition ${
                  s < d.strikes
                    ? "border-red-300 bg-red-500 shadow-[0_0_10px_#ef4444]"
                    : "border-[#111111] bg-[#f7f5ee]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* 5 Realistic Insulated Copper Wires */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {d.wires.map((w, i) => {
            const isCut = d.cut.includes(i);
            const isCorrectCut = isCut && i === d.correct;
            return (
              <button
                key={i}
                onClick={() => cut(i)}
                disabled={isCut}
                title={isCut ? `Wire #${i + 1} severed` : `Snip Wire #${i + 1} (${w.color})`}
                className={`group relative flex flex-col items-center rounded-2xl border p-2.5 transition ${
                  isCut
                    ? isCorrectCut
                      ? "border-emerald-500/50 bg-emerald-950/30"
                      : "border-[#111111] bg-white opacity-75 cursor-not-allowed"
                    : "border-[#111111] bg-white hover:border-amber-400/70 hover:bg-[#f7f5ee] cursor-crosshair shadow-inner active:scale-95"
                }`}
              >
                {/* Top Brass Terminal */}
                <div className="h-3 w-6 rounded-sm border border-amber-300/40 pro-btn-accent shadow" />

                {/* Wire SVG with Specular Insulation & Snipped Copper Ends */}
                <div className="relative flex h-24 w-full items-center justify-center">
                  {!isCut ? (
                    <svg viewBox="0 0 40 96" className="h-24 w-10 overflow-visible">
                      <path
                        d={
                          i % 2 === 0
                            ? "M20 0 C26 28, 14 68, 20 96"
                            : "M20 0 C14 30, 26 66, 20 96"
                        }
                        fill="none"
                        stroke="rgba(0,0,0,0.65)"
                        strokeWidth="10"
                        transform="translate(2, 2)"
                      />
                      <path
                        d={
                          i % 2 === 0
                            ? "M20 0 C26 28, 14 68, 20 96"
                            : "M20 0 C14 30, 26 66, 20 96"
                        }
                        fill="none"
                        stroke={w.hex}
                        strokeWidth="8"
                        strokeLinecap="round"
                        className="transition group-hover:brightness-125"
                      />
                      <path
                        d={
                          i % 2 === 0
                            ? "M18.5 0 C24.5 28, 12.5 68, 18.5 96"
                            : "M18.5 0 C12.5 30, 24.5 66, 18.5 96"
                        }
                        fill="none"
                        stroke="rgba(255,255,255,0.38)"
                        strokeWidth="2"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 40 96" className="h-24 w-10 overflow-visible">
                      {/* Upper severed half + copper strands */}
                      <path
                        d="M20 0 C23 14, 15 24, 14 35"
                        fill="none"
                        stroke={w.hex}
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M14 35 L11 41 M14 35 L16 42"
                        stroke="#f59e0b"
                        strokeWidth="2"
                      />
                      {/* Lower severed half + copper strands */}
                      <path
                        d="M20 96 C17 82, 25 72, 26 61"
                        fill="none"
                        stroke={w.hex}
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M26 61 L23 55 M26 61 L29 55"
                        stroke="#f59e0b"
                        strokeWidth="2"
                      />
                    </svg>
                  )}

                  {/* Snip hover reticle */}
                  {!isCut && (
                    <span className="pointer-events-none absolute rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 opacity-0 shadow transition group-hover:opacity-100">
                      ✂ SNIP
                    </span>
                  )}

                  {/* Electric Spark Burst */}
                  {sparkWire === i && (
                    <span className="spark-burst pointer-events-none absolute left-1/2 top-1/2 text-2xl">
                      ⚡
                    </span>
                  )}
                </div>

                {/* Bottom Brass Terminal */}
                <div className="h-3 w-6 rounded-sm border border-amber-300/40 pro-btn-accent shadow" />

                <span className="mt-1.5 font-mono text-[11px] font-black text-zinc-800">
                  #{i + 1}
                </span>
                <span className="text-[10px] font-semibold capitalize text-zinc-600">
                  {isCut ? "cut" : w.color}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================= 2. Starship Repair (Independent Console Inputs + Broadcast Button) ================= */
export function AstroGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as {
    modules: {
      id: number;
      name: string;
      icon: string;
      req: string;
      code: string;
      fixed: boolean;
      assignedTo: number;
    }[];
    integrity: number;
  };
  const [codes, setCodes] = useState<Record<number, string>>({});
  const myIdx = Math.max(0, g.players.findIndex((p) => p.uid === me.id));
  const myModules = d.modules.filter((_, i) => i % g.players.length === myIdx);

  const shareCodeToComms = (modName: string, code: string) => {
    sounds.playSend();
    mutate((cur) =>
      feed(cur, {
        name: me.name,
        text: `📡 Override key for ${modName}: [${code}]`,
        ts: Date.now(),
      })
    );
  };

  const fixModule = (modId: number, overrideVal?: string) => {
    const mod = d.modules.find((m) => m.id === modId);
    if (!mod || mod.fixed) return;
    const entered = (overrideVal ?? codes[modId] ?? "").trim().toUpperCase();
    if (entered === mod.code) {
      sounds.playSuccess();
      setCodes((prev) => ({ ...prev, [modId]: "" }));
      const updated = d.modules.map((m) =>
        m.id === modId ? { ...m, fixed: true } : m
      );
      const allDone = updated.every((m) => m.fixed);
      mutate((cur) =>
        feed(
          bumpScore(
            { ...cur, data: { ...cur.data, modules: updated } },
            me.id,
            2
          ),
          {
            name: me.name,
            text: `🔧 Restored ${mod.name} online with [${mod.code}]!`,
            ts: Date.now(),
            sys: true,
          }
        )
      );
      if (allDone) {
        finish(
          `the crew brought all starship consoles online before hull breach 🚀`
        );
      }
    } else {
      sounds.playError();
      mutate((cur) =>
        feed(cur, {
          name: me.name,
          text: `⚠️ Rejected code "${entered || "—"}" on ${mod.name}`,
          ts: Date.now(),
          sys: true,
        })
      );
    }
  };

  const fixedCount = d.modules.filter((m) => m.fixed).length;

  return (
    <div>
      <div className="mb-3 rounded-2xl border border-cyan-500/35 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-emerald-950/30 p-3.5">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-cyan-900">
          <span>🛸 Bridge Engineering Telemetry</span>
          <span className="font-mono text-emerald-800">
            {fixedCount}/{d.modules.length} NOMINAL
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white p-0.5">
          <div
            className="h-full rounded-full pro-btn-accent transition-all duration-500"
            style={{ width: `${(fixedCount / d.modules.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-3 space-y-2">
        {d.modules.map((m) => {
          const isMine = myModules.some((x) => x.id === m.id);
          return (
            <div
              key={m.id}
              className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3 transition ${
                m.fixed
                  ? "border-emerald-500/35 bg-[#bbf7d0] text-emerald-800"
                  : "border-[#111111] bg-[#f7f5ee] shadow-inner"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-2xl border border-[#111111]">
                {m.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      m.fixed ? "bg-emerald-400" : "animate-pulse bg-amber-400"
                    }`}
                  />
                  <p className="truncate text-sm font-bold text-[#111111]">
                    {m.name}
                  </p>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                      m.fixed
                        ? "bg-[#bbf7d0] text-emerald-800"
                        : "bg-[#fecaca] text-rose-800"
                    }`}
                  >
                    {m.fixed ? "NOMINAL ✓" : "FAULT"}
                  </span>
                </div>
                <p className="text-xs text-zinc-600">{m.req}</p>
                {isMine && !m.fixed && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-amber-900">
                      🔑 Override Key: <b>{m.code}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => fixModule(m.id, m.code)}
                      className="rounded-md bg-[#fef9c3] px-2 py-0.5 text-[10px] font-bold text-amber-900 hover:bg-amber-500/30"
                    >
                      ⚡ Auto-Key
                    </button>
                    <button
                      type="button"
                      onClick={() => shareCodeToComms(m.name, m.code)}
                      className="rounded-md bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-900 hover:bg-cyan-500/30"
                    >
                      📡 Send to Comms
                    </button>
                  </div>
                )}
              </div>
              {!m.fixed && (
                <div className="flex gap-1.5">
                  <input
                    value={codes[m.id] || ""}
                    onChange={(e) =>
                      setCodes((prev) => ({
                        ...prev,
                        [m.id]: e.target.value.toUpperCase(),
                      }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && fixModule(m.id)}
                    placeholder="OMEGA-9"
                    className="w-24 rounded-xl border border-[#111111] bg-white px-2.5 py-1.5 text-center font-mono text-xs uppercase text-[#111111] outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => fixModule(m.id)}
                    className="rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-bold text-[#111111] shadow hover:bg-cyan-500 active:scale-95"
                  >
                    Engage
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-[11px] text-zinc-600">
        Exchange override keys via Squad Comms or tap Auto-Key on consoles assigned to your station!
      </p>
    </div>
  );
}

/* ================= 3. Quantum Reactor Sync (Spinning Magnetic Plasma Core) ================= */
export function ReactorGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as {
    energy: number;
    targetEnergy: number;
    sequence: number[];
    step: number;
    overheat: number;
    frequencies: { name: string; color: string; hex: string; note: string }[];
  };

  const currentExpected = d.sequence[d.step % d.sequence.length];
  const expectedFreq = d.frequencies[currentExpected];
  const pct = Math.min(100, (d.energy / d.targetEnergy) * 100);

  const tapFreq = (idx: number) => {
    if (g.phase === "done") return;
    if (idx === currentExpected) {
      sounds.playReactor();
      const newEnergy = d.energy + 2;
      const newStep = d.step + 1;
      mutate((cur) =>
        bumpScore(
          {
            ...cur,
            data: {
              ...cur.data,
              energy: newEnergy,
              step: newStep,
              overheat: Math.max(0, cur.data.overheat - 5),
            },
          },
          me.id,
          1
        )
      );
      if (newEnergy >= d.targetEnergy) {
        finish(
          `the squad stabilized the Quantum Reactor core at ${newEnergy} GW ⚡`
        );
      }
    } else {
      sounds.playError();
      const newHeat = Math.min(100, d.overheat + 15);
      mutate((cur) =>
        feed(
          { ...cur, data: { ...cur.data, overheat: newHeat } },
          {
            name: me.name,
            text: `⚡ Phase mismatch! Core thermal load at ${newHeat}%`,
            ts: Date.now(),
            sys: true,
          }
        )
      );
    }
  };

  return (
    <div>
      {/* Telemetry Gauges */}
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-fuchsia-500/30 bg-white p-3">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-fuchsia-300">⚡ Output</span>
            <span className="font-mono text-[#111111]">
              {d.energy}/{d.targetEnergy} GW
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#efece2]">
            <div
              className="h-full rounded-full pro-btn-accent transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-rose-500/25 bg-white p-3">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-rose-800">🌡 Core Heat</span>
            <span className="font-mono text-[#111111]">{d.overheat}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#efece2]">
            <div
              className="h-full rounded-full pro-btn-accent transition-all duration-300"
              style={{ width: `${Math.min(100, d.overheat)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Live Visual Plasma Containment Core */}
      <div className="relative mx-auto mb-4 flex h-36 w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-[#111111] bg-white shadow-inner">
        <div
          className="spin-slow absolute h-28 w-28 rounded-full border-2 border-dashed opacity-60"
          style={{ borderColor: expectedFreq.hex }}
        />
        <div
          className="spin-reverse absolute h-20 w-20 rounded-full border-2 opacity-75"
          style={{ borderColor: expectedFreq.hex }}
        />
        <div
          className="relative z-10 flex flex-col items-center rounded-2xl px-4 py-2 font-mono shadow-2xl transition-colors duration-200"
          style={{
            backgroundColor: expectedFreq.hex + "30",
            boxShadow: `0 0 28px ${expectedFreq.hex}55`,
            border: `1px solid ${expectedFreq.hex}`,
          }}
        >
          <span className="text-[10px] uppercase tracking-widest text-[#111111]/80">
            Match Harmonic
          </span>
          <span className="text-sm font-black text-[#111111]">
            {expectedFreq.name}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {d.frequencies.map((f, i) => {
          const active = i === currentExpected;
          return (
            <button
              key={i}
              onClick={() => tapFreq(i)}
              className={`group flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 transition active:scale-95 ${
                active
                  ? "border-[#111111] bg-[#efece2] shadow-lg"
                  : "border-[#111111] bg-[#f7f5ee] hover:border-[#111111] hover:bg-[#efece2]"
              }`}
            >
              <div
                className="h-7 w-7 rounded-full shadow-lg transition group-hover:scale-110"
                style={{
                  background: f.hex,
                  boxShadow: `0 0 14px ${f.hex}88`,
                }}
              />
              <span className="font-mono text-xs font-black text-[#111111]">
                {f.name.split(" ")[0]}
              </span>
              <span className="text-[10px] text-zinc-600">{f.note}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================= 4. Emoji Cipher Hack ================= */
export function CipherGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as {
    phrase: string;
    words: string[];
    cipherMap: Record<string, string>;
    solvedWords: string[];
    guessWordIdx: number;
  };
  const [guess, setGuess] = useState("");
  const [err, setErr] = useState("");
  const targetWord = d.words[d.solvedWords.length] || "";

  const myIdx = Math.max(0, g.players.findIndex((p) => p.uid === me.id));
  const solo = g.players.filter((p) => !p.bot).length <= 1;
  const keys = Object.entries(d.cipherMap);
  const myKeys = solo
    ? keys
    : keys.filter((_, idx) => idx % g.players.length === myIdx);

  const submit = () => {
    const val = guess.trim().toUpperCase();
    if (!val) return;
    if (val === targetWord) {
      sounds.playSuccess();
      setGuess("");
      setErr("");
      const solved = [...d.solvedWords, val];
      const allDone = solved.length >= d.words.length;
      mutate((cur) =>
        feed(
          bumpScore(
            { ...cur, data: { ...cur.data, solvedWords: solved } },
            me.id,
            3
          ),
          {
            name: me.name,
            text: `🔓 Decrypted word: "${val}"!`,
            ts: Date.now(),
            sys: true,
          }
        )
      );
      if (allDone) {
        finish(
          `the squad decrypted the entire coded transmission 🕵️`,
          `📜 Decrypted message: "${d.phrase}"`
        );
      }
    } else {
      sounds.playError();
      setErr("Mismatch — double-check the rune table above!");
    }
  };

  return (
    <div>
      <div className="mb-3 rounded-2xl border border-violet-500/30 bg-violet-950/25 p-3">
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-violet-900">
          🕵️ Decryption Keyring{" "}
          {solo ? "(Full Cipher Table)" : `(Key Shard ${myIdx + 1}/${g.players.length})`}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {myKeys.map(([letter, rune]) => (
            <div
              key={letter}
              className="flex items-center gap-1 rounded-xl border border-violet-400/30 bg-[#f7f5ee] px-2.5 py-1 text-xs font-bold"
            >
              <span className="text-base">{rune}</span>
              <span className="text-zinc-600">=</span>
              <span className="font-mono text-sm text-emerald-800">
                {letter}
              </span>
            </div>
          ))}
        </div>
      </div>

      {d.solvedWords.length > 0 && (
        <div className="mb-2 flex flex-wrap justify-center gap-1.5">
          {d.solvedWords.map((w, i) => (
            <span
              key={i}
              className="rounded-lg border border-emerald-500/30 bg-[#bbf7d0] px-2.5 py-0.5 font-mono text-xs font-black text-emerald-800"
            >
              {w} ✓
            </span>
          ))}
        </div>
      )}

      <div className="mb-3 text-center">
        <p className="text-xs font-bold text-zinc-600">
          Decrypt Word {d.solvedWords.length + 1} of {d.words.length}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {targetWord.split("").map((letter, i) => (
            <div
              key={i}
              className="flex h-12 w-11 flex-col items-center justify-center rounded-xl border border-[#111111] bg-[#efece2] text-lg font-black shadow-inner"
            >
              <span>{d.cipherMap[letter] || "❓"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          maxLength={targetWord.length + 2}
          placeholder="TYPE DECRYPTED WORD"
          className="flex-1 rounded-xl border border-[#111111] bg-[#efece2] px-4 py-2.5 text-center font-mono font-bold tracking-widest text-[#111111] outline-none focus:border-violet-400"
        />
        <button
          onClick={submit}
          className="rounded-xl pro-btn-accent px-5 font-bold text-[#111111] shadow hover:brightness-110"
        >
          Unlock
        </button>
      </div>
      {err && (
        <p className="mt-2 text-center text-xs font-bold text-rose-400">{err}</p>
      )}
    </div>
  );
}

/* ================= 5. Word Chain Relay ================= */
export function ChainGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as {
    words: { word: string; by: string }[];
    target: number;
    startLetter: string;
  };
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const last = d.words[d.words.length - 1];
  const need = (
    last ? last.word[last.word.length - 1] : d.startLetter
  ).toUpperCase();
  const mine = isMyTurn(g, me.id);

  const submit = () => {
    const w = val.trim().toLowerCase();
    if (!/^[a-z]{3,}$/.test(w))
      return setErr("Letters only, at least 3 letters.");
    if (w[0].toUpperCase() !== need)
      return setErr(`Must begin with letter "${need}".`);
    if (d.words.some((x) => x.word === w))
      return setErr("That word is already used!");
    sounds.playPop();
    setErr("");
    setVal("");
    const words = [...d.words, { word: w, by: me.name }];
    mutate((cur) =>
      nextTurn(
        feed(bumpScore({ ...cur, data: { ...cur.data, words } }, me.id, 1), {
          name: me.name,
          text: `chained "${w}"`,
          ts: Date.now(),
          sys: true,
        })
      )
    );
    if (words.length >= d.target) {
      finish(
        `the squad linked an unbroken ${words.length}-word chain 🔗`,
        `🔗 Squad chain: ${words.map((x) => x.word).join(" → ")}`
      );
    }
  };

  return (
    <div>
      <TurnBanner g={g} me={me} />
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-600">
        <span>Relay Progress</span>
        <span className="font-mono text-violet-900">
          {d.words.length} / {d.target} words
        </span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#efece2]">
        <div
          className="h-full rounded-full pro-btn-accent transition-all"
          style={{ width: `${(d.words.length / d.target) * 100}%` }}
        />
      </div>
      <div className="mb-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-[#111111] bg-white p-2.5">
        {d.words.length === 0 && (
          <p className="p-1 text-xs text-zinc-600">
            Relay open! First word must start with "{need}".
          </p>
        )}
        {d.words.map((w, i) => (
          <span
            key={i}
            className="rounded-lg bg-[#efece2] px-2.5 py-1 text-xs font-bold text-violet-900 shadow"
            title={"by " + w.by}
          >
            {w.word}
            <span className="ml-1 text-[9px] font-normal text-zinc-600">
              ({w.by.split(" ")[0]})
            </span>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl pro-btn-accent font-mono text-xl font-black text-[#111111] shadow">
          {need}
        </div>
        <input
          value={val}
          disabled={!mine}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={
            mine ? `Word starting with ${need}…` : "Waiting for teammate…"
          }
          className="flex-1 rounded-xl border border-[#111111] bg-[#efece2] px-3.5 text-[#111111] placeholder-slate-500 outline-none focus:border-violet-400 disabled:opacity-40"
        />
        <button
          onClick={submit}
          disabled={!mine}
          className="rounded-xl pro-btn-accent px-5 font-bold text-[#111111] disabled:opacity-40"
        >
          Link
        </button>
      </div>
      {mine && (
        <button
          onClick={() => {
            sounds.playPop();
            mutate((cur) =>
              nextTurn(
                feed(cur, {
                  name: me.name,
                  text: "passed the baton →",
                  ts: Date.now(),
                  sys: true,
                })
              )
            );
          }}
          className="mt-2 w-full rounded-xl bg-[#efece2] py-2 text-xs font-semibold text-zinc-600 hover:bg-slate-700"
        >
          Pass turn to next teammate →
        </button>
      )}
      {err && (
        <p className="mt-2 text-center text-xs font-semibold text-rose-800">
          {err}
        </p>
      )}
    </div>
  );
}

/* ================= 6. Target Blitz Co-op (Tactical Range HUD) ================= */
export function BlitzGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as {
    total: number;
    target: number;
    hits: Record<string, number>;
  };
  const rnd = useMemo(() => {
    const r = mulberry32(g.seed + d.total * 977);
    return { x: 14 + r() * 72, y: 16 + r() * 68 };
  }, [g.seed, d.total]);
  const [pops, setPops] = useState<{ id: number; x: number; y: number }[]>([]);
  const [streak, setStreak] = useState(0);

  const hit = () => {
    if (g.phase === "done") return;
    sounds.playPop();
    setStreak((s) => s + 1);
    setPops((p) => [...p.slice(-5), { id: Date.now(), x: rnd.x, y: rnd.y }]);
    const total = d.total + 1;
    mutate((cur) =>
      bumpScore(
        {
          ...cur,
          data: {
            ...cur.data,
            total,
            hits: {
              ...cur.data.hits,
              [me.id]: (cur.data.hits[me.id] || 0) + 1,
            },
          },
        },
        me.id,
        1
      )
    );
    if (total >= d.target) {
      finish(`the squad cleared all ${d.target} live targets 🎯`);
    }
  };

  const size = Math.max(40, 66 - Math.floor(d.total / 2) * 2);
  const top = [...g.players].sort(
    (a, b) => (d.hits[b.uid] || 0) - (d.hits[a.uid] || 0)
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-bold">
        <span className="text-zinc-600">
          Live Tactical Range{" "}
          {streak >= 3 && (
            <span className="ml-1.5 rounded bg-[#fef9c3] px-1.5 py-0.5 text-[10px] text-amber-900">
              🔥 {streak}x Streak
            </span>
          )}
        </span>
        <span className="font-mono text-amber-900">
          🎯 {d.total} / {d.target}
        </span>
      </div>
      <div className="mb-2.5 h-2.5 overflow-hidden rounded-full bg-[#efece2]">
        <div
          className="h-full rounded-full pro-btn-accent transition-all duration-150"
          style={{ width: `${Math.min(100, (d.total / d.target) * 100)}%` }}
        />
      </div>
      <div
        className="relative mb-3 h-56 overflow-hidden rounded-2xl border border-emerald-500/25 bg-white sm:h-64"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(16,185,129,0.08) 0%, transparent 70%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 32px 32px, 32px 32px",
        }}
      >
        <button
          onClick={hit}
          style={{
            left: `${rnd.x}%`,
            top: `${rnd.y}%`,
            width: size,
            height: size,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 cursor-crosshair transition-transform active:scale-75"
        >
          <span className="relative flex h-full w-full items-center justify-center rounded-full border-2 border-[#111111] bg-gradient-to-br from-rose-500 to-amber-500 shadow-[0_0_25px_rgba(244,63,94,0.75)]">
            <span className="h-1/2 w-1/2 rounded-full border-2 border-[#111111] bg-white/20" />
          </span>
        </button>
        {pops.map((p) => (
          <span
            key={p.id}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className="pop-fade pointer-events-none absolute font-mono text-lg font-black text-emerald-800"
          >
            +1 HIT
          </span>
        ))}
        <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[10px] text-zinc-600">
          MULTI-DEVICE LIVE RANGE · EVERY HIT SYNCS INSTANTLY
        </p>
      </div>
      <div className="space-y-1.5">
        {top.map((p) => (
          <div key={p.uid} className="flex items-center gap-2">
            <img
              src={p.avatar}
              alt=""
              className="h-5 w-5 rounded-full object-cover"
            />
            <span className="w-24 shrink-0 truncate text-xs font-semibold">
              {p.name}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#efece2]">
              <div
                className="h-full rounded-full pro-btn-accent transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    ((d.hits[p.uid] || 0) / d.target) * 100
                  )}%`,
                }}
              />
            </div>
            <span className="w-8 text-right font-mono text-xs font-bold text-zinc-800">
              {d.hits[p.uid] || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= 7. Code Breakers ================= */
export function CodeGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as {
    code: number[];
    guesses: { by: string; guess: number[]; exact: number; partial: number }[];
    maxGuesses: number;
  };
  const [draft, setDraft] = useState<number[]>([0, 1, 2, 3]);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const mine = isMyTurn(g, me.id);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: 9999 });
  }, [d.guesses.length]);

  const setPeg = (symIdx: number) => {
    if (!mine) return;
    sounds.playClack();
    setDraft((prev) =>
      prev.map((v, idx) => (idx === selectedSlot ? symIdx : v))
    );
    setSelectedSlot((s) => (s + 1) % 4);
  };

  const submit = () => {
    const s = scoreGuess(d.code, draft);
    sounds.playTick();
    const guesses = [
      ...d.guesses,
      { by: me.name, guess: [...draft], exact: s.exact, partial: s.partial },
    ];
    mutate((cur) =>
      nextTurn(
        feed(
          bumpScore({ ...cur, data: { ...cur.data, guesses } }, me.id, s.exact),
          {
            name: me.name,
            text: `tested ${draft
              .map((i) => CODE_SYMBOLS[i])
              .join("")} → ${s.exact}🎯 ${s.partial}🔆`,
            ts: Date.now(),
            sys: true,
          }
        )
      )
    );
    if (s.exact === 4) {
      finish(
        `the squad cracked the 4-peg vault code 🧩 in ${guesses.length} turns (${me.name} unlocked it!)`
      );
    } else if (guesses.length >= d.maxGuesses) {
      finish(
        `vault locked after ${d.maxGuesses} attempts 🧩 — secret sequence was ${d.code
          .map((i) => CODE_SYMBOLS[i])
          .join("")}`
      );
    }
  };

  return (
    <div>
      <TurnBanner g={g} me={me} />
      <div
        ref={logRef}
        className="mb-3 max-h-36 space-y-1.5 overflow-y-auto rounded-2xl border border-[#111111] bg-white p-2.5"
      >
        {d.guesses.length === 0 && (
          <p className="p-2 text-center text-xs text-zinc-600">
            🎯 = exact symbol &amp; slot · 🔆 = right symbol, different slot
          </p>
        )}
        {d.guesses.map((gu, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl bg-[#efece2] px-3 py-1.5"
          >
            <span className="w-5 font-mono text-[10px] font-bold text-zinc-600">
              #{i + 1}
            </span>
            <span className="text-lg tracking-widest">
              {gu.guess.map((s) => CODE_SYMBOLS[s]).join(" ")}
            </span>
            <span className="ml-auto font-mono text-xs font-bold text-emerald-800">
              {gu.exact}🎯
            </span>
            <span className="font-mono text-xs font-bold text-amber-900">
              {gu.partial}🔆
            </span>
            <span className="w-16 truncate text-right text-[10px] text-zinc-600">
              {gu.by}
            </span>
          </div>
        ))}
      </div>

      {/* Active 4-Peg Tray */}
      <div className="mb-2.5 flex items-center justify-center gap-2.5">
        {draft.map((v, i) => (
          <button
            key={i}
            type="button"
            disabled={!mine}
            onClick={() => setSelectedSlot(i)}
            className={`flex h-13 w-13 items-center justify-center rounded-2xl border-2 text-2xl shadow-inner transition ${
              selectedSlot === i && mine
                ? "border-violet-400 bg-[#e9d5ff] scale-105"
                : "border-[#111111] bg-[#efece2]"
            } disabled:opacity-45`}
          >
            {CODE_SYMBOLS[v]}
          </button>
        ))}
      </div>

      {/* Direct Palette */}
      <div className="mb-3 flex justify-center gap-1.5">
        {CODE_SYMBOLS.map((sym, idx) => (
          <button
            key={sym}
            type="button"
            disabled={!mine}
            onClick={() => setPeg(idx)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#111111] bg-[#f7f5ee] text-xl transition hover:border-violet-400 hover:bg-[#efece2] active:scale-95 disabled:opacity-35"
          >
            {sym}
          </button>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={!mine}
        className="w-full rounded-xl pro-btn-accent py-2.5 text-sm font-bold text-[#111111] shadow-lg disabled:opacity-40"
      >
        Test Sequence ({d.guesses.length}/{d.maxGuesses})
      </button>
    </div>
  );
}

/* ================= 8. Story Relay ================= */
export function StoryGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as {
    prompt: string;
    parts: { by: string; text: string }[];
    target: number;
  };
  const [val, setVal] = useState("");
  const mine = isMyTurn(g, me.id);
  const wordCount = val.trim() ? val.trim().split(/\s+/).length : 0;

  const submit = () => {
    const t = val.trim().replace(/\s+/g, " ");
    if (t.split(" ").length < 2) return;
    sounds.playSend();
    setVal("");
    const parts = [
      ...d.parts,
      { by: me.name, text: t.split(" ").slice(0, 9).join(" ") },
    ];
    mutate((cur) =>
      nextTurn(bumpScore({ ...cur, data: { ...cur.data, parts } }, me.id, 1))
    );
    if (parts.length >= d.target) {
      const story = d.prompt + " " + parts.map((p) => p.text).join(" ");
      finish(
        `the squad co-wrote a ${parts.length}-part story 📖`,
        `📖 Squad Story: "${story}"`
      );
    }
  };

  return (
    <div>
      <TurnBanner g={g} me={me} />
      <div className="mb-3 max-h-36 overflow-y-auto rounded-2xl border border-[#111111] bg-white p-3.5 text-sm leading-relaxed">
        <span className="font-bold italic text-fuchsia-300">{d.prompt}</span>{" "}
        {d.parts.map((p, i) => (
          <span key={i} className="text-zinc-800" title={"by " + p.by}>
            {p.text}{" "}
          </span>
        ))}
        {d.parts.length === 0 && (
          <span className="text-zinc-600">…continue the sentence!</span>
        )}
      </div>
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-600">
        <span>
          Chapter {d.parts.length + 1} of {d.target}
        </span>
        <span
          className={`font-mono ${
            wordCount >= 2 && wordCount <= 9
              ? "text-emerald-800"
              : "text-zinc-600"
          }`}
        >
          {wordCount}/8 words
        </span>
      </div>
      <div className="flex gap-2">
        <input
          value={val}
          disabled={!mine}
          maxLength={80}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={
            mine ? "Add 2–8 words to the story…" : "Waiting for teammate…"
          }
          className="flex-1 rounded-xl border border-[#111111] bg-[#efece2] px-3.5 py-2.5 text-[#111111] placeholder-slate-500 outline-none focus:border-fuchsia-400 disabled:opacity-40"
        />
        <button
          onClick={submit}
          disabled={!mine || wordCount < 2}
          className="rounded-xl pro-btn-accent px-5 font-bold text-[#111111] disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
