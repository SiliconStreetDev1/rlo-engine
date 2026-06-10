import { CoreSynthBase, hasStrictGC } from "../CoreSynthBase.js";

export type DecayCfg = [number, number, number, number]; // [peakVelocity, attackTimeSeconds, decayTimeSeconds, maxDurationSeconds]

/**
 * Abstract base class for plucked, struck, and decaying synthesizers (e.g. Pianos, Guitars, Marimbas).
 * 
 * @reason Physics Simulation:
 * Unlike Analog instruments that hold their peak volume as long as a key is pressed,
 * physical instruments like Guitars or Pianos immediately begin decaying the moment they are struck.
 * This class abstracts the mathematical envelope necessary to simulate that physical decay, 
 * including a hard `maxDurationSeconds` limit to prevent infinite resonance loops from 
 * leaking memory if a MIDI file passes a malformed 60-second note duration.
 */
export abstract class DecaySynthBase extends CoreSynthBase {
  protected _envelopeConfig: DecayCfg = [0.5, 0.02, 0.2, 4.0];

  public _playNote(
    ctx: AudioContext,
    masterGain: GainNode,
    time: number,
    freq: number,
    duration: number,
    velocity: number,
  ): void {
    const gain = ctx.createGain();

    const c = this._getEnvelopeConfig();
    const peakVol = Math.max(0.001, velocity * c[0]);

    /** Physical strings/mallets stop vibrating quickly. Protects against stuck MIDI notes. */
    const safeDuration = Math.max(0.02, Math.min(duration, c[3]));

    this._setValueAtTime(gain.gain, 0, time);
    this._linearRampToValue(gain.gain, peakVol, time + c[1]);

    this._applyDecay(gain.gain, peakVol, time, c[1], safeDuration, c[2]);

    /** Pad the oscillator stop time slightly past the volume decay to prevent digital clicking */
    const stopTime = time + safeDuration + c[2] + 0.1;

    const output = this._setupSynthesis(
      ctx,
      masterGain,
      gain,
      time,
      freq,
      velocity,
      safeDuration,
      stopTime,
    );

    const finalNode = output || gain;
    finalNode.connect(masterGain);
    if (hasStrictGC) this._scheduleNodeDisposal(ctx, time, stopTime + 2.0, finalNode);
  }

  protected _getEnvelopeConfig(): DecayCfg {
    return this._envelopeConfig;
  }

  /** Override this for complex envelopes (like electric guitar compression) */
  protected _applyDecay(
    gainParam: AudioParam,
    peakVol: number,
    time: number,
    attack: number,
    safeDuration: number,
    decayTail: number,
  ): void {
    this._exponentialRampToValue(gainParam, 0.001, time + safeDuration + decayTail);
  }

  /**
   * Set up the specific oscillators and filters for this instrument.
   */
  protected abstract _setupSynthesis(
    ctx: AudioContext,
    masterGain: GainNode,
    gain: GainNode,
    time: number,
    freq: number,
    velocity: number,
    safeDuration: number,
    stopTime: number,
  ): AudioNode | void;
}
