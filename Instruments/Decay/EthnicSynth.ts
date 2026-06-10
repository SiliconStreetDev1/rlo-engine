import { DecaySynthBase } from "./DecaySynthBase.js";
import {} from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Ethnic instruments (Sitar, Shamisen, Koto).
 * Uses a bandpass filter over a square wave to emulate a hollow, plucked resonator.
 */
/**
 * A generalized plucked/struck string synthesizer meant to emulate instruments like a Sitar or Koto.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class EthnicSynth extends DecaySynthBase {
  protected _envelopeConfig: import("./DecaySynthBase.js").DecayCfg = [0.6, 0.02, 0.1, 4.0];

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
    const osc = this._createOscillator(ctx, "square", 0, gain);
    this._setValueAtTime(osc.frequency, freq * 1.05, time);
    this._exponentialRampToValue(osc.frequency, freq, time + 0.08);

    const filter = this._createFilterSweep(
      ctx,
      "bandpass",
      freq * 2.5,
      freq,
      time,
      safeDuration,
    );
    filter.Q.value = 2;

    filter.connect(gain);

    this._scheduleNodeStartStop(time, stopTime, osc);
  }
}
