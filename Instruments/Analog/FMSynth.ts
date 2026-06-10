import { AnalogSynthBase, AnalogCfg } from "./AnalogSynthBase.js";
import { Osc } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for FM (Frequency Modulation).
 * Modulates a carrier sine wave with another sine wave to create glassy,
 * metallic overtones common in 1980s Electric Pianos and Bells.
 */
/**
 * Uses Frequency Modulation (FM) to create complex metallic or bell-like timbres by modulating the phase of one oscillator with another.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class FMSynth extends AnalogSynthBase {
  protected _envelopeConfig: import("./AnalogSynthBase.js").AnalogCfg = [0.6, 0.01, 0.1];

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
    const carrier = this._createOscillator(ctx, "sine", freq, gain);

    const modFreq = freq * 2; // 2:1 harmonic ratio for bell/epiano overtones
    const modDepth = modFreq * 4; // Modulation index (brightness)

    const modGain = this._createGain(ctx, 0, carrier.frequency);
    this._setValueAtTime(modGain.gain, modDepth * velocity, time);
    this._exponentialRampToValue(modGain.gain, 0.01, time + sustainTime); // Decay the harshness over time for a plucked feel

    const modulator = this._createOscillator(ctx, "sine", modFreq, modGain);

    this._scheduleNodeStartStop(time, stopTime, carrier, modulator);
  }
}
