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

  const navigate = useCallback(async (title: string, reset = false) => {
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
      mutate((cur) => bumpScore({
        ...cur,
        data: {
          ...cur.data,
          routes: {
            ...cur.data.routes,
            [me.id]: { path, clicks: Math.max(0, path.length - 1) },
          },
        },
      }, me.id, 0));
      if (next.title.toLowerCase() === d.target.toLowerCase() && !finishedRef.current) {
        finishedRef.current = true;
        sounds.playFanfare();
        mutate((cur) => ({
          ...cur,
          data: {
            ...cur.data,
            routes: {
              ...cur.data.routes,
              [me.id]: { path, clicks: Math.max(0, path.length - 1), finishedAt: Date.now() },
            },
          },
        }));
        finish(`${me.name} won WikiRace: ${path.join(" → ")} (${path.length - 1} link${path.length === 2 ? "" : "s"}) 🏁`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that Wikipedia page");
    } finally {
      setLoading(false);
    }
  }, [d.target, finish, me.id, mutate]);

  useEffect(() => {
    pathRef.current = [d.start];
    finishedRef.current = false;
    navigate(d.start, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.seed]);

  const matchingLinks = page?.links.filter((l) => l.toLowerCase().includes(filter.toLowerCase())) || [];
  const visibleLinks = [...matchingLinks]
    .sort((a, b) => Number(b.toLowerCase() === d.target.toLowerCase()) - Number(a.toLowerCase() === d.target.toLowerCase()))
    .slice(0, filter ? 250 : 140);
  const racers = Object.entries(d.routes || {}).sort((a, b) => b[1].path.length - a[1].path.length);

  return (
    <div>
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-sky-300">Start</p>
          <p className="truncate text-sm font-bold text-white">{d.start}</p>
        </div>
        <span className="text-xl">🏁</span>
        <div className="min-w-0 text-right">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Target</p>
          <p className="truncate text-sm font-bold text-emerald-200">{d.target}</p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-bold text-sky-200">Your clicks: {Math.max(0, pathRef.current.length - 1)}</span>
        <span className="text-slate-400">💡 {d.hint}</span>
        <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(page?.title || d.start)}`} target="_blank" rel="noreferrer" className="ml-auto font-bold text-sky-300 underline">Open source ↗</a>
      </div>

      <div className="mb-2 max-h-16 overflow-y-auto rounded-xl bg-black/25 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
        <b className="text-slate-300">Your route:</b> {pathRef.current.join(" → ")}
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-8 text-center">
          <p className="text-2xl animate-pulse">🌐</p>
          <p className="mt-2 text-xs font-bold text-sky-300">Loading real Wikipedia article and its internal links…</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-center">
          <p className="text-sm font-bold text-rose-200">{error}</p>
          <div className="mt-2 flex justify-center gap-2">
            <button onClick={() => navigate(page?.title || d.start)} className="rounded-xl bg-rose-500/20 px-4 py-2 text-xs font-bold text-rose-100">Retry</button>
            <button onClick={() => finish("WikiRace was ended because Wikipedia could not be reached — no winner declared")} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300">End race &amp; unlock</button>
          </div>
        </div>
      )}

      {!loading && !error && page && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
          <div className="border-b border-white/10 p-3">
            <p className="text-lg font-black text-white">{page.title}</p>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-400">{page.extract || "No short introduction available — follow the links below."}</p>
          </div>
          <div className="flex gap-2 border-b border-white/10 p-2">
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Filter ${page.links.length} internal links…`}
              className="min-w-0 flex-1 rounded-xl bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-sky-400" />
            <button onClick={() => navigate(d.start, true)} className="rounded-xl bg-slate-800 px-3 text-xs font-bold text-slate-300 hover:bg-slate-700">↺ Restart</button>
          </div>
          <div className="grid max-h-52 grid-cols-1 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
            {visibleLinks.map((link) => (
              <button key={link} onClick={() => navigate(link)}
                className={`rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:bg-sky-500/20 ${link.toLowerCase() === d.target.toLowerCase() ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400" : "bg-slate-800/60 text-sky-200"}`}>
                {link} <span className="float-right text-slate-500">→</span>
              </button>
            ))}
            {!visibleLinks.length && <p className="col-span-2 p-4 text-center text-xs text-slate-500">No links match “{filter}”. Clear the filter or restart the route.</p>}
            {matchingLinks.length > visibleLinks.length && <p className="col-span-2 p-2 text-center text-[10px] text-slate-500">Showing {visibleLinks.length} of {matchingLinks.length} links — use the filter to narrow the full list.</p>}
          </div>
        </div>
      )}

      {racers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {racers.slice(0, 5).map(([uid, route]) => {
            const p = g.players.find((x) => x.uid === uid);
            return <span key={uid} className="rounded-lg bg-slate-800/70 px-2 py-1 text-[10px] text-slate-300">{p?.name || "Racer"}: {route.path[route.path.length - 1]} · {route.clicks} clicks</span>;
          })}
        </div>
      )}
      <p className="mt-2 text-center text-[10px] text-slate-500">Only actual Wikipedia internal hyperlinks are used. First player to reach the exact target wins for the room.</p>
    </div>
  );
}