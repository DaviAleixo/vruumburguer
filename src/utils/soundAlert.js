// Utilitário de alerta sonoro potente para novos pedidos usando Web Audio API (Multi-Harmônico de Alta Potência com Debounce Seguro)
class SoundAlertManager {
  constructor() {
    this.audioCtx = null;
    this.enabled = typeof window !== "undefined" && localStorage.getItem("vrumburguer_order_sound_enabled") !== "false";
    this.isPlaying = false;
    this.lastPlayTime = 0;
  }

  getAudioContext() {
    if (typeof window === "undefined") return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch (_e) {
      return null;
    }
    return this.audioCtx;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (typeof window !== "undefined") {
      localStorage.setItem("vrumburguer_order_sound_enabled", this.enabled ? "true" : "false");
    }
  }

  // Toca um alerta sonoro potente estilo iFood/Anota AI com proteção contra sobrecarga
  playOrderChime() {
    if (!this.enabled) return;

    // Proteção de debounce: não toca se tocou há menos de 3.5 segundos
    const now = Date.now();
    if (this.isPlaying || (now - this.lastPlayTime < 3500)) {
      return;
    }

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      this.isPlaying = true;
      this.lastPlayTime = now;

      // Compressor dinâmico para maximizar o volume com segurança
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-15, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
      compressor.connect(ctx.destination);

      // Função auxiliar para tocar um sino harmônico duplo
      const playBell = (freq, startTime, duration = 0.6, volume = 0.8) => {
        try {
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(freq, startTime);

          gain1.gain.setValueAtTime(0.001, startTime);
          gain1.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
          gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc1.connect(gain1);
          gain1.connect(compressor);
          osc1.start(startTime);
          osc1.stop(startTime + duration);

          // Harmônico agudo (brilho metálico)
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(freq * 2, startTime);

          gain2.gain.setValueAtTime(0.001, startTime);
          gain2.gain.exponentialRampToValueAtTime(volume * 0.4, startTime + 0.015);
          gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

          osc2.connect(gain2);
          gain2.connect(compressor);
          osc2.start(startTime);
          osc2.stop(startTime + duration);
        } catch (_err) {}
      };

      const startBase = ctx.currentTime + 0.05;

      // Sequência de 3 toques cristalinos
      playBell(587.33, startBase + 0.00, 0.45, 0.75); // Ré5
      playBell(783.99, startBase + 0.18, 0.50, 0.85); // Sol5
      playBell(1046.50, startBase + 0.38, 0.80, 0.95); // Dó6

      setTimeout(() => {
        if (!this.enabled || !this.audioCtx) {
          this.isPlaying = false;
          return;
        }
        const now2 = this.audioCtx.currentTime;
        playBell(880.00, now2 + 0.00, 0.45, 0.80);
        playBell(1174.66, now2 + 0.18, 0.50, 0.90);
        playBell(1567.98, now2 + 0.38, 0.95, 1.00);
      }, 700);

      setTimeout(() => {
        if (!this.enabled || !this.audioCtx) {
          this.isPlaying = false;
          return;
        }
        const now3 = this.audioCtx.currentTime;
        playBell(1046.50, now3 + 0.00, 0.40, 0.85);
        playBell(1318.51, now3 + 0.16, 0.45, 0.90);
        playBell(1567.98, now3 + 0.32, 0.55, 0.95);
        playBell(2093.00, now3 + 0.48, 1.10, 1.00);
        
        setTimeout(() => {
          this.isPlaying = false;
        }, 1200);
      }, 1500);

    } catch (err) {
      this.isPlaying = false;
      console.log("Aviso ao tocar som de notificação:", err);
    }
  }
}

export const soundAlert = new SoundAlertManager();

