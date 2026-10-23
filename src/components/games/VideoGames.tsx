import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./CoopGames";
import { bumpScore, currentPlayer, feed, isMyTurn } from "../../lib/gameSync";
import { sounds } from "../../lib/audio";

interface Submission {
  uid: string;
  name: string;
  avatar: string;
  url: string;
  ts: number;
  duration: number;
  votes: string[];
}

interface VideoData {
  duration: number;
  required: number;
  submissions: Submission[];
  ready: boolean;
}

const COPY = {
  controller: {
    title: "Act like you're mid-game, then hit PASS!",
    instruction: "Perform your move for up to 8 seconds. The big PASS button stops your clip and hands the camera to the next teammate.",
    action: "🎮 Start my shot",
    icon: "🎮",
  },
  npc: {
    title: "Become a glitchy background NPC",
    instruction: "Camera on! For 30 seconds, walk across your room or move in place with robotic turns, idle loops and wonderfully broken physics.",
    action: "🚶 Start 30-second NPC walk",
    icon: "🚶",
  },
  desk: {
    title: "Speedrun your chaotic desk",
    instruction: "You have 15 seconds to organize as much as possible. An original high-energy arcade beat is recorded into your clip — no copyrighted music needed.",
    action: "🗄️ Start 15-second speedrun",
    icon: "🗄️",
  },
} as const;

