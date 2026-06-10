import { DecaySynthBase } from "./DecaySynthBase.js";
import {} from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Acoustic Guitars using a plucked sawtooth.
 */
/**
 * Simulates an acoustic guitar pluck using the Karplus-Strong algorithm or filtered sawtooth impulses.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class GuitarSynth extends DecaySynthBase {
  protected _envelopeConfig: import("./DecaySynthBase.js").DecayCfg = [0.6, 0.02, 0.2, 4.0];

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
    /** Bright attack that quickly muffles as the acoustic string loses kinetic energy */
    const filter = this._createFilterSweep(
      ctx,
      "lowpass",
      2000 + velocity * 1000,
      200,
      time,
      safeDuration,
    );

    const osc = this._createOscillator(ctx, "sawtooth", 0, gain);
    this._setValueAtTime(osc.frequency, freq * 1.02, time);
    this._exponentialRampToValue(osc.frequency, freq, time + 0.05);

    gain.connect(filter);

    /** Plectrum Pluck: the sharp, plastic click of a pick striking a steel string */
    this._createTransient(
      ctx,
      "square",
      3500,
      masterGain,
      time,
      Math.max(0.001, velocity * 0.25),
      0.015,
    );

    this._scheduleNodeStartStop(time, stopTime, osc);

    return filter;
  }
}
