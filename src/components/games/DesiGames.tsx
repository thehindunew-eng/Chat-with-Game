import type { GameProps } from "./CoopGames";
import { bumpScore, feed } from "../../lib/gameSync";
import { sounds } from "../../lib/audio";

// ==========================================
// 1. FILMY / MIRZAPUR / PANCHAYAT DIALOGUE BAAZI
// ==========================================
export function DialogueBaaziGame({ g, me, mutate, finish }: GameProps) {
  const { qIdx, score, streak, questions, votes, revealed, lastCorrect } = g.data;
  const q = questions[qIdx] || questions[0];

  const pickOption = (optIdx: number) => {
    if (g.phase === "done" || revealed) return;
    const correct = optIdx === q.answer;
    if (correct) sounds.playSuccess();
    else sounds.playError();

    const nextScore = score + (correct ? 1 : 0);
    const nextStreak = correct ? (streak || 0) + 1 : 0;

    mutate((cur) => {
      if (cur.phase === "done" || cur.data.revealed) return cur;
      const updated = bumpScore(cur, me.id, correct ? 25 : 0);
      return feed(
        {
          ...updated,
          data: {
            ...cur.data,
            votes: { ...cur.data.votes, [me.name]: optIdx },
            score: nextScore,
            streak: nextStreak,
            revealed: true,
            lastCorrect: correct,
          },
        },
        {
          name: me.name,
          text: correct
            ? `🎬 एकदम कड़क डायलॉग पकड़ा: “${q.options[optIdx]}” 🔥`
            : `😅 गलत डायलॉग बोल दिया: “${q.options[optIdx]}”`,
          ts: Date.now(),
        }
      );
    });

    setTimeout(() => {
      if (qIdx + 1 >= questions.length) {
        if (nextScore >= 3) {
          finish(
            `डायलॉग किंग पलटन (${nextScore}/${questions.length} सही मारे!) 🎬👑`,
            "पूरे मोहल्ले में भौकाल टाइट!"
          );
        } else {
          finish(
            `डायलॉग बाज़ी में ${nextScore}/${questions.length} आए — आज पंचायत और हेरा फेरी दोबारा देखो भाई 😂`
          );
        }
      } else {
        mutate((cur) =>
          cur.phase === "done"
            ? cur
            : {
                ...cur,
                data: {
                  ...cur.data,
                  qIdx: qIdx + 1,
                  votes: {},
                  revealed: false,
                  lastCorrect: null,
                },
              }
        );
      }
    }, 1250);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-orange-950/70 via-slate-900 to-amber-950/60 px-4 py-2.5">
        <span className="text-xs font-extrabold text-amber-200">
          🎬 डायलॉग #{Math.min(qIdx + 1, questions.length)}/{questions.length} ·{" "}
          <span className="text-orange-300">{q.vibe}</span>
        </span>
        <div className="flex items-center gap-2 text-xs font-black">
          {streak >= 2 && (
            <span className="rounded-full border border-orange-400/50 bg-orange-500/20 px-2.5 py-0.5 text-orange-200 animate-pulse">
              🔥 स्ट्रीक x{streak}
            </span>
          )}
          <span className="text-emerald-300">स्कोर: {score}/{questions.length}</span>
        </div>
      </div>

      <div className="rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-slate-900 via-indigo-950/60 to-amber-950/40 p-6 text-center shadow-2xl">
        <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-amber-400">
          ✦ आइकॉनिक देसी डायलॉग पूरा करो ✦
        </p>
        <p className="text-xl font-black leading-relaxed text-white sm:text-2xl">{q.quote}</p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {q.options.map((opt: string, idx: number) => {
          const isRight = revealed && idx === q.answer;
          const isWrong = revealed && votes[me.name] === idx && idx !== q.answer;
          const voters = Object.entries(votes || {})
            .filter(([, v]) => v === idx)
            .map(([k]) => k);
          return (
            <button
              key={idx}
              disabled={revealed || g.phase === "done"}
              onClick={() => pickOption(idx)}
              className={`rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-black transition active:scale-95 ${
                isRight
                  ? "border-emerald-400 bg-emerald-500/25 text-emerald-100 shadow-lg shadow-emerald-500/20"
                  : isWrong
                  ? "border-rose-400 bg-rose-500/25 text-rose-100"
                  : "border-white/10 bg-slate-800/80 text-white hover:border-amber-400/60 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span>
                  <span className="mr-2 text-amber-400">{["A.", "B.", "C.", "D."][idx]}</span>
                  {opt}
                </span>
                {voters.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
                    {voters.join(", ")}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div
          className={`rounded-xl border px-4 py-2 text-center text-xs font-black ${
            lastCorrect
              ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/60 text-rose-300"
          }`}
        >
          {lastCorrect
            ? "🔥 ग़ज़ब गुरु!! एकदम असली फिल्मी खिलाड़ी हो!"
            : `😅 अरे भाई! सही जवाब “${q.options[q.answer]}” था!`}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. GOLGAPPA VS MOMOS STREET COUNTER CHALLENGE
// ==========================================
export function GolgappaChaatGame({ g, me, mutate, finish }: GameProps) {
  const { orderIdx, totalOrders, orders, golgappaScore, momosScore, served, spicyCombo, lastServedBy } =
    g.data;
  const currentOrder = orders[orderIdx % orders.length];

  const servePlate = (choice: "golgappa" | "momos", bonusSukhi = false) => {
    if (g.phase === "done") return;
    const rightItem = choice === currentOrder.item;
    if (rightItem) sounds.playClack();
    else sounds.playError();

    const nextServed = served + (rightItem ? 1 : 0);
    const nextGol = golgappaScore + (choice === "golgappa" && rightItem ? 1 : 0);
    const nextMom = momosScore + (choice === "momos" && rightItem ? 1 : 0);
    const nextCombo = rightItem ? spicyCombo + (bonusSukhi ? 2 : 1) : 0;
    const nextIdx = orderIdx + 1;

    mutate((cur) => {
      if (cur.phase === "done") return cur;
      const updated = bumpScore(cur, me.id, rightItem ? (bonusSukhi ? 20 : 12) : 0);
      return feed(
        {
          ...updated,
          data: {
            ...cur.data,
            orderIdx: nextIdx,
            served: nextServed,
            golgappaScore: nextGol,
            momosScore: nextMom,
            spicyCombo: nextCombo,
            lastServedBy: `${me.name} (${rightItem ? "सही प्लेट ✅" : "गलत प्लेट ❌"})`,
          },
        },
        {
          name: me.name,
          text: rightItem
            ? `🥟 ${currentOrder.customer} को गरमा-गरम प्लेट सर्व की! 🔥`
            : `😅 अरे गलत प्लेट दे दी भाई!`,
          ts: Date.now(),
        }
      );
    });

    if (nextIdx >= totalOrders) {
      const champ =
        nextGol >= nextMom
          ? "UP पानी के बताशे (गोलगप्पा) गैंग जीता! 🫧🏆"
          : "दिल्ली-NCR तंदूरी मोमोज़ गैंग जीता! 🥟🏆";
      finish(`${nextServed}/${totalOrders} प्लेट सफ़ाचट · ${champ}`, `कॉम्बो x${nextCombo}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-rose-950/70 px-4 py-2.5">
        <span className="text-xs font-extrabold text-amber-200">
          🛒 ठेला ऑर्डर #{Math.min(orderIdx + 1, totalOrders)}/{totalOrders}
        </span>
        <div className="flex items-center gap-3 text-xs font-black">
          <span className="text-emerald-300">🫧 गोलगप्पा: {golgappaScore}</span>
          <span className="text-rose-300">🥟 मोमोज़: {momosScore}</span>
        </div>
      </div>

      {currentOrder && (
        <div className="space-y-2 rounded-3xl border-2 border-amber-400/40 bg-slate-900/95 p-5 text-center shadow-xl">
          <p className="text-xs font-bold text-amber-300">
            ग्राहक खड़ा है: <span className="font-black text-white">{currentOrder.customer}</span>
          </p>
          <p className="text-xl font-black text-white sm:text-2xl">
            {currentOrder.item === "golgappa"
              ? "🫧 “भैया एक प्लेट ठंडे तीखे पानी के गोलगप्पे लगाना!”"
              : "🥟 “भैया एक प्लेट गरम लाल चटनी + मेयोनीज़ मोमोज़ लगाओ!”"}
          </p>
          <span className="inline-block rounded-full border border-orange-400/30 bg-orange-500/15 px-3 py-1 text-xs font-extrabold text-orange-300">
            मसाला डिमांड: {currentOrder.spice}
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          disabled={g.phase === "done"}
          onClick={() => servePlate("golgappa")}
          className="rounded-2xl border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-600/30 to-teal-950/60 p-4 text-left transition hover:brightness-110 active:scale-95"
        >
          <div className="mb-1 text-2xl">🫧🌿🌶️</div>
          <div className="text-sm font-black text-emerald-200">UP स्पेशल गोलगप्पा सर्व करो</div>
          <div className="text-[11px] text-emerald-300/80">पुदीना-हींग का खट्टा-तीखा पानी + आलू चना</div>
        </button>

        <button
          disabled={g.phase === "done"}
          onClick={() => servePlate("momos")}
          className="rounded-2xl border-2 border-rose-400/50 bg-gradient-to-br from-rose-600/30 to-orange-950/60 p-4 text-left transition hover:brightness-110 active:scale-95"
        >
          <div className="mb-1 text-2xl">🥟🔥🥫</div>
          <div className="text-sm font-black text-rose-200">दिल्ली-NCR मोमोज़ प्लेट लगाओ</div>
          <div className="text-[11px] text-rose-300/80">कट्टई ज़हर लाल मिर्च चटनी + क्रीमी मेयो</div>
        </button>
      </div>

      <button
        disabled={g.phase === "done"}
        onClick={() => servePlate(currentOrder?.item || "golgappa", true)}
        className="w-full rounded-xl border border-amber-400/50 bg-amber-500/20 py-2.5 text-xs font-black text-amber-200 transition hover:bg-amber-500/30 active:scale-95"
      >
        🎁 “भैया लास्ट में फ्री सूखी पापड़ी / एक्स्ट्रा चटनी भी डाल दो!” (+2 बोनस कॉम्बो)
      </button>

      {lastServedBy && (
        <p className="text-center text-xs text-slate-400">
          पिछला ऑर्डर: <span className="font-bold text-white">{lastServedBy}</span> · कॉम्बो 🔥 x{spicyCombo}
        </p>
      )}
    </div>
  );
}

// ==========================================
// 3. AUTO BHAIYA METER BARGAIN DUEL
// ==========================================
const BARGAIN_MOVES = [
  {
    id: "walkaway",
    icon: "🚶‍♂️",
    title: "“रहने दो भैया, हम मेट्रो/पैदल ही निकल लेंगे!”",
    desc: "देसी ब्रह्मास्त्र — किराया ₹65-95 कम कराता है, पर ऑटो भैया गुस्सा हो सकते हैं!",
    dropRange: [65, 95] as [number, number],
    patienceCost: 30,
  },
  {
    id: "local",
    icon: "😎",
    title: "“अरे भैया यहीं के लोकल हैं, रोज़ ₹100 में जाते हैं!”",
    desc: "भरोसेमंद डायलॉग — किराया ₹45-65 कम + संतुलित रिस्क!",
    dropRange: [45, 65] as [number, number],
    patienceCost: 18,
  },
  {
    id: "sharing",
    icon: "🤝",
    title: "“चलो बीच का लगा लो भाई, चाय-पानी के ₹20 ऊपर ले लेना!”",
    desc: "भाईचारा मूव — किराया ₹25-40 कम + ऑटो भैया का मूड खुश!",
    dropRange: [25, 40] as [number, number],
    patienceCost: -10,
  },
];

const DRIVER_COMEBACKS = [
  "अरे बाबूजी CNG ₹92 किलो हो गई है, थोड़ा तो रहम करो गरीब आदमी पे! 😅",
  "चलो बैठो जल्दी पीछे पुलिस वाला चालान काट देगा, और कम मत कराओ! 🛺",
  "हद कर दी भाई साहब आपने तो बोहनी के टाइम! 😂",
  "अच्छा ठीक है, आगे जाम मिला तो गली वाले शॉर्टकट से निकाल लेंगे! 🔥",
];

export function AutoBargainGame({ g, me, mutate, finish }: GameProps) {
  const { route, distance, initialAsk, fairFare, driverName, currentAsk, meterPatience, turnsLeft, log } =
    g.data;
  const targetMax = fairFare + 35;

  const makeMove = (moveIdx: number) => {
    if (g.phase === "done") return;
    const move = BARGAIN_MOVES[moveIdx];
    const drop =
      move.dropRange[0] + Math.floor(Math.random() * (move.dropRange[1] - move.dropRange[0] + 1));
    const nextAsk = Math.max(fairFare - 10, currentAsk - drop);
    const nextPatience = Math.min(100, meterPatience - move.patienceCost);
    const nextTurns = turnsLeft - 1;

    if (nextPatience <= 0) {
      sounds.playError();
      mutate((cur) =>
        feed(
          {
            ...cur,
            data: {
              ...cur.data,
              currentAsk: nextAsk,
              meterPatience: 0,
              turnsLeft: nextTurns,
              log: [
                ...cur.data.log.slice(-3),
                { speaker: me.name, text: move.title },
                { speaker: "driver", text: "जाओ भाई तुम पैदल ही जाओ!! *भुर्रर्रर्र* 🛺💨" },
              ],
            },
          },
          { name: me.name, text: `😂 ज़्यादा मोल-भाव कर दिया — ${driverName} ऑटो भगा ले गए!`, ts: Date.now() }
        )
      );
      finish(`${driverName} गुस्से में ऑटो भगा के निकल गए — अब पैदल चलो! 🛺💨😂`);
      return;
    }

    if (nextAsk <= targetMax) {
      sounds.playSuccess();
      const saved = initialAsk - nextAsk;
      mutate((cur) =>
        bumpScore(
          feed(
            {
              ...cur,
              data: {
                ...cur.data,
                currentAsk: nextAsk,
                meterPatience: nextPatience,
                turnsLeft: nextTurns,
                log: [
                  ...cur.data.log.slice(-3),
                  { speaker: me.name, text: move.title },
                  { speaker: "driver", text: `चलो बैठो भाई ₹${nextAsk} डन! तुम भी क्या याद रखोगे! 🤝🛺` },
                ],
              },
            },
            { name: me.name, text: `🛺 डील लॉक! ₹${initialAsk} से सीधा ₹${nextAsk} कराया! 🔥`, ts: Date.now() }
          ),
          me.id,
          35
        )
      );
      finish(
        `मोल-भाव चैंपियन! ₹${initialAsk} वाले ऑटो को ₹${nextAsk} में लॉक किया 🛺💸`,
        `पूरे ₹${saved} बचा लिए!`
      );
      return;
    }

    if (nextTurns <= 0) {
      sounds.playError();
      finish(`ऑटो भैया ₹${nextAsk} से नीचे नहीं माने (टारगेट ₹${targetMax} था) 😅`);
      return;
    }

    sounds.playPop();
    const comeback = DRIVER_COMEBACKS[Math.floor(Math.random() * DRIVER_COMEBACKS.length)];
    mutate((cur) =>
      feed(
        {
          ...cur,
          data: {
            ...cur.data,
            currentAsk: nextAsk,
            meterPatience: nextPatience,
            turnsLeft: nextTurns,
            log: [
              ...cur.data.log.slice(-3),
              { speaker: me.name, text: move.title },
              { speaker: "driver", text: `${comeback} (अब ₹${nextAsk} बोल रहे हैं)` },
            ],
          },
        },
        { name: me.name, text: `किराया घटाकर ₹${nextAsk} तक ले आए!`, ts: Date.now() }
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-yellow-400/50 bg-gradient-to-r from-amber-500/20 via-emerald-950/70 to-yellow-500/20 p-4">
        <div>
          <p className="text-xs font-extrabold text-yellow-300">
            🛺 {driverName} · <span className="text-emerald-300">{distance}</span>
          </p>
          <p className="text-sm font-black text-white sm:text-base">{route}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-slate-400">अभी का किराया</p>
            <p className="font-mono text-2xl font-black text-amber-300">₹{currentAsk}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-emerald-400">सही देसी रेट</p>
            <p className="font-mono text-lg font-black text-emerald-300">≤ ₹{targetMax}</p>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs font-extrabold">
          <span className="text-slate-300">😤 ऑटो भैया का सब्र मीटर: {meterPatience}%</span>
          <span className="text-amber-300">बाकी मौके: {turnsLeft}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              meterPatience > 55
                ? "bg-emerald-500"
                : meterPatience > 28
                ? "bg-amber-500"
                : "bg-rose-500 animate-pulse"
            }`}
            style={{ width: `${Math.max(5, meterPatience)}%` }}
          />
        </div>
      </div>

      <div className="max-h-36 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/90 p-3">
        {(log || []).map((entry: { speaker: string; text: string }, i: number) => (
          <div
            key={i}
            className={`rounded-xl px-3 py-2 text-xs ${
              entry.speaker === "driver"
                ? "border border-yellow-500/30 bg-yellow-500/10 text-yellow-100"
                : "ml-6 border border-violet-500/30 bg-violet-500/15 text-violet-100"
            }`}
          >
            <span className="mr-1.5 font-black">
              {entry.speaker === "driver" ? `🛺 ${driverName}:` : `🗣️ ${entry.speaker}:`}
            </span>
            {entry.text}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {BARGAIN_MOVES.map((m, idx) => (
          <button
            key={m.id}
            disabled={g.phase === "done"}
            onClick={() => makeMove(idx)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-800/85 px-4 py-3 text-left transition hover:border-yellow-400/60 hover:bg-slate-800 active:scale-[0.99]"
          >
            <span className="shrink-0 text-2xl">{m.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-white sm:text-sm">{m.title}</p>
              <p className="text-[11px] text-slate-400">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
