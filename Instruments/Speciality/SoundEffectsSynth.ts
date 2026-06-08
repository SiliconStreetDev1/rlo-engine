import { CoreSynthBase, hasStrictGC } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Sound Effects and Sci-Fi Synths.
 * Features extreme frequency sweeping over the duration of the note.
 */
/**
 * Synthesizes various game-related sound effects (lasers, explosions, jumps) using noise bursts and rapid pitch sweeps.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
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
    const gain = this._createGain(ctx, 0);
    const osc = this._createOscillator(ctx, "sawtooth", 0, gain);

    /** Extreme pitch dive from fundamental down one full octave over the note's duration */
    this._setValueAtTime(osc.frequency, freq, time);
    this._exponentialRampToValue(
      osc.frequency,
      Math.max(1, freq / 2),
      time + Math.max(0.05, duration),
    );

    /** Sci-Fi "Laser Wobble": fast sine-wave amplitude modulation (avoids scratchy clicking of square wave) */
    const stutterNode = this._createGain(ctx, 0.5, masterGain);
    this._createLFO(ctx, 15, 0.5, time, 0, time + duration + 0.2, stutterNode.gain);

    gain.connect(stutterNode);

    this._setValueAtTime(gain.gain, 0, time);
    this._linearRampToValue(gain.gain, Math.max(0.001, velocity * 0.5), time + 0.05);
    this._exponentialRampToValue(gain.gain, 0.001, time + duration + 0.2);

    this._scheduleNodeStartStop(time, time + duration + 0.2, osc);

    if (hasStrictGC) this._scheduleNodeDisposal(ctx, time, time + duration + 0.3, gain, stutterNode);
  }
}
