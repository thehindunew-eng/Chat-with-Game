# ChatArena — Pro Multiplayer Chat & Arcade

A clean, high-contrast **white/cream (`#FFFFFF` / `#F7F5EE`) + sharp `#111111` black-bordered** multiplayer gaming messenger & 18-mode competitive arcade built with **React 18**, **TypeScript**, **Tailwind CSS**, **Web Audio synthesis**, and **Supabase Realtime**.

## Key Features

- **Crisp Pro-Gamer UI System** — Pure white/warm-cream surfaces, sharp `2px solid #111111` mechanical cards & tactile buttons, zero visual clutter, and concise competitive English UX.
- **Persistent ELO Rating & Rank Progression** — Track live ELO (`Rookie` → `Bronze` → `Silver` → `Gold` → `Platinum` → `Diamond`), win counters, win streaks, and best reaction times (`ms`) across matches, synced across presence in real time.
- **Interactive Ready-Check Lobbies & 1-Click Rematch** — Post live **Ready Check** cards right inside chat (`✓ READY UP` + `▶ START`) and review post-match scoreboard cards complete with `+/- ELO` deltas and **1-Click `↻ REMATCH`**.
- **Standings Leaderboard & Quick Callouts** — Live room ELO leaderboard (`STANDINGS` / `ROSTER` sidebar), 1-click gamer callouts (`GG`, `WP`, `GLHF`, `1v1?`, `NICE SHOT`, `REMATCH`), SVG callout stamps, polls, replies, reactions, and `✓✓` read receipts.
- **18 Live-Synced Multiplayer Games** — Including **Flick Aim Lab** (`ms` target precision), **Sector Recall** (4-wave radar memory), **Strike · Guard · Feint** (best-of-5 mind-game duel), **Tic-Tac-Toe Pro**, **Four-in-a-Row**, **15-Slide Sprint**, **Wiki Speedrun**, **Defuse Protocol**, **Orbital Repair**, **Core Sync**, **Cryptogram**, **Lexicon Relay**, **Target Blitz**, **Vault Breaker**, **Lore Builder**, and **WebRTC Camera Challenges**.
- **Zero-Config Vercel Ready** — Live cross-device sync via Supabase Realtime (`room_messages`, `room_games`, `save_room_game` atomic RPC) with automatic `BroadcastChannel` local fallback.

## Local Development

```bash
npm install
npm run dev
```

## Production Verification

```bash
npm run typecheck
npm run build
```
