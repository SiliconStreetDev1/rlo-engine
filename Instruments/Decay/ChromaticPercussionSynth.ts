import { DecaySynthBase } from "./DecaySynthBase.js";
import { Osc } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Chromatic Percussion (Bells, Marimba, Vibraphone).
 * Characterized by a pure tone with a very fast attack and immediate decay.
 */
/**
 * Emulates struck melodic instruments like a Glockenspiel or Marimba using rapid decay envelopes and metallic overtones.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class ChromaticPercussionSynth extends DecaySynthBase {
  protected _envelopeConfig: import("./DecaySynthBase.js").DecayCfg = [0.7, 0.005, 0.5, 6.0];

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
    const osc = this._createOscillator(ctx, "sine", 0, gain);
    this._setValueAtTime(osc.frequency, freq * 1.1, time);
    this._exponentialRampToValue(osc.frequency, freq, time + 0.02);

    const overtoneGain = this._createGain(ctx, 0, masterGain);
    this._setValueAtTime(overtoneGain.gain, Math.max(0.001, velocity * 0.25), time);
    this._exponentialRampToValue(overtoneGain.gain, 0.001, time + safeDuration);
    const overtone = this._createOscillator(ctx, "sine", freq * 2.76, overtoneGain);

    overtoneGain.connect(masterGain);

    this._scheduleNodeStartStop(time, stopTime, osc, overtone);
  }
}
