import { useEffect, useRef, useState } from "react";
import type { User } from "../lib/types";
import { uid } from "../lib/types";
import { AVATAR_SEEDS, STATUS_PRESETS, makeAvatar } from "../lib/data";
import { detectDevice, displayHost, normalizeRoomSlug } from "../lib/store";
import { isSupabaseConfigured } from "../lib/supabase";

interface Props {
  initialRoom: string;
  savedUser: User | null;
  onJoin: (user: User, room: string) => void;
  full?: boolean;
}

const ROOM_PRESETS = ["lobby", "friday-squad", "goa-trip", "game-night"];

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const min = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - min) / 2,
        (img.height - min) / 2,
        min,
        min,
        0,
        0,
        size,
        size
      );
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function JoinScreen({
  initialRoom,
  savedUser,
  onJoin,
  full,
}: Props) {
  const [name, setName] = useState(savedUser?.name || "");
  const [bio, setBio] = useState(savedUser?.bio || STATUS_PRESETS[0]);
  const [room, setRoom] = useState(initialRoom);
  const [seedIdx, setSeedIdx] = useState(0);
  const [customAvatar, setCustomAvatar] = useState<string | null>(
    savedUser?.avatar?.startsWith("data:image/jpeg") ? savedUser.avatar : null
  );
  const [cameraOpen, setCameraOpen] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const effectiveAvatar =
    customAvatar || makeAvatar(name.trim() || "Player", AVATAR_SEEDS[seedIdx]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErr("Please choose an image file for your profile photo.");
      return;
    }
    try {
      setCustomAvatar(await resizeImage(f));
      setErr("");
    } catch {
      setErr("Couldn't read that image — try another photo.");
    }
  };

  const openSelfie = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("Camera capture isn't available in this browser — upload an image instead.");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 320 }, facingMode: "user" },
      });
      streamRef.current = s;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setErr("Camera permission denied — choose a studio portrait or upload an image.");
    }
  };

  const snapSelfie = () => {
    const v = videoRef.current;
    if (!v) return;
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const min = Math.min(v.videoWidth || 320, v.videoHeight || 320);
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      v,
      ((v.videoWidth || 320) - min) / 2,
      ((v.videoHeight || 320) - min) / 2,
      min,
      min,
      0,
      0,
      size,
      size
    );
    setCustomAvatar(canvas.toDataURL("image/jpeg", 0.86));
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setErr("");
  };

  const submit = () => {
    const n = name.trim();
    if (!n) return setErr("Enter your display name to join the room.");
    const r = normalizeRoomSlug(room);
    onJoin(
      {
        id: savedUser?.id || uid(),
        name: n.slice(0, 24),
        avatar: effectiveAvatar,
        bio: bio.trim() || STATUS_PRESETS[0],
        device: detectDevice(),
      },
      r
    );
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-slate-950 p-4 py-8">
      {/* Subtle realistic atmospheric lighting */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Top Live Status Pill */}
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3.5 py-1 text-xs font-semibold text-emerald-200 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span>
              {isSupabaseConfigured
                ? "Live Cloud Multiplayer · Cross-Device Sync Ready"
                : "Instant Browser Sync Ready"}
            </span>
          </div>
        </div>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-violet-600 via-indigo-600 to-teal-500 text-2xl shadow-xl shadow-violet-950/60">
            ⚡
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Chat<span className="bg-gradient-to-r from-violet-400 to-teal-300 bg-clip-text text-transparent">Arena</span>{" "}
            <span className="align-middle text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Live
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Real-time messenger across phones &amp; laptops. Type{" "}
            <span className="rounded-md border border-amber-400/30 bg-amber-500/15 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-300">
              GAME
            </span>{" "}
            and the whole room drops into a tactile squad game.
          </p>
        </div>

        {full && (
          <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm text-amber-200">
            🚫 <b>Room /{initialRoom} is full</b> (20/20 active members). Enter any custom room slug below to spin up a private room instantly.
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
          {/* Profile Portrait Section */}
          <div className="mb-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={effectiveAvatar}
                  alt="Your avatar"
                  className="h-20 w-20 rounded-full border-2 border-violet-400/60 object-cover shadow-lg shadow-violet-950/50"
                />
                <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-slate-900 bg-emerald-400" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">Choose your portrait</p>
                <p className="text-xs text-slate-400">
                  Pick a look below, snap a selfie, or upload a photo.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-xl border border-white/10 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                  >
                    📷 Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={openSelfie}
                    className="rounded-xl border border-white/10 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-teal-300 transition hover:bg-slate-700"
                  >
                    🤳 Camera Selfie
                  </button>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>

            {cameraOpen && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-2.5">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="mirror mx-auto aspect-square max-h-52 rounded-xl object-cover"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      streamRef.current?.getTracks().forEach((t) => t.stop());
                      setCameraOpen(false);
                    }}
                    className="flex-1 rounded-xl bg-slate-800 py-2 text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={snapSelfie}
                    className="flex-1 rounded-xl bg-teal-500 py-2 text-xs font-black text-slate-950"
                  >
                    📸 Capture Portrait
                  </button>
                </div>
              </div>
            )}

            {/* Studio Avatar Presets Row */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              {AVATAR_SEEDS.map((s, idx) => {
                const src = makeAvatar(name.trim() || "Player", s);
                const selected = !customAvatar && seedIdx === idx;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setCustomAvatar(null);
                      setSeedIdx(idx);
                    }}
                    className={`shrink-0 rounded-full p-0.5 transition ${
                      selected
                        ? "bg-gradient-to-tr from-violet-500 to-teal-400 scale-105"
                        : "opacity-65 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={src}
                      alt={`Avatar style ${idx + 1}`}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display Name */}
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Display Name
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (err) setErr("");
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            maxLength={24}
            placeholder="e.g. Rohan, Ananya, Alex…"
            className="mb-3.5 w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm font-medium text-white placeholder-slate-500 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/25"
          />

          {/* Status Vibe */}
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Current Status
          </label>
          <div className="mb-3.5 flex flex-wrap gap-1.5">
            {STATUS_PRESETS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setBio(st)}
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                  bio === st
                    ? "bg-violet-600/30 text-violet-200 ring-1 ring-violet-400"
                    : "bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Room Slug + Instant Room Chips */}
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Room Channel Link
          </label>
          <div className="mb-2 flex items-center rounded-xl border border-white/10 bg-slate-950/80 px-3.5 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/25">
            <span className="mr-0.5 max-w-[48%] truncate select-none font-mono text-xs text-slate-500">
              {displayHost()}/
            </span>
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              maxLength={24}
              placeholder="lobby"
              className="w-full bg-transparent py-2.5 font-mono text-sm font-bold text-teal-300 placeholder-slate-600 outline-none"
            />
          </div>
          <div className="mb-5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Quick rooms:</span>
            {ROOM_PRESETS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoom(r)}
                className={`rounded-lg px-2 py-0.5 font-mono text-[11px] font-semibold transition ${
                  normalizeRoomSlug(room) === r
                    ? "bg-teal-500/20 text-teal-300 ring-1 ring-teal-400/40"
                    : "bg-slate-800/70 text-slate-400 hover:text-slate-200"
                }`}
              >
                /{r}
              </button>
            ))}
          </div>

          {err && (
            <p className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300">
              {err}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-teal-500 py-3.5 text-sm font-black tracking-wide text-white shadow-lg shadow-violet-950/50 transition hover:brightness-110 active:scale-[0.99]"
          >
            Enter /{normalizeRoomSlug(room)} →
          </button>

          <p className="mt-3.5 text-center text-[11px] leading-relaxed text-slate-500">
            Zero sign-up friction · Share your room URL on WhatsApp, Slack, or Discord so friends join live from any device.
          </p>
        </div>
      </div>
    </div>
  );
}
