import { AnalogSynthBase } from "./AnalogSynthBase.js";
import {} from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Synth Leads featuring an LFO Vibrato.
 */
/**
 * Produces a bright, cutting tone using layered oscillators and detuning to stand out in a mix as the primary melody.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class LeadSynth extends AnalogSynthBase {
  protected _envelopeConfig = { _peakVelocity: 0.4, _attackTimeSeconds: 0.05, _releaseTimeSeconds: 0.1 };

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
    const osc = this._createOscillator(ctx, "sawtooth", 0);
    this._setValueAtTime(osc.frequency, freq, time);

    this._createLFO(ctx, 5, freq * 0.02, time, 0.2, stopTime, osc.frequency);

    const filter = this._createFilterSweep(
      ctx,
      "lowpass",
      freq,
      freq * 3,
      time,
      0.05,
    );
    this._exponentialRampToValue(filter.frequency, freq * 1.5, time + sustainTime);
    filter.Q.value = 3; /** Squelchy resonance */

    osc.connect(filter).connect(gain);

    this._scheduleNodeStartStop(time, stopTime, osc);
  }
}
