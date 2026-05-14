import { DecaySynthBase, DecayCfg } from "./DecaySynthBase.js";
import { Osc } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Inharmonic Additive bells/glass.
 * Stacks sine waves at non-integer multiples to create metallic, clanging overtones.
 */
export class AdditiveSynth extends DecaySynthBase {
  protected _c = { v: 0.6, a: 0.005, d: 0.5, m: 5.0 };

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
    const ratios = [1.0, 2.76, 5.4, 8.9, 13.3];
    const decays = [1.0, 0.6, 0.4, 0.2, 0.1]; // Higher frequencies die out much faster

    ratios.forEach((ratio, i) => {
      const hFreq = freq * ratio;
      if (hFreq < 22000) {
        const peak = Math.max(0.001, velocity * (1 / (i + 1.5)));
        const dur = Math.max(0.1, safeDuration * decays[i]);
        this._transient(ctx, Osc.Sine, hFreq, gain, time, peak, dur, 0.005);
      }
    });
  }
}
