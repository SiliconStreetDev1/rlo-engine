export interface ADSREnvelope {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  peak?: number;
}

/**
 * Mathematically applies an Attack-Decay-Sustain-Release (ADSR) volume envelope to an AudioParam.
 * 
 * @reason Why we use explicit `setValueAtTime` and `linearRampToValueAtTime`:
 * Web Audio nodes often suffer from clicking/popping if values jump instantaneously.
 * By using linear ramps, we ensure smooth zero-crossing transitions. Furthermore, 
 * the logic elegantly handles edge-cases where the note duration is shorter than 
 * the Attack or Decay phase by dynamically calculating partial peaks and 
 * preemptively jumping to the Release phase, preventing sustained hanging notes.
 */
export function applyEnvelope(
  gainParam: AudioParam,
  now: number,
  duration: number,
  opts: ADSREnvelope,
): void {
  const a = opts.attack ?? 0.05;
  const d = opts.decay ?? 0.1;
  const s = opts.sustain ?? 0.8;
  const r = opts.release ?? 0.1;
  const peak = opts.peak ?? 1.0;

  gainParam.setValueAtTime(0, now);
  const realDur = Math.max(0, duration);

  if (realDur <= a) {
    const partialPeak = peak * (realDur / (a || 1));
    gainParam.linearRampToValueAtTime(partialPeak, now + realDur * 0.5);
    gainParam.linearRampToValueAtTime(0, now + realDur);
  } else if (realDur <= a + d) {
    gainParam.linearRampToValueAtTime(peak, now + a);
    gainParam.linearRampToValueAtTime(0, now + realDur);
  } else {
    gainParam.linearRampToValueAtTime(peak, now + a);
    gainParam.linearRampToValueAtTime(peak * s, now + a + d);
    const releaseStart = Math.max(now + a + d, now + realDur - r);
    gainParam.setValueAtTime(peak * s, releaseStart);
    gainParam.linearRampToValueAtTime(0, now + realDur);
  }
}

declare const __ENABLE_NOTE_PARSER__: boolean;
const hasNoteParser = typeof __ENABLE_NOTE_PARSER__ !== "undefined" ? __ENABLE_NOTE_PARSER__ : true;

/**
 * Converts a scientific pitch notation string (e.g., "C4", "F#3") to frequency in Hz.
 * 
 * @reason Why this is included but conditionally compiled:
 * This parser is highly convenient for developers writing sequences manually via the API,
 * allowing `Note("C4")` instead of `261.63`. However, the transpiler strips string notes 
 * during binary compilation, so we wrap this in `__ENABLE_NOTE_PARSER__` to allow Rollup 
 * to entirely remove the Regex from the JS13K build if unused.
 */
export function Note(pitch: string | number): number {
  if (typeof pitch === "number") return pitch;
  if (!hasNoteParser) return 0;
  const match = pitch.match(/^([a-gA-G])([#b]?)(\d)$/);
  if (!match) return 0;
  const offsets: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const [, note, accidental, octave] = match;
  let semitone = offsets[note.toUpperCase()];
  if (accidental === "#") semitone++;
  if (accidental === "b") semitone--;
  semitone += (parseInt(octave, 10) - 4) * 12;
  return Number((440 * Math.pow(2, semitone / 12)).toFixed(2));
}
