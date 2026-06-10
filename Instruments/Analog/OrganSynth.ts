import { AnalogSynthBase, AnalogCfg } from "./AnalogSynthBase.js";
import { Osc } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Organs using additive sine waves.
 */
/**
 * Simulates a tonewheel organ (like a Hammond B3) by using additive synthesis of sine waves at harmonic intervals.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class OrganSynth extends AnalogSynthBase {
  protected _envelopeConfig: import("./AnalogSynthBase.js").AnalogCfg = [0.4, 0.01, 0.05];

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
    const osc1 = this._createOscillator(ctx, "sine", freq, gain);
    const gain2 = this._createGain(ctx, 0.5, gain);
    const osc2 = this._createOscillator(ctx, "sine", freq * 2, gain2);
    const gain3 = this._createGain(ctx, 0.25, gain);
    const osc3 = this._createOscillator(ctx, "sine", freq * 3, gain3);

    const rotaryNode = this._createGain(ctx, 0.7);
    this._createLFO(ctx, 6.5, 0.3, time, 0, stopTime, rotaryNode.gain);

    gain.connect(rotaryNode);

    this._createTransient(
      ctx,
      "square",
      4000,
      rotaryNode,
      time,
      Math.max(0.001, velocity * 0.1),
      0.015,
    );

    this._scheduleNodeStartStop(time, stopTime, osc1, osc2, osc3);

    return rotaryNode;
  }
}
