export default function handler(
  _req: unknown,
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (body: Record<string, unknown>) => void };
  }
) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).json({
    ok: true,
    service: "ChatArena Live",
    runtime: "vercel-serverless",
    supabaseConfigured: Boolean(
      process.env.VITE_SUPABASE_URL || "https://usumbcandrmcacujfbck.supabase.co"
    ),
    region: process.env.VERCEL_REGION || "global",
    ts: Date.now(),
  });
}
