import { useEffect, useRef, useState } from "react";
import type { User } from "../lib/types";
import { uid } from "../lib/types";
import { AVATAR_SEEDS, STATUS_PRESETS, makeAvatar } from "../lib/data";
import { detectDevice, normalizeRoomSlug } from "../lib/store";
import { isSupabaseConfigured } from "../lib/supabase";
import { getRankTier, loadPlayerStats } from "../lib/ranks";

interface Props {
  initialRoom: string;
  savedUser: User | null;
  onJoin: (user: User, room: string) => void;
  full?: boolean;
}

const ROOM_PRESETS = ["lobby", "ranked-1v1", "aim-club", "friday-lan"];

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

  const stats = loadPlayerStats();
  const tier = getRankTier(stats.elo);

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
      setErr("Choose a valid image file.");
      return;
    }
    try {
      setCustomAvatar(await resizeImage(f));
      setErr("");
    } catch {
      setErr("Could not read image.");
    }
  };

  const openSelfie = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("Camera not available — upload an image instead.");
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
      setErr("Camera permission denied.");
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
    if (!n) return setErr("Enter your gamer tag to continue.");
    const r = normalizeRoomSlug(room);
    onJoin(
      {
        id: savedUser?.id || uid(),
        name: n.slice(0, 24),
        avatar: effectiveAvatar,
        bio: bio.trim() || STATUS_PRESETS[0],
        device: detectDevice(),
        elo: stats.elo,
        wins: stats.wins,
        streak: stats.streak,
      },
      r
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        {/* Top System Status Pill */}
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#111111] bg-white px-3 py-1 font-mono text-[11px] font-black text-[#111111] shadow-[2px_2px_0px_#111111]">
            <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
            {isSupabaseConfigured ? "CLOUD MULTIPLAYER · LIVE" : "LOCAL MULTI-TAB"}
          </span>

          <span
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#111111] px-3 py-1 font-mono text-[11px] font-black shadow-[2px_2px_0px_#111111]"
            style={{ backgroundColor: tier.bg, color: tier.text }}
          >
            {tier.label} · {stats.elo} ELO
          </span>
        </div>

        {/* Main Card */}
        <div className="pro-card overflow-hidden rounded-2xl">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b-2 border-[#111111] bg-[#f3f0e6] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#111111] bg-[#ffe500] text-lg font-black shadow-[2px_2px_0px_#111111]">
                ⚡
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-[#111111]">
                  CHAT<span className="underline decoration-2 underline-offset-4">ARENA</span>
                </h1>
                <p className="text-xs font-medium text-zinc-600">
                  Real-time squad comms &amp; 18-mode competitive arcade
                </p>
              </div>
            </div>
          </div>

          {full && (
            <div className="border-b-2 border-[#111111] bg-[#fecaca] px-5 py-2.5 text-xs font-bold text-[#991b1b]">
              Room /{initialRoom} is at 20/20 capacity. Enter a new room code below.
            </div>
          )}

          <div className="space-y-4 p-5">
            {/* Avatar + Tag */}
            <div className="flex items-center gap-3.5">
              <img
                src={effectiveAvatar}
                alt="Avatar"
                className="h-16 w-16 shrink-0 rounded-full border-2 border-[#111111] object-cover"
              />
              <div className="min-w-0 flex-1">
                <label className="mb-1 block font-mono text-[10px] font-black uppercase tracking-wider text-zinc-600">
                  Avatar Preset
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVATAR_SEEDS.map((s, idx) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setCustomAvatar(null);
                        setSeedIdx(idx);
                      }}
                      className={`h-8 w-8 overflow-hidden rounded-full border-2 transition ${
                        !customAvatar && seedIdx === idx
                          ? "border-[#111111] ring-2 ring-[#111111] ring-offset-1"
                          : "border-zinc-400 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={makeAvatar(name.trim() || "Player", s)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    title="Upload photo"
                    className="pro-btn rounded-lg px-2 py-1 font-mono text-[10px] font-black"
                  >
                    UPLOAD
                  </button>
                  <button
                    type="button"
                    onClick={openSelfie}
                    title="Camera snapshot"
                    className="pro-btn rounded-lg px-2 py-1 font-mono text-[10px] font-black"
                  >
                    CAM
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                </div>
              </div>
            </div>

            {cameraOpen && (
              <div className="pro-cream flex items-center gap-3 rounded-xl p-3">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="h-16 w-16 rounded-lg border-2 border-[#111111] bg-black object-cover -scale-x-100"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={snapSelfie}
                    className="pro-btn-accent rounded-lg px-3 py-1.5 text-xs font-black"
                  >
                    CAPTURE
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      streamRef.current?.getTracks().forEach((t) => t.stop());
                      setCameraOpen(false);
                    }}
                    className="pro-btn rounded-lg px-3 py-1.5 text-xs font-bold"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}

            {/* Gamer Tag */}
            <div>
              <label className="mb-1 block font-mono text-[10px] font-black uppercase tracking-wider text-zinc-600">
                Gamer Tag
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                maxLength={24}
                placeholder="e.g. Ghost, Strider, Kira…"
                className="pro-input w-full rounded-xl px-3.5 py-2.5 text-sm font-bold"
              />
            </div>

            {/* Room Channel */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-mono text-[10px] font-black uppercase tracking-wider text-zinc-600">
                  Lobby Channel
                </label>
                <span className="font-mono text-[10px] font-bold text-zinc-500">
                  Share URL to invite friends
                </span>
              </div>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                maxLength={24}
                placeholder="lobby"
                className="pro-input w-full rounded-xl px-3.5 py-2 font-mono text-sm font-bold"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ROOM_PRESETS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoom(r)}
                    className={`rounded-lg border-[1.5px] border-[#111111] px-2.5 py-0.5 font-mono text-[11px] font-bold transition ${
                      normalizeRoomSlug(room) === r
                        ? "bg-[#111111] text-white"
                        : "bg-[#f3f0e6] text-[#111111] hover:bg-[#ffe500]"
                    }`}
                  >
                    #{r}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Role */}
            <div>
              <label className="mb-1 block font-mono text-[10px] font-black uppercase tracking-wider text-zinc-600">
                Role / Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBio(preset)}
                    className={`rounded-lg border-[1.5px] border-[#111111] px-2.5 py-1 text-[11px] font-bold transition ${
                      bio === preset
                        ? "bg-[#ffe500] text-[#111111]"
                        : "bg-white text-zinc-700 hover:bg-[#f3f0e6]"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {err && (
              <p className="rounded-lg border-2 border-[#111111] bg-[#fecaca] px-3 py-2 text-xs font-bold text-[#991b1b]">
                {err}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              className="pro-btn-accent w-full rounded-xl py-3 font-mono text-sm font-black uppercase tracking-wider"
            >
              ENTER LOBBY →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
