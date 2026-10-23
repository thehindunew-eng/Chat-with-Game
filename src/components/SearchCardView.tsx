import type { SearchCard } from "../lib/types";

export default function SearchCardView({
  card,
  preview,
  meName,
  onVotePoll,
}: {
  card: SearchCard;
  preview?: boolean;
  meName?: string;
  onVotePoll?: (optionId: string) => void;
}) {
  const totalVotes =
    card.poll?.reduce((sum, opt) => sum + opt.votes.length, 0) || 0;

  return (
    <div
      className={`overflow-hidden rounded-3xl border transition ${
        preview
          ? "border-teal-500/40 bg-gradient-to-br from-teal-950/35 via-slate-900 to-slate-900/95"
          : "border-teal-500/30 bg-gradient-to-br from-teal-950/25 via-slate-900 to-slate-900 shadow-xl"
      }`}
    >
      {/* Header Pill */}
      <div className="flex items-center gap-2 border-b border-teal-500/20 bg-teal-500/10 px-4 py-2.5">
        <span className="text-lg">{card.icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-teal-300">
          {card.label}
        </span>
        <span className="ml-auto max-w-[55%] truncate font-mono text-[11px] text-teal-400/90">
          "{card.query}"
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {/* Main Headline */}
        <p className="text-[15px] font-bold leading-relaxed text-teal-50">
          {card.headline}
        </p>

        {card.detail && (
          <p className="mt-1.5 text-xs leading-relaxed text-teal-200/80">
            {card.detail}
          </p>
        )}

        {/* Day-by-day Itinerary Timeline */}
        {card.itinerary && card.itinerary.length > 0 && (
          <div className="mt-3.5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-400">
              🗓 Suggested Squad Itinerary
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {card.itinerary.map((it, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-teal-500/20 bg-black/30 p-3 shadow-inner"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-teal-200">
                    <span className="flex items-center gap-1">
                      <span>{it.icon || "📍"}</span>
                      {it.day}
                    </span>
                    {it.estCost && (
                      <span className="rounded bg-teal-500/20 px-1.5 py-0.5 font-mono text-[10px] text-teal-300">
                        {it.estCost}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-snug text-slate-300">
                    {it.activity}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Split Estimate */}
        {card.splitEstimate && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-teal-400/20 bg-teal-950/30 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <div>
                <p className="text-xs font-bold text-white">
                  Estimated Total: {card.splitEstimate.total}
                </p>
                <p className="text-[10px] text-teal-300">
                  Split among {card.splitEstimate.count}{" "}
                  {card.splitEstimate.count === 1 ? "person" : "people"}:{" "}
                  <b className="text-white">{card.splitEstimate.perPerson} each</b>
                </p>
              </div>
            </div>
            <span className="rounded-xl bg-teal-500/20 px-2.5 py-1 font-mono text-xs font-black text-teal-300">
              ~{card.splitEstimate.perPerson}
            </span>
          </div>
        )}

        {/* Rows (Weather forecast, stations, hotels, places) */}
        {card.rows && card.rows.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {card.rows.slice(0, 5).map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/25 px-3 py-2 ${
                  r.url
                    ? "transition hover:border-teal-500/40 hover:bg-black/40"
                    : "pointer-events-none"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-teal-100">
                    {r.title}
                  </span>
                  {r.subtitle && (
                    <span className="block truncate text-[11px] text-teal-300/75">
                      {r.subtitle}
                    </span>
                  )}
                </span>
                {r.meta && (
                  <span className="shrink-0 font-mono text-xs font-semibold text-teal-200">
                    {r.meta}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}

        {/* Deep Action Links */}
        <div className="mt-3.5 flex flex-wrap gap-2">
          {card.links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              title={l.note}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-400/30 bg-teal-400/10 px-3 py-2 text-xs font-bold text-teal-100 shadow transition hover:bg-teal-400/25 active:scale-95"
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
              <span className="text-[10px] text-teal-400">↗</span>
            </a>
          ))}
        </div>

        {/* Sharer's Custom Note */}
        {card.note && (
          <div className="mt-2.5 rounded-xl border-l-4 border-violet-400 bg-violet-500/15 p-2.5 text-xs text-violet-100">
            ✍️ <b className="font-bold text-white">Sharer's Note:</b> {card.note}
          </div>
        )}

        {/* Interactive Live Card Poll */}
        {card.askVote && card.poll && card.poll.length > 0 && (
          <div className="mt-3.5 rounded-2xl border border-amber-400/25 bg-slate-950/60 p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-amber-200">
              <span>🗳️ Live Squad Decision Poll</span>
              <span className="text-[10px] font-semibold text-slate-400">
                {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
              </span>
            </div>
            <div className="space-y-1.5">
              {card.poll.map((opt) => {
                const pct = totalVotes
                  ? Math.round((opt.votes.length / totalVotes) * 100)
                  : 0;
                const voted = !!meName && opt.votes.includes(meName);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={preview || !onVotePoll}
                    onClick={() => onVotePoll?.(opt.id)}
                    title={opt.votes.length ? `Voted: ${opt.votes.join(", ")}` : "Tap to vote"}
                    className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-xs transition ${
                      voted
                        ? "border-teal-400/60 bg-teal-500/15 text-white"
                        : "border-white/10 bg-slate-900/80 text-slate-200 hover:border-white/25"
                    } ${preview ? "cursor-default opacity-80" : "active:scale-[0.99]"}`}
                  >
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500/25 to-violet-500/20 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {voted ? "✓ " : ""}
                        {opt.label}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] font-bold text-teal-300">
                        {opt.votes.length} ({pct}%)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tips & Guidance */}
        {card.tips && card.tips.length > 0 && (
          <p className="mt-2.5 text-[11px] italic text-teal-300/80">
            💡 {card.tips[0]}
          </p>
        )}

        {/* Source citation */}
        {card.source && (
          <a
            href={card.source.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 inline-block max-w-full truncate text-[10px] font-semibold text-teal-400/80 underline hover:text-teal-200"
          >
            📖 Verified source: {card.source.title}
          </a>
        )}
      </div>
    </div>
  );
}
