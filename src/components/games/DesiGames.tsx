import { useEffect, useState } from "react";
import type { GameProps } from "./CoopGames";
import { bumpScore, feed, generateSectorPattern } from "../../lib/gameSync";
import { sounds } from "../../lib/audio";

// ==========================================
// 1. FLICK AIM LAB (`aimlab`) — Live ms Reaction & Accuracy Grid
// ==========================================
export function DialogueBaaziGame({ g, me, mutate, finish }: GameProps) {
  const {
    targetCell,
    bonusCell,
    hits,
    misses,
    quota,
    combo,
    bestMs,
    totalMs,
    spawnedAt,
    lastShotBy,
    lastMs,
  } = g.data;

  const avgMs = hits > 0 ? Math.round(totalMs / hits) : 0;
  const totalShots = hits + misses;
  const accuracy = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 100;

  const shootCell = (idx: number) => {
    if (g.phase === "done") return;
    const now = Date.now();
    const isPrimary = idx === targetCell;
    const isBonus = idx === bonusCell;

    if (!isPrimary && !isBonus) {
      sounds.playError();
      mutate((cur) =>
        cur.phase === "done"
          ? cur
          : {
              ...cur,
              data: {
                ...cur.data,
                misses: (cur.data.misses || 0) + 1,
                combo: 0,
              },
            }
      );
      return;
    }

    sounds.playClack();
    const reaction = Math.max(95, Math.min(2500, now - (spawnedAt || now - 350)));
    const nextHits = hits + 1;
    const nextCombo = combo + 1;
    const nextBest = bestMs ? Math.min(bestMs, reaction) : reaction;
    const nextTotalMs = totalMs + reaction;
    const pts = (isBonus ? 18 : 10) + Math.min(10, nextCombo * 2);

    let nextTarget = Math.floor(Math.random() * 16);
    if (nextTarget === idx) nextTarget = (idx + 7) % 16;
    const nextBonus = (nextTarget + 5 + (nextHits % 7)) % 16;

    mutate((cur) => {
      if (cur.phase === "done") return cur;
      const updated = bumpScore(cur, me.id, pts);
      return feed(
        {
          ...updated,
          data: {
            ...cur.data,
            targetCell: nextTarget,
            bonusCell: nextBonus,
            hits: nextHits,
            combo: nextCombo,
            bestMs: nextBest,
            totalMs: nextTotalMs,
            spawnedAt: Date.now(),
            lastShotBy: me.name,
            lastMs: reaction,
          },
        },
        {
          name: me.name,
          text: `Hit ${isBonus ? "CRIT " : ""}target in ${reaction}ms (x${nextCombo})`,
          ts: now,
        }
      );
    });

    if (nextHits >= quota) {
      const finalAvg = Math.round(nextTotalMs / nextHits);
      sounds.playSuccess();
      finish(
        `Aim Lab cleared — ${finalAvg}ms avg reaction · ${accuracy}% accuracy 🎯`,
        `Fastest flick: ${nextBest}ms`
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* Telemetry HUD */}
      <div className="grid grid-cols-4 gap-2">
        <div className="pro-cream rounded-xl px-3 py-2 text-center">
          <p className="text-[10px] font-black uppercase text-zinc-500">Targets</p>
          <p className="font-mono text-base font-black text-zinc-950">
            {hits}/{quota}
          </p>
        </div>
        <div className="pro-cream rounded-xl px-3 py-2 text-center">
          <p className="text-[10px] font-black uppercase text-zinc-500">Avg Speed</p>
          <p className="font-mono text-base font-black text-zinc-950">
            {avgMs ? `${avgMs}ms` : "—"}
          </p>
        </div>
        <div className="pro-cream rounded-xl px-3 py-2 text-center">
          <p className="text-[10px] font-black uppercase text-zinc-500">Accuracy</p>
          <p className="font-mono text-base font-black text-zinc-950">{accuracy}%</p>
        </div>
        <div className="pro-cream rounded-xl px-3 py-2 text-center">
          <p className="text-[10px] font-black uppercase text-zinc-500">Streak</p>
          <p className="font-mono text-base font-black text-zinc-950">x{combo}</p>
        </div>
      </div>

      {/* Crisp 4x4 Esports Aim Grid */}
      <div className="mx-auto grid max-w-[360px] grid-cols-4 gap-2 rounded-2xl border-2 border-[#111111] bg-[#f3f0e6] p-3 shadow-[4px_4px_0px_#111111]">
        {Array.from({ length: 16 }, (_, idx) => {
          const isPrimary = idx === targetCell;
          const isBonus = idx === bonusCell;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => shootCell(idx)}
              className={`flex aspect-square items-center justify-center rounded-xl border-2 border-[#111111] font-mono text-lg font-black transition-transform active:scale-90 ${
                isPrimary
                  ? "bg-[#ffe500] text-[#111111] shadow-[2.5px_2.5px_0px_#111111]"
                  : isBonus
                  ? "bg-[#fecaca] text-[#991b1b] shadow-[2.5px_2.5px_0px_#111111]"
                  : "bg-white text-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {isPrimary ? "◎" : isBonus ? "★" : "·"}
            </button>
          );
        })}
      </div>

      <p className="text-center font-mono text-xs text-zinc-600">
        {lastShotBy
          ? `Last hit: ${lastShotBy} (${lastMs}ms) · ◎ Primary (+10) · ★ Crit (+18)`
          : "Click ◎ Yellow or ★ Red targets as fast as possible — avoid empty tiles."}
      </p>
    </div>
  );
}

// ==========================================
// 2. SECTOR RECALL (`sector`) — 4-Wave Tactical Radar Memory
// ==========================================
export function GolgappaChaatGame({ g, me, mutate, finish }: GameProps) {
  const { wave, maxWaves, pattern, cleared, wrongCell, lives, revealUntil } = g.data;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(iv);
  }, []);

  const revealing = now < revealUntil;

  const clickTile = (idx: number) => {
    if (g.phase === "done" || revealing || cleared.includes(idx)) return;

    if (pattern.includes(idx)) {
      sounds.playClack();
      const nextCleared = [...cleared, idx];

      if (nextCleared.length >= pattern.length) {
        if (wave >= maxWaves) {
          sounds.playSuccess();
          mutate((cur) =>
            bumpScore(
              { ...cur, data: { ...cur.data, cleared: nextCleared } },
              me.id,
              25
            )
          );
          finish(`Sector Recall cleared — all ${maxWaves} radar waves swept cleanly 🧠`);
          return;
        }

        const nextWave = wave + 1;
        const nextPattern = generateSectorPattern(g.seed, nextWave);
        sounds.playSuccess();
        mutate((cur) =>
          feed(
            bumpScore(
              {
                ...cur,
                data: {
                  ...cur.data,
                  wave: nextWave,
                  pattern: nextPattern,
                  cleared: [],
                  wrongCell: null,
                  revealUntil: Date.now() + 1700,
                },
              },
              me.id,
              15
            ),
            {
              name: me.name,
              text: `Wave ${wave} cleared — advancing to Wave ${nextWave}`,
              ts: Date.now(),
            }
          )
        );
        return;
      }

      mutate((cur) =>
        bumpScore(
          {
            ...cur,
            data: { ...cur.data, cleared: nextCleared, wrongCell: null },
          },
          me.id,
          5
        )
      );
    } else {
      sounds.playError();
      const nextLives = lives - 1;
      if (nextLives <= 0) {
        mutate((cur) => ({
          ...cur,
          data: { ...cur.data, lives: 0, wrongCell: idx },
        }));
        finish(`Radar sweep failed on Wave ${wave}/${maxWaves} 💥`);
        return;
      }
      mutate((cur) =>
        feed(
          {
            ...cur,
            data: {
              ...cur.data,
              lives: nextLives,
              wrongCell: idx,
              revealUntil: Date.now() + 1100,
            },
          },
          {
            name: me.name,
            text: `Tripped decoy sector — ${nextLives} shield(s) left`,
            ts: Date.now(),
          }
        )
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border-2 border-[#111111] bg-[#f3f0e6] px-4 py-2.5 text-xs font-black">
        <span>
          WAVE {wave}/{maxWaves} · {revealing ? "MEMORIZE SECTORS" : `SWEEP ${cleared.length}/${pattern.length}`}
        </span>
        <span className="font-mono">
          SHIELDS: {"●".repeat(Math.max(0, lives))}
          {"○".repeat(Math.max(0, 3 - lives))}
        </span>
      </div>

      <div className="mx-auto grid max-w-[350px] grid-cols-4 gap-2 rounded-2xl border-2 border-[#111111] bg-white p-3 shadow-[4px_4px_0px_#111111]">
        {Array.from({ length: 16 }, (_, idx) => {
          const isTarget = pattern.includes(idx);
          const isCleared = cleared.includes(idx);
          const isWrong = wrongCell === idx;
          return (
            <button
              key={idx}
              type="button"
              disabled={revealing || g.phase === "done"}
              onClick={() => clickTile(idx)}
              className={`flex aspect-square items-center justify-center rounded-xl border-2 border-[#111111] font-mono text-base font-black transition ${
                revealing && isTarget
                  ? "bg-[#ffe500] text-[#111111]"
                  : isCleared
                  ? "bg-[#bbf7d0] text-[#14532d]"
                  : isWrong
                  ? "bg-[#fecaca] text-[#991b1b]"
                  : "bg-[#f7f5ee] text-zinc-400 hover:bg-[#efece2]"
              }`}
            >
              {revealing && isTarget ? "◆" : isCleared ? "✓" : isWrong ? "✕" : idx + 1}
            </button>
          );
        })}
      </div>

      <p className="text-center font-mono text-xs text-zinc-600">
        {revealing
          ? "Scanning active sectors — lock positions into memory…"
          : "Select all marked sectors without tripping an empty tile."}
      </p>
    </div>
  );
}

// ==========================================
// 3. STRIKE · GUARD · FEINT (`duel`) — Tactical Read Duel
// ==========================================
type Stance = "strike" | "guard" | "feint";

const STANCES: { id: Stance; label: string; icon: string; rule: string }[] = [
  { id: "strike", label: "STRIKE", icon: "⚔️", rule: "Crushes FEINT · Parried by GUARD" },
  { id: "guard", label: "GUARD", icon: "🛡️", rule: "Parries STRIKE · Broken by FEINT" },
  { id: "feint", label: "FEINT", icon: "⚡", rule: "Breaks GUARD · Caught by STRIKE" },
];

export function AutoBargainGame({ g, me, mutate, finish }: GameProps) {
  const { rivalName, rivalStyle, playerHp, rivalHp, round, streak, log } = g.data;

  const lockStance = (pick: Stance) => {
    if (g.phase === "done") return;
    const options: Stance[] = ["strike", "guard", "feint"];
    const aiPick = options[Math.floor(Math.random() * 3)];

    let outcome: "win" | "lose" | "clash" = "clash";
    if (pick === aiPick) outcome = "clash";
    else if (
      (pick === "strike" && aiPick === "feint") ||
      (pick === "guard" && aiPick === "strike") ||
      (pick === "feint" && aiPick === "guard")
    ) {
      outcome = "win";
    } else {
      outcome = "lose";
    }

    const nextStreak = outcome === "win" ? streak + 1 : 0;
    const dmgToRival = outcome === "win" ? 34 + (nextStreak >= 2 ? 12 : 0) : outcome === "clash" ? 6 : 0;
    const dmgToPlayer = outcome === "lose" ? 32 : outcome === "clash" ? 6 : 0;

    const nextRivalHp = Math.max(0, rivalHp - dmgToRival);
    const nextPlayerHp = Math.max(0, playerHp - dmgToPlayer);

    const summaryLine =
      outcome === "win"
        ? `R${round}: ${me.name} read ${aiPick.toUpperCase()} with ${pick.toUpperCase()} (-${dmgToRival} HP${
            nextStreak >= 2 ? " CRIT!" : ""
          })`
        : outcome === "lose"
        ? `R${round}: Opponent countered ${pick.toUpperCase()} with ${aiPick.toUpperCase()} (-${dmgToPlayer} HP)`
        : `R${round}: Both threw ${pick.toUpperCase()} — neutral clash (-6 HP each)`;

    if (outcome === "win") sounds.playClack();
    else if (outcome === "lose") sounds.playError();
    else sounds.playPop();

    mutate((cur) =>
      feed(
        bumpScore(
          {
            ...cur,
            data: {
              ...cur.data,
              playerHp: nextPlayerHp,
              rivalHp: nextRivalHp,
              round: round + 1,
              streak: nextStreak,
              log: [...(cur.data.log || []).slice(-3), { tag: outcome.toUpperCase(), text: summaryLine }],
            },
          },
          me.id,
          outcome === "win" ? 20 : 2
        ),
        { name: me.name, text: summaryLine, ts: Date.now() }
      )
    );

    if (nextRivalHp <= 0) {
      sounds.playSuccess();
      finish(`KO Victory vs ${rivalName} with ${nextPlayerHp} HP remaining ⚔️`);
    } else if (nextPlayerHp <= 0) {
      finish(`Defeated by ${rivalName} in Round ${round}`);
    }
  };

  return (
    <div className="space-y-3">
      {/* Dual Fighter Health Bars */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl border-2 border-[#111111] bg-[#f3f0e6] p-3.5">
        <div>
          <div className="mb-1 flex justify-between text-xs font-black">
            <span>SQUAD</span>
            <span className="font-mono">{playerHp} HP</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-[#111111] bg-white">
            <div
              className="h-full bg-[#22c55e] transition-all duration-300"
              style={{ width: `${playerHp}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs font-black">
            <span className="truncate">{rivalName}</span>
            <span className="font-mono">{rivalHp} HP</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-[#111111] bg-white">
            <div
              className="h-full bg-[#ef4444] transition-all duration-300"
              style={{ width: `${rivalHp}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-bold text-zinc-600 px-1">
        <span>ROUND {round} · Style: {rivalStyle}</span>
        {streak >= 2 && (
          <span className="rounded-md border border-[#111111] bg-[#ffe500] px-2 py-0.5 font-mono text-[11px] font-black text-[#111111]">
            READ STREAK x{streak}
          </span>
        )}
      </div>

      {/* Combat Feed */}
      <div className="space-y-1.5 rounded-xl border-2 border-[#111111] bg-white p-3">
        {(log || []).map((entry: { tag: string; text: string }, idx: number) => (
          <div key={idx} className="font-mono text-xs text-zinc-800">
            <span className="mr-2 inline-block rounded border border-[#111111] bg-[#f3f0e6] px-1.5 py-0.5 text-[10px] font-black">
              {entry.tag}
            </span>
            {entry.text}
          </div>
        ))}
      </div>

      {/* 3 Stance Switches */}
      <div className="grid gap-2 sm:grid-cols-3">
        {STANCES.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={g.phase === "done"}
            onClick={() => lockStance(s.id)}
            className="pro-btn rounded-xl p-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">{s.icon}</span>
              <span className="font-mono text-xs font-black">{s.label}</span>
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-zinc-600">{s.rule}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
