/**
 * Web Audio API sound synthesizer for Focus Lock Classroom Simulator & Mobile Kiosk.
 * Automatically unlocks AudioContext on mobile touch/click gestures and provides
 * distinct audio + vibration signals for Skafander Lock, Live Quiz, and Tamper Siren.
 */

class SoundEffectsService {
  private audioCtx: AudioContext | null = null;
  public isMuted: boolean = false;
  public lastPlayedSound: 'LOCK' | 'QUIZ' | 'SIREN' | 'SUCCESS' | null = null;
  public playCount: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        if (!this.audioCtx) {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            this.audioCtx = new AudioContextClass();
          }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      };

      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  private getContext(): AudioContext | null {
    if (this.isMuted || typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private vibrateDevice(pattern: number | number[]): void {
    if (this.isMuted || typeof navigator === 'undefined') return;
    try {
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration errors on unsupported browsers
    }
  }

  public playTamperSiren(): void {
    this.lastPlayedSound = 'SIREN';
    this.playCount += 1;
    this.vibrateDevice([200, 80, 200, 80, 250]);

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.14);
      osc.frequency.setValueAtTime(580, now + 0.16);
      osc.frequency.linearRampToValueAtTime(920, now + 0.32);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.39);
    } catch {
      // Ignore audio errors
    }
  }

  public playKioskLockSound(): void {
    this.lastPlayedSound = 'LOCK';
    this.playCount += 1;
    this.vibrateDevice([160, 70, 240]);

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Futuristic Skafander Kiosk Lock engagement tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(587.33, now + 0.08);
      osc.frequency.setValueAtTime(880, now + 0.16);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.006, now + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.37);
    } catch {
      // Ignore audio errors
    }
  }

  public playLiveQuizSound(): void {
    this.lastPlayedSound = 'QUIZ';
    this.playCount += 1;
    this.vibrateDevice([120, 60, 120]);

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.1);
      osc.frequency.setValueAtTime(1046.5, now + 0.2);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.006, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.39);
    } catch {
      // Ignore audio errors
    }
  }

  public playSuccessChime(): void {
    this.lastPlayedSound = 'SUCCESS';
    this.playCount += 1;
    this.vibrateDevice(100);

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.09);
      osc.frequency.setValueAtTime(783.99, now + 0.18);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.33);
    } catch {
      // Ignore audio errors
    }
  }
}

export const soundEffects = new SoundEffectsService();
