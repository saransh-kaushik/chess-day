import { useCallback, useRef } from 'react';
import { useSettingsStore } from '../store/settingsStore';

type SoundType = 'move' | 'capture' | 'check' | 'blunder' | 'mistake' | 'inaccuracy' | 'best' | 'navigate';

/**
 * Hook that uses the Web Audio API to generate chess sounds programmatically.
 * No audio files required — all sounds are synthesized via oscillators.
 */
export const useChessSound = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (useSettingsStore.getState().muted) return;
    const ctx = getCtx();
    if (!ctx) return;

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => undefined);
    }

    const now = ctx.currentTime;

    switch (type) {
      case 'move': {
        // Short, soft click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      case 'capture': {
        // Heavier thud — low thump
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'check': {
        // Alerting ding — two quick tones
        [0, 0.12].forEach((offset, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(i === 0 ? 880 : 1100, now + offset);
          gain.gain.setValueAtTime(0.35, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
          osc.start(now + offset);
          osc.stop(now + offset + 0.12);
        });
        break;
      }

      case 'blunder': {
        // Dramatic descending tone — three descending notes
        const freqs = [600, 420, 280];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.15);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + i * 0.15 + 0.13);
          gain.gain.setValueAtTime(0.3, now + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.14);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.16);
        });
        break;
      }

      case 'mistake': {
        // Mild warning — single descending tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case 'inaccuracy': {
        // Very mild — subtle warble
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }

      case 'best': {
        // Ascending positive tone — two rising notes
        const freqs = [440, 660];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.15, now + i * 0.1 + 0.1);
          gain.gain.setValueAtTime(0.25, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.12);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.14);
        });
        break;
      }

      case 'navigate': {
        // Subtle click for review navigation
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }

      default:
        break;
    }
  }, [getCtx]);

  return { playSound };
};
