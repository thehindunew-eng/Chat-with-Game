// Tactile Mechanical Web Audio UI & Pro Match SFX Engine

export type SoundDropId =
  | "horn"
  | "dhol"
  | "nagin"
  | "ipl"
  | "ghanti"
  | "chai";

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playPop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.065);
    gain.gain.setValueAtTime(0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.07);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  playSend() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(460, t);
    osc.frequency.exponentialRampToValueAtTime(1040, t + 0.11);
    gain.gain.setValueAtTime(0.13, t);
    gain.gain.exponentialRampToValueAtTime(0.004, t + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playClack() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(310, t);
    osc.frequency.exponentialRampToValueAtTime(115, t + 0.055);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.003, t + 0.06);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playSnip() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [1600, 2450].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, t + idx * 0.018);
      osc.frequency.exponentialRampToValueAtTime(420, t + idx * 0.018 + 0.045);
      gain.gain.setValueAtTime(0.11, t + idx * 0.018);
      gain.gain.exponentialRampToValueAtTime(0.002, t + idx * 0.018 + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + idx * 0.018);
      osc.stop(t + idx * 0.018 + 0.05);
    });
  }

  playTick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(920, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.075);
      gain.gain.setValueAtTime(0.14, this.ctx!.currentTime + i * 0.075);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx!.currentTime + i * 0.075 + 0.24
      );
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(this.ctx!.currentTime + i * 0.075);
      osc.stop(this.ctx!.currentTime + i * 0.075 + 0.25);
    });
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.095);
      gain.gain.setValueAtTime(0.18, this.ctx!.currentTime + i * 0.095);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx!.currentTime + i * 0.095 + 0.42
      );
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(this.ctx!.currentTime + i * 0.095);
      osc.stop(this.ctx!.currentTime + i * 0.095 + 0.43);
    });
  }

  playError() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(195, t);
    osc.frequency.exponentialRampToValueAtTime(98, t + 0.2);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.008, t + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  playGameTrigger() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const freqs = [330, 440, 587.33, 880, 1174.66];
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(f, this.ctx!.currentTime + i * 0.048);
      gain.gain.setValueAtTime(0.09, this.ctx!.currentTime + i * 0.048);
      gain.gain.exponentialRampToValueAtTime(
        0.008,
        this.ctx!.currentTime + i * 0.048 + 0.1
      );
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(this.ctx!.currentTime + i * 0.048);
      osc.stop(this.ctx!.currentTime + i * 0.048 + 0.11);
    });
  }

  playReactor() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.18);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.008, t + 0.19);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  /** Desi Bhaukaal Soundboard Drops */
  playSoundDrop(id: SoundDropId) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const base = ctx.currentTime;

    if (id === "horn") {
      // Classic Indian Highway Musical Pressure Horn ("Dhoom/GT Road Horn"!)
      const notes = [
        [587.3, 0, 0.12],
        [659.25, 0.14, 0.12],
        [783.99, 0.28, 0.14],
        [659.25, 0.44, 0.11],
        [783.99, 0.58, 0.34],
      ];
      notes.forEach(([freq, offset, dur]) => {
        [1, 1.008].forEach((detune) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq * detune, base + offset);
          gain.gain.setValueAtTime(0.11, base + offset);
          gain.gain.exponentialRampToValueAtTime(0.005, base + offset + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(base + offset);
          osc.stop(base + offset + dur + 0.01);
        });
      });
      return;
    }

    if (id === "dhol") {
      // Punjabi / UP Baraat Dhol ("Dha-Ge-Na-Tin-Na-Ka-Dhin!")
      const hits: [number, number, OscillatorType][] = [
        [0, 125, "sine"],
        [0.14, 340, "triangle"],
        [0.24, 130, "sine"],
        [0.4, 380, "triangle"],
        [0.52, 125, "sine"],
        [0.64, 135, "sine"],
        [0.76, 420, "triangle"],
      ];
      hits.forEach(([off, f, type]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f, base + off);
        osc.frequency.exponentialRampToValueAtTime(48, base + off + 0.12);
        gain.gain.setValueAtTime(0.24, base + off);
        gain.gain.exponentialRampToValueAtTime(0.003, base + off + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(base + off);
        osc.stop(base + off + 0.14);
      });
      return;
    }

    if (id === "nagin") {
      // Iconic Baraat Nagin Pungi Riff!
      const riff = [523.25, 554.37, 659.25, 554.37, 523.25, 493.88, 523.25];
      riff.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(f, base + i * 0.13);
        gain.gain.setValueAtTime(0.09, base + i * 0.13);
        gain.gain.exponentialRampToValueAtTime(
          0.005,
          base + i * 0.13 + 0.125
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(base + i * 0.13);
        osc.stop(base + i * 0.13 + 0.13);
      });
      return;
    }

    if (id === "ipl") {
      // Stadium Sixer Charge Bugle!
      const charge = [
        [523.25, 0, 0.1],
        [659.25, 0.11, 0.1],
        [783.99, 0.22, 0.1],
        [1046.5, 0.34, 0.22],
        [783.99, 0.58, 0.1],
        [1046.5, 0.7, 0.38],
      ];
      charge.forEach(([f, off, dur]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, base + off);
        gain.gain.setValueAtTime(0.19, base + off);
        gain.gain.exponentialRampToValueAtTime(0.005, base + off + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(base + off);
        osc.stop(base + off + dur + 0.01);
      });
      return;
    }

    if (id === "ghanti") {
      // Pure Brass Temple Bell Shimmer
      [1046.5, 1568, 2093, 2637].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, base);
        gain.gain.setValueAtTime(0.14 / (idx + 1), base);
        gain.gain.exponentialRampToValueAtTime(0.001, base + 1.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(base);
        osc.stop(base + 1.12);
      });
      return;
    }

    // Tapri Kulhad Clink + Whistle
    [980, 1320].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, base + idx * 0.12);
      osc.frequency.exponentialRampToValueAtTime(
        f * 1.18,
        base + idx * 0.12 + 0.1
      );
      gain.gain.setValueAtTime(0.13, base + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.002, base + idx * 0.12 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(base + idx * 0.12);
      osc.stop(base + idx * 0.12 + 0.15);
    });
  }
}

export const sounds = new SoundEngine();
