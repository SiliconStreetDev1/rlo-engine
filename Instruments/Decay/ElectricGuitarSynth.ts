import { DecaySynthBase } from "./DecaySynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Electric and Distorted Guitars.
 */
export class ElectricGuitarSynth extends DecaySynthBase {
  protected _c = { v: 0.5, a: 0.02, d: 0.2, m: 4.0 };

  protected _applyDecay(
    gainParam: AudioParam,
    peakVol: number,
    time: number,
    attack: number,
    safeDuration: number,
    decayTail: number,
  ): void {
    /** Compressed sustain mimicking an electric guitar amp */
    this._exp(
      gainParam,
      Math.max(0.001, peakVol * 0.4),
      time + Math.min(0.5, safeDuration),
    );
    this._exp(gainParam, 0.001, time + safeDuration + decayTail);
  }

  protected _setupSynthesis(
    ctx: AudioContext,
    masterGain: GainNode,
    gain: GainNode,
    time: number,
    freq: number,
    velocity: number,
    safeDuration: number,
    stopTime: number,
  ): AudioNode | void {
    const filter = this._filterSweep(
      ctx,
      Filter.Lowpass,
      2500 + velocity * 1500,
      600,
      time,
      safeDuration,
    );

    const [osc, osc2] = this._stereoOsc(ctx, Osc.Sawtooth, 0, 1, 0, gain);
    this._set(osc.frequency, freq * 1.02, time);
    this._exp(osc.frequency, freq, time + 0.05);
    this._set(osc2.frequency, freq * 1.022, time);
    this._exp(osc2.frequency, freq * 1.002, time + 0.05);

    const vibrato = this._lfo(
      ctx,
      5.0,
      freq * 0.015,
      time,
      0.2,
      stopTime,
      osc.frequency,
      0.4,
    );
    vibrato.connect(osc2.frequency);

    gain.connect(filter);

    /** Heavy plectrum attack */
    this._transient(
      ctx,
      Osc.Square,
      3500,
      masterGain,
      time,
      Math.max(0.001, velocity * 0.25),
      0.015,
    );

    this._on(time, stopTime, osc, osc2);

    return filter;
  }
}
