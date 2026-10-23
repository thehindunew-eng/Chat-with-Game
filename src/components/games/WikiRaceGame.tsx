import { useCallback, useEffect, useRef, useState } from "react";
import type { GameProps } from "./CoopGames";
import { fetchWikiPage, type WikiPage } from "../../lib/classic";
import { bumpScore } from "../../lib/gameSync";
import { sounds } from "../../lib/audio";

interface RouteData {
  start: string;
  target: string;
  hint: string;
  routes: Record<string, { path: string[]; clicks: number; finishedAt?: number }>;
}

export default function WikiRaceGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as RouteData;
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const pathRef = useRef<string[]>([d.start]);
  const finishedRef = useRef(false);

  const navigate = useCallback(
    async (title: string, reset = false) => {
      if (finishedRef.current) return;
      setLoading(true);
      setError("");
      setFilter("");
      try {
        const next = await fetchWikiPage(title);
        setPage(next);
        pathRef.current = reset ? [next.title] : [...pathRef.current, next.title];
        const path = pathRef.current;
        sounds.playPop();
        mutate((cur) =>
          bumpScore(
            {
              ...cur,
              data: {
                ...cur.data,
                routes: {
                  ...cur.data.routes,
                  [me.id]: { path, clicks: Math.max(0, path.length - 1) },
                },
              },
            },
            me.id,
            0
          )
        );
        if (
          next.title.toLowerCase() === d.target.toLowerCase() &&
          !finishedRef.current
        ) {
          finishedRef.current = true;
          sounds.playFanfare();
          mutate((cur) =>
            bumpScore(
              {
                ...cur,
                data: {
                  ...cur.data,
                  routes: {
                    ...cur.data.routes,
                    [me.id]: {
                      path,
                      clicks: Math.max(0, path.length - 1),
                      finishedAt: Date.now(),
                    },
                  },
                },
              },
              me.id,
              25
            )
          );
          finish(
            `${me.name} won Wiki Speedrun in ${path.length - 1} clicks (${path.join(" → ")})`
          );
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not load Wikipedia article"
        );
      } finally {
        setLoading(false);
      }
    },
    [d.target, finish, me.id, me.name, mutate]
  );

  useEffect(() => {
    pathRef.current = [d.start];
    finishedRef.current = false;
    navigate(d.start, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.seed]);

  const matchingLinks =
    page?.links.filter((l) =>
      l.toLowerCase().includes(filter.toLowerCase())
    ) || [];
  const visibleLinks = [...matchingLinks]
    .sort(
      (a, b) =>
        Number(b.toLowerCase() === d.target.toLowerCase()) -
        Number(a.toLowerCase() === d.target.toLowerCase())
    )
    .slice(0, filter ? 200 : 120);
  const racers = Object.entries(d.routes || {}).sort(
    (a, b) => b[1].path.length - a[1].path.length
  );

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#f3f0e6] p-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-black uppercase text-zinc-500">
            START
          </p>
          <p className="truncate text-sm font-black text-[#111111]">{d.start}</p>
        </div>
        <span className="font-mono text-sm font-black">→</span>
        <div className="min-w-0 text-right">
          <p className="font-mono text-[10px] font-black uppercase text-[#15803d]">
            TARGET
          </p>
          <p className="truncate text-sm font-black text-[#111111]">{d.target}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-lg border-[1.5px] border-[#111111] bg-[#ffe500] px-2.5 py-0.5 font-mono font-black">
          CLICKS: {Math.max(0, pathRef.current.length - 1)}
        </span>
        <span className="text-zinc-600">{d.hint}</span>
      </div>

      {loading && (
        <div className="pro-panel rounded-xl p-6 text-center font-mono text-xs font-black uppercase">
          Loading Wikipedia link graph…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border-2 border-[#111111] bg-[#fecaca] p-4 text-center">
          <p className="text-xs font-bold text-[#991b1b]">{error}</p>
          <div className="mt-2 flex justify-center gap-2">
            <button
              onClick={() => navigate(page?.title || d.start)}
              className="pro-btn rounded-lg px-3 py-1.5 text-xs font-black"
            >
              RETRY
            </button>
            <button
              onClick={() => finish("Wiki Speedrun aborted — Wikipedia unreachable")}
              className="pro-btn rounded-lg px-3 py-1.5 text-xs font-black"
            >
              END RACE
            </button>
          </div>
        </div>
      )}

      {!loading && !error && page && (
        <div className="overflow-hidden rounded-xl border-2 border-[#111111] bg-white">
          <div className="flex items-center justify-between border-b-2 border-[#111111] bg-[#f7f5ee] px-3 py-2">
            <p className="truncate text-sm font-black">{page.title}</p>
            <button
              onClick={() => navigate(d.start, true)}
              className="pro-btn rounded-lg px-2.5 py-1 font-mono text-[10px] font-black"
            >
              ↺ RESET
            </button>
          </div>
          <div className="border-b border-zinc-200 p-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`Filter ${page.links.length} links…`}
              className="pro-input w-full rounded-lg px-3 py-1.5 text-xs font-semibold"
            />
          </div>
          <div className="chat-scroll grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto p-2.5 sm:grid-cols-2">
            {visibleLinks.map((link) => (
              <button
                key={link}
                onClick={() => navigate(link)}
                className={`rounded-lg border-[1.5px] border-[#111111] px-2.5 py-1.5 text-left text-xs font-bold transition ${
                  link.toLowerCase() === d.target.toLowerCase()
                    ? "bg-[#bbf7d0] font-black"
                    : "bg-[#f7f5ee] hover:bg-[#ffe500]"
                }`}
              >
                <span className="truncate">{link}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {racers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {racers.slice(0, 5).map(([uid, route]) => {
            const p = g.players.find((x) => x.uid === uid);
            return (
              <span
                key={uid}
                className="rounded-lg border border-[#111111] bg-white px-2 py-0.5 font-mono text-[10px] font-bold"
              >
                {p?.name || "Player"}: {route.clicks} clicks
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
