# ⚡ ChatArena Live — Real-Time Squad Messenger & Multiplayer Arcade

A real-time cross-device group messenger combined with **15 collaborative & competitive live mini-games**, live interactive room polls, and a collaborative trip/movie/weather/forex search planner — ready for one-click deployment on **Vercel**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fthehindunew-eng%2FChat-with-Game)

---

## ✨ Highlights

### 💬 Realistic Cross-Device Messenger
- **Real Multi-Device Cloud Sync (Supabase Realtime + Postgres + Presence)**: Share any room URL (`https://your-app.vercel.app/friday-squad`) across iPhones, Androids, and laptops — messages, live typing indicators, online presence, reactions, polls, and game moves sync in milliseconds.
- **Messenger UX**:
  - **Reply Quotes (`↩`)** with one-tap scroll & highlight flash to the original message
  - **Live Message Editing (`✏️`)** synced across every device
  - **Read Receipts (`✓` Sent → `✓✓` Seen)** with reader tooltips
  - **Live Squad Polls (`🗳️` or `/poll Question | Option 1 | Option 2`)** with animated percentage bars
  - **Studio Portrait Avatars, Photo Upload & Live Camera Selfie** + custom status vibes
  - **Voice Notes (`🎤`), Speech Dictation (`🗣️`), File Sharing (`📎`) & GIF/Emoji Pickers**
  - **Smart AI Regulars (`Auto` / `On` / `Off`)**: Lifelike squad teammates keep solo sessions fun and automatically step back as soon as 2+ real humans join the room.

### 🎮 15 Tactile Multiplayer Games (`Type GAME` or tap `🎮 Arcade`)
1. **🧨 Defuse the Bomb** — Brushed-steel C4 chassis, strike LEDs, realistic curved copper-strand wires & electric snip sparks
2. **🔴 Connect Four Teams** — Molded royal-blue board with hover preview & spring-gravity disc drops
3. **⭕ Tic-Tac-Toe Teams** — Neon frosted-glass grid with vector glow & hover preview
4. **🚀 Starship Emergency Repair** — Engineering bridge telemetry HUD with per-console passcodes & radio broadcast
5. **⚡ Quantum Reactor Sync** — Spinning magnetic plasma containment rings & harmonic capacitor pads
6. **🧩 Sliding Puzzle Relay** — Beveled metallic 8-puzzle with click + keyboard arrow support
7. **🏁 WikiRace Live** — Navigate real Wikipedia hyperlinks from start page to target first
8. **🕵️ Emoji Cipher Hack**, **🔗 Word Chain Relay**, **🎯 Target Blitz Co-op**, **🧩 Code Breakers**, **📖 Story Relay**
9. **🎬 Camera Challenges**: *Pass the Controller*, *The NPC Walk*, and *Speedrun Your Desk* with Web Audio synthesized arcade beats

---

## 🚀 Deploying to Vercel

This repository is pre-configured with `vercel.json` (Vite static asset caching, `/api/*` serverless routing, and clean `/<room-slug>` SPA rewrites).

1. Push this repository to GitHub and import **`thehindunew-eng/Chat-with-Game`** in **[vercel.com/new](https://vercel.com/new)**.
2. Framework Preset is automatically detected as **Vite** (`npm run build` → `dist`).
3. *(Optional — a live Supabase cloud instance with Row Level Security is already pre-wired)*: To use your own Supabase project, run `supabase/migrations/20261022_init_chatarena.sql` in the Supabase SQL Editor and add in **Vercel → Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy** — open `https://<your-vercel-domain>/friday-squad` on two devices and type **`GAME`**!

---

## 🛠️ Local Development

```bash
npm install
npm run dev
```

Production typecheck & build verification:

```bash
npm run build
```