function startArcadeBeat(ctx: AudioContext, destination: AudioNode) {
  let step = 0;
  const notes = [110, 110, 146.83, 110, 164.81, 146.83, 196, 164.81];
  const timer = window.setInterval(() => {
    const now = ctx.currentTime;
    // bass sequence
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = "sawtooth";
    bass.frequency.setValueAtTime(notes[step % notes.length], now);
    bassGain.gain.setValueAtTime(0.055, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    bass.connect(bassGain);
    bassGain.connect(destination);
    bass.start(now);
    bass.stop(now + 0.12);
    // arcade kick every other step
    if (step % 2 === 0) {
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.type = "sine";
      kick.frequency.setValueAtTime(150, now);
      kick.frequency.exponentialRampToValueAtTime(45, now + 0.09);
      kickGain.gain.setValueAtTime(0.16, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      kick.connect(kickGain);
      kickGain.connect(destination);
      kick.start(now);
      kick.stop(now + 0.1);
    }
    // hi-hat tick
    const hat = ctx.createOscillator();
    const hatGain = ctx.createGain();
    hat.type = "square";
    hat.frequency.setValueAtTime(step % 2 ? 5200 : 3800, now);
    hatGain.gain.setValueAtTime(0.012, now);
    hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    hat.connect(hatGain);
    hatGain.connect(destination);
    hat.start(now);
    hat.stop(now + 0.03);
    step++;
  }, 135);
  return () => clearInterval(timer);
}

export default function VideoChallengeGame({ g, me, mutate, finish }: GameProps) {
  const d = g.data as VideoData;
  const variant = g.id as "controller" | "npc" | "desk";
  const copy = COPY[variant];
  const [stage, setStage] = useState<"idle" | "live" | "review">("idle");
  const [timeLeft, setTimeLeft] = useState(d.duration);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [montage, setMontage] = useState(false);
  const [montageIdx, setMontageIdx] = useState(0);
  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const clockRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopBeatRef = useRef<() => void>(() => {});
  const autoSubmitRef = useRef(false);
  const mountedRef = useRef(true);

  const myTurn = variant !== "controller" || isMyTurn(g, me.id);
  const alreadySubmitted = d.submissions.some((s) => s.uid === me.id);
  const activePlayer = currentPlayer(g);

  const cleanupMedia = () => {
    clearInterval(clockRef.current);
    stopBeatRef.current();
    stopBeatRef.current = () => {};
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (liveRef.current) liveRef.current.srcObject = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      cleanupMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitClip = (url: string) => {
    if (url.length > 2_200_000) {
      setError("That clip is too large to sync. Please retake a shorter take.");
      setSaving(false);
      setStage("review");
      setPreview(url);
      return;
    }
    mutate((cur) => {
      const cd = cur.data as VideoData;
      const entry: Submission = {
        uid: me.id, name: me.name, avatar: me.avatar, url, ts: Date.now(), duration: cd.duration, votes: [],
      };
      const submissions = [...cd.submissions.filter((s) => s.uid !== me.id), entry];
      const ready = submissions.length >= cd.required;
      return feed(bumpScore({
        ...cur,
        turn: variant === "controller" ? (cur.turn + 1) % cur.players.length : cur.turn,
        data: { ...cd, submissions, ready },
      }, me.id, 4), {
        name: me.name,
        text: variant === "controller" ? "hit PASS — camera cuts to the next teammate! 🎬" : `submitted a ${cd.duration}s video challenge clip 🎬`,
        ts: Date.now(), sys: true,
      });
    });
    sounds.playSuccess();
    setPreview(null);
    setStage("idle");
    setSaving(false);
  };

  const stopRecording = (autoSubmit = false) => {
    autoSubmitRef.current = autoSubmit;
    clearInterval(clockRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const startRecording = async () => {
    setError("");
    setPreview(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Camera recording is not supported in this browser. Try current Chrome, Edge, Firefox or Safari.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: { ideal: variant === "desk" ? "environment" : "user" } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        await liveRef.current.play().catch(() => {});
      }

      let recordStream = stream;
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const ctx: AudioContext = new AC();
        audioCtxRef.current = ctx;
        await ctx.resume();
        const mic = ctx.createMediaStreamSource(stream);
        const destination = ctx.createMediaStreamDestination();
        mic.connect(destination);
        stopBeatRef.current = startArcadeBeat(ctx, destination);
        recordStream = new MediaStream([...stream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
      } catch {
        recordStream = stream; // camera audio still records if WebAudio is unavailable
      }

      const preferred = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(
        (type) => MediaRecorder.isTypeSupported?.(type)
      );
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(recordStream, {
          ...(preferred ? { mimeType: preferred } : {}),
          videoBitsPerSecond: 120000,
          audioBitsPerSecond: 24000,
        });
      } catch {
        recorder = new MediaRecorder(recordStream);
      }
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        cleanupMedia();
        if (!mountedRef.current) return;
        if (blob.size < 1000) {
          setError("The recording was empty — please try again.");
          setStage("idle");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (!mountedRef.current) return;
          const url = String(reader.result);
          if (autoSubmitRef.current) {
            setSaving(true);
            commitClip(url);
          } else {
            setPreview(url);
            setStage("review");
          }
          autoSubmitRef.current = false;
        };
        reader.readAsDataURL(blob);
      };
      recorder.start(250);
      setStage("live");
      setTimeLeft(d.duration);
      let remaining = d.duration;
      clockRef.current = window.setInterval(() => {
        remaining -= 1;
        setTimeLeft(Math.max(0, remaining));
        if (remaining <= 3 && remaining > 0) sounds.playTick();
        if (remaining <= 0) stopRecording(variant === "controller");
      }, 1000);
    } catch (e) {
      cleanupMedia();
      setError(e instanceof DOMException && e.name === "NotAllowedError"
        ? "Camera/microphone permission was denied. Allow access in your browser's site settings, then retry."
        : "Could not start the camera. Close other camera apps and try again.");
    }
  };

  const vote = (uid: string) => {
    sounds.playPop();
    mutate((cur) => {
      const cd = cur.data as VideoData;
      return {
        ...cur,
        data: {
          ...cd,
          submissions: cd.submissions.map((s) => s.uid === uid ? {
            ...s,
            votes: s.votes.includes(me.name) ? s.votes.filter((n) => n !== me.name) : [...s.votes, me.name],
          } : s),
        },
      };
    });
  };

  const finishChallenge = () => {
    const count = d.submissions.length;
    const best = [...d.submissions].sort((a, b) => b.votes.length - a.votes.length)[0];
    finish(`${count} teammate${count === 1 ? "" : "s"} completed ${copy.title.toLowerCase()} 🎬${best && best.votes.length ? ` — ${best.name} won the laughs vote with ${best.votes.length} 😂` : ""}`);
  };

  return (
    <div>
      <div className="mb-3 rounded-2xl border border-pink-400/30 bg-gradient-to-br from-pink-500/15 to-violet-950/30 p-3.5">
        <p className="text-sm font-black text-[#111111]">{copy.icon} {copy.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-800">{copy.instruction}</p>
        <p className="mt-2 text-[10px] font-bold text-pink-200">🎵 Original synthesized arcade soundtrack · 🔒 Clips stay in this room session</p>
      </div>

      {variant === "controller" && (
        <div className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${myTurn ? "bg-[#bbf7d0] text-emerald-800" : "bg-[#efece2] text-zinc-800"}`}>
          {activePlayer && <img src={activePlayer.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />}
          {myTurn ? "The controller is in YOUR hands" : `${activePlayer?.name} has the controller — get ready for the cut!`}
          <span className="ml-auto">{d.submissions.length}/{d.required} shots</span>
        </div>
      )}

      {/* Persistent live video element so the stream can attach immediately */}
      <div className={`relative mb-3 overflow-hidden rounded-2xl border border-[#111111] bg-white ${stage === "live" ? "block" : "hidden"}`}>
        <video ref={liveRef} autoPlay muted playsInline className={`aspect-video w-full object-cover ${variant === "desk" ? "" : "mirror"}`} />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3">
          <span className="flex items-center gap-1.5 rounded-lg pro-btn-accent px-2.5 py-1 text-xs font-black text-[#111111]"><span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC</span>
          <span className="rounded-lg bg-black/60 px-3 py-1 font-mono text-xl font-black text-[#111111]">00:{String(timeLeft).padStart(2, "0")}</span>
        </div>
        {variant === "npc" && <div className="npc-scan pointer-events-none absolute inset-0 border-4 border-dashed border-cyan-300/30" />}
        {variant === "controller" && (
          <button onClick={() => stopRecording(true)} className="absolute inset-x-8 bottom-5 rounded-2xl pro-btn-accent py-4 text-xl font-black text-slate-950 shadow-2xl transition active:scale-95">
            🎮 PASS THE CONTROLLER →
          </button>
        )}
        {variant !== "controller" && (
          <button onClick={() => stopRecording(false)} className="absolute bottom-4 right-4 rounded-xl pro-btn-accent px-4 py-2 text-xs font-black text-[#111111] shadow-lg">■ Finish take</button>
        )}
      </div>

      {stage === "review" && preview && (
        <div className="mb-3 rounded-2xl border border-[#111111] bg-white p-2">
          <video src={preview} controls playsInline className="aspect-video w-full rounded-xl object-contain" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => { setPreview(null); setStage("idle"); }} className="flex-1 rounded-xl bg-[#efece2] py-2.5 text-xs font-bold text-zinc-800">↺ Retake</button>
            <button onClick={() => { setSaving(true); commitClip(preview); }} disabled={saving} className="flex-1 rounded-xl pro-btn-accent py-2.5 text-xs font-black text-[#111111] disabled:opacity-50">{saving ? "Syncing…" : "Submit to team cut 🎬"}</button>
          </div>
        </div>
      )}

      {error && <p className="mb-3 rounded-xl border border-rose-400/30 bg-[#fecaca] p-3 text-xs font-semibold text-rose-800">{error}</p>}
      {error && !d.submissions.length && (
        <button onClick={() => finish("the camera challenge was skipped because recording was unavailable — no clip was submitted")} className="mb-3 w-full rounded-xl bg-[#efece2] py-2.5 text-xs font-bold text-zinc-800 hover:bg-slate-700">
          Skip video challenge &amp; unlock chat (no fake submission)
        </button>
      )}

      {stage === "idle" && (variant !== "controller" || !d.ready) && (
        <div className="mb-3 text-center">
          <button onClick={startRecording} disabled={!myTurn || saving || (alreadySubmitted && variant === "controller")}
            className="rounded-2xl pro-btn-accent px-6 py-3 text-sm font-black text-[#111111] shadow-lg transition hover:brightness-110 active:scale-95 disabled:opacity-40">
            {alreadySubmitted && variant !== "controller" ? "🎬 Record a replacement take" : copy.action}
          </button>
          {!myTurn && <p className="mt-2 text-xs text-zinc-600">Wait for the current player to press PASS.</p>}
          {alreadySubmitted && variant !== "controller" && <p className="mt-2 text-xs text-emerald-800">Your clip is in the team cut — you can replace it until the challenge ends.</p>}
        </div>
      )}

      {/* Team submissions and replay */}
      {d.submissions.length > 0 && (
        <div className="rounded-2xl border border-[#111111] bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-zinc-800">Team cut · {d.submissions.length}/{d.required}</p>
            <button onClick={() => { setMontage(true); setMontageIdx(0); }} className="rounded-lg bg-pink-500/20 px-3 py-1.5 text-xs font-bold text-pink-200 hover:bg-pink-500/30">▶ Play team cut</button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {d.submissions.map((s) => (
              <div key={s.uid} className="overflow-hidden rounded-xl border border-[#111111] bg-[#f7f5ee]">
                <video src={s.url} controls playsInline preload="metadata" className="aspect-video w-full object-cover" />
                <div className="flex items-center gap-1.5 p-2">
                  <img src={s.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#111111]">{s.name}</span>
                  <button onClick={() => vote(s.uid)} className="rounded-lg bg-[#efece2] px-2 py-1 text-[11px] font-bold hover:bg-slate-700">😂 {s.votes.length}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(d.ready || d.submissions.length > 0) && stage === "idle" && (
        <button onClick={finishChallenge} className="mt-3 w-full rounded-2xl pro-btn-accent py-3 text-sm font-black text-[#111111] shadow-lg hover:brightness-110">
          {d.ready ? "🏆 Finish challenge & unlock chat" : `End early with ${d.submissions.length} clip${d.submissions.length === 1 ? "" : "s"} & unlock`}
        </button>
      )}

      {montage && d.submissions.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4" onClick={() => setMontage(false)}>
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between text-[#111111]">
              <p className="font-black">🎬 Team cut · Shot {montageIdx + 1}/{d.submissions.length} · {d.submissions[montageIdx].name}</p>
              <button onClick={() => setMontage(false)} className="rounded-xl bg-[#efece2] px-3 py-1.5">✕</button>
            </div>
            <video key={d.submissions[montageIdx].uid} src={d.submissions[montageIdx].url} autoPlay controls playsInline
              onEnded={() => montageIdx < d.submissions.length - 1 ? setMontageIdx(montageIdx + 1) : setMontage(false)}
              className="max-h-[75vh] w-full rounded-2xl bg-white object-contain" />
            <p className="mt-2 text-center text-xs text-zinc-600">Clips play back-to-back, just like a pass-the-camera social video.</p>
          </div>
        </div>
      )}
    </div>
  );
}