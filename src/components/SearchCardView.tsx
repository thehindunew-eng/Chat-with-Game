import type { SearchCard } from "../lib/types";

export default function SearchCardView({
  card,
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
    <div className="overflow-hidden rounded-2xl border-2 border-[#111111] bg-white text-[#111111] shadow-[3px_3px_0px_#111111]">
      {/* Header Strip */}
      <div className="flex items-center gap-2 border-b-2 border-[#111111] bg-[#f3f0e6] px-4 py-2">
        <span className="text-base">{card.icon}</span>
        <span className="font-mono text-[10px] font-black uppercase tracking-widest">
          {card.label}
        </span>
        <span className="ml-auto max-w-[55%] truncate font-mono text-[11px] font-semibold text-zinc-600">
          "{card.query}"
        </span>
      </div>

      <div className="p-4">
        <p className="text-sm font-black leading-snug text-[#111111]">
          {card.headline}
        </p>

        {card.detail && (
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            {card.detail}
          </p>
        )}

        {card.itinerary && card.itinerary.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {card.itinerary.map((it, i) => (
              <div
                key={i}
                className="rounded-xl border-[1.5px] border-[#111111] bg-[#f7f5ee] p-2.5"
              >
                <div className="flex items-center justify-between text-xs font-black">
                  <span>
                    {it.icon || "📍"} {it.day}
                  </span>
                  {it.estCost && (
                    <span className="rounded border border-[#111111] bg-[#ffe500] px-1.5 py-0.5 font-mono text-[10px]">
                      {it.estCost}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-700">{it.activity}</p>
              </div>
            ))}
          </div>
        )}

        {card.splitEstimate && (
          <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-[#111111] bg-[#bbf7d0] px-3.5 py-2">
            <div>
              <p className="text-xs font-black">
                Total: {card.splitEstimate.total}
              </p>
              <p className="text-[11px] font-medium text-zinc-800">
                Split across {card.splitEstimate.count} players:{" "}
                <b>{card.splitEstimate.perPerson} each</b>
              </p>
            </div>
            <span className="rounded-lg border-[1.5px] border-[#111111] bg-white px-2.5 py-1 font-mono text-xs font-black">
              {card.splitEstimate.perPerson}
            </span>
          </div>
        )}

        {card.rows && card.rows.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {card.rows.slice(0, 5).map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-2.5 rounded-xl border-[1.5px] border-[#111111] bg-[#f7f5ee] px-3 py-2 ${
                  r.url ? "hover:bg-[#ffe500]/50" : "pointer-events-none"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-[#111111]">
                    {r.title}
                  </span>
                  {r.subtitle && (
                    <span className="block truncate text-[11px] text-zinc-600">
                      {r.subtitle}
                    </span>
                  )}
                </span>
                {r.meta && (
                  <span className="shrink-0 font-mono text-xs font-black">
                    {r.meta}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="pro-btn inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold"
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
              <span className="text-[10px]">↗</span>
            </a>
          ))}
        </div>

        {card.note && (
          <div className="mt-2.5 rounded-lg border-l-4 border-[#111111] bg-[#f3f0e6] px-3 py-2 text-xs font-medium text-zinc-800">
            <b>Note:</b> {card.note}
          </div>
        )}

        {card.askVote && card.poll && card.poll.length > 0 && (
          <div className="mt-3 border-t-2 border-[#111111] pt-3">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-black uppercase">
              <span>SQUAD VOTE</span>
              <span>{totalVotes} VOTES</span>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {card.poll.map((opt) => {
                const voted = meName ? opt.votes.includes(meName) : false;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!onVotePoll}
                    onClick={() => onVotePoll?.(opt.id)}
                    className={`rounded-lg border-[1.5px] border-[#111111] px-2.5 py-1.5 text-left text-xs font-bold transition ${
                      voted
                        ? "bg-[#ffe500] font-black"
                        : "bg-[#f7f5ee] hover:bg-zinc-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{opt.label}</span>
                      <span className="font-mono text-[11px] font-black">
                        {opt.votes.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
