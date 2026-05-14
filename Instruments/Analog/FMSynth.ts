import { AnalogSynthBase, AnalogCfg } from "./AnalogSynthBase.js";
import { Osc } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for FM (Frequency Modulation).
 * Modulates a carrier sine wave with another sine wave to create glassy,
 * metallic overtones common in 1980s Electric Pianos and Bells.
 */
export class FMSynth extends AnalogSynthBase {
  protected _c = { v: 0.6, a: 0.01, r: 0.1 };

  protected _setupSynthesis(
    ctx: AudioContext,
    gain: GainNode,
    time: number,
    freq: number,
    velocity: number,
    sustainTime: number,
    releaseTime: number,
    stopTime: number,
  ): AudioNode | void {
    const carrier = this._osc(ctx, Osc.Sine, freq, gain);

    const modFreq = freq * 2; // 2:1 harmonic ratio for bell/epiano overtones
    const modDepth = modFreq * 4; // Modulation index (brightness)

    const modGain = this._gain(ctx, 0, carrier.frequency);
    this._set(modGain.gain, modDepth * velocity, time);
    this._exp(modGain.gain, 0.01, time + sustainTime); // Decay the harshness over time for a plucked feel

    const modulator = this._osc(ctx, Osc.Sine, modFreq, modGain);

    this._on(time, stopTime, carrier, modulator);
  }
}
