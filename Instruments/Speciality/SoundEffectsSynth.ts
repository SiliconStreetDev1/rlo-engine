import { CoreSynthBase, Osc } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Sound Effects and Sci-Fi Synths.
 * Features extreme frequency sweeping over the duration of the note.
 */
export class SoundEffectsSynth extends CoreSynthBase {
  /**
   * Plays an automated sweeping sci-fi sound effect.
   */
  public _playNote(
    ctx: AudioContext,
    masterGain: GainNode,
    time: number,
    freq: number,
    duration: number,
    velocity: number,
  ): void {
    const gain = this._gain(ctx, 0);
    const osc = this._osc(ctx, Osc.Sawtooth, 0, gain);

    /** Extreme pitch dive from fundamental down one full octave over the note's duration */
    this._set(osc.frequency, freq, time);
    this._exp(
      osc.frequency,
      Math.max(1, freq / 2),
      time + Math.max(0.05, duration),
    );

    /** Sci-Fi "Laser Wobble": fast sine-wave amplitude modulation (avoids scratchy clicking of square wave) */
    const stutterNode = this._gain(ctx, 0.5, masterGain);
    this._lfo(ctx, 15, 0.5, time, 0, time + duration + 0.2, stutterNode.gain);

    gain.connect(stutterNode);

    this._set(gain.gain, 0, time);
    this._lin(gain.gain, Math.max(0.001, velocity * 0.5), time + 0.05);
    this._exp(gain.gain, 0.001, time + duration + 0.2);

    this._on(time, time + duration + 0.2, osc);

    this._gc(ctx, time, time + duration + 0.3, gain, stutterNode);
  }
}
