import { AnalogSynthBase, AnalogCfg } from "./AnalogSynthBase.js";
import {} from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Reese/Wobble Bass.
 * Uses heavily detuned sawtooths and an LFO-driven lowpass filter.
 */
/**
 * A staple of Drum & Bass music, this uses two heavily detuned sawtooth waves to create a thick, phasing, and wide bass tone.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class ReeseBassSynth extends AnalogSynthBase {
  protected _envelopeConfig: import("./AnalogSynthBase.js").AnalogCfg = [0.7, 0.05, 0.2];

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
    const filter = this._createFilter(ctx, "lowpass");
    this._setValueAtTime(filter.frequency, freq * 2, time);

    // Wobble LFO: syncs roughly to tempo (e.g. 1/8th notes ~4-8 Hz)
    this._createLFO(ctx, 6, freq * 3, time, 0, stopTime, filter.frequency);

    // Deep, phasing detune
    const [osc1, osc2] = this._createStereoOscillator(
      ctx,
      "sawtooth",
      freq / 2,
      1.015,
      0.4,
      filter,
    );
    filter.connect(gain);
    this._scheduleNodeStartStop(time, stopTime, osc1, osc2);
  }
}
