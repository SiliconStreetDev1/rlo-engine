import { CoreSynthBase } from "../CoreSynthBase.js";

export type DecayCfg = { v: number; a: number; d: number; m: number };

/**
 * Abstract base class for plucked, struck, and decaying synthesizers.
 * Handles GainNode creation, Nyquist safety limits, and decay volume envelopes.
 */
export abstract class DecaySynthBase extends CoreSynthBase {
  protected _c: DecayCfg = { v: 0.5, a: 0.02, d: 0.2, m: 4.0 };

  public _playNote(
    ctx: AudioContext,
    masterGain: GainNode,
    time: number,
    freq: number,
    duration: number,
    velocity: number,
  ): void {
    const gain = ctx.createGain();

    const c = this._cfg();
    const peakVol = Math.max(0.001, velocity * c.v);

    /** Physical strings/mallets stop vibrating quickly. Protects against stuck MIDI notes. */
    const safeDuration = Math.max(0.02, Math.min(duration, c.m));

    this._set(gain.gain, 0, time);
    this._lin(gain.gain, peakVol, time + c.a);

    this._applyDecay(gain.gain, peakVol, time, c.a, safeDuration, c.d);

    /** Pad the oscillator stop time slightly past the volume decay to prevent digital clicking */
    const stopTime = time + safeDuration + c.d + 0.1;

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
    this._gc(ctx, time, stopTime + 2.0, finalNode);
  }

  protected _cfg(): DecayCfg {
    return this._c;
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
    this._exp(gainParam, 0.001, time + safeDuration + decayTail);
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
