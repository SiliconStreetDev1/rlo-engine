import { CoreSynthBase } from "../CoreSynthBase.js";

export type AnalogCfg = { v: number; a: number; r: number };

/**
 * Abstract base class for sustained analog synthesizers.
 * Handles GainNode creation, Nyquist safety limits, and ADSR volume envelopes.
 */
export abstract class AnalogSynthBase extends CoreSynthBase {
  protected _c: AnalogCfg = { v: 0.5, a: 0.05, r: 0.1 };

  public _playNote(
    ctx: AudioContext,
    masterGain: GainNode,
    time: number,
    freq: number,
    duration: number,
    velocity: number,
  ): void {
    const gain = ctx.createGain();

    const c = this._cfg(duration);
    const peakVol = Math.max(0.001, velocity * c.v);

    this._set(gain.gain, 0, time);
    this._lin(gain.gain, peakVol, time + c.a);

    const sustainTime = Math.max(c.a, duration);
    this._set(gain.gain, peakVol, time + sustainTime);
    this._lin(gain.gain, 0.001, time + sustainTime + c.r);

    const stopTime = time + sustainTime + c.r;

    const output = this._setupSynthesis(
      ctx,
      gain,
      time,
      freq,
      velocity,
      sustainTime,
      c.r,
      stopTime,
    );

    const finalNode = output || gain;
    finalNode.connect(masterGain);
    this._gc(ctx, time, stopTime + 0.1, finalNode);
  }

  protected _cfg(d: number): AnalogCfg {
    return this._c;
  }

  /**
   * Set up the specific oscillators and filters for this instrument.
   * You must start() and stop() your own oscillators.
   * @returns The final audio node in the chain to connect to the master mix. If omitted, the base envelope gain is used.
   */
  protected abstract _setupSynthesis(
    ctx: AudioContext,
    gain: GainNode,
    time: number,
    freq: number,
    velocity: number,
    sustainTime: number,
    releaseTime: number,
    stopTime: number,
  ): AudioNode | void;
}
