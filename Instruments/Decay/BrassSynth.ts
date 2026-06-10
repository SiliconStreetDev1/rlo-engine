import { AnalogSynthBase } from "../Analog/AnalogSynthBase.js";
import {} from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Brass and Wind instruments with a slow filter envelope.
 */
/**
 * Simulates a brass instrument (e.g. Trumpet/Trombone) using a sawtooth wave and an envelope-driven lowpass filter to mimic breath pressure.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class BrassSynth extends AnalogSynthBase {
  protected _envelopeConfig: import("../Analog/AnalogSynthBase.js").AnalogCfg = [0.5, 0.1, 0.1];

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
    const osc = this._createOscillator(ctx, "square", 0, gain);
    this._setValueAtTime(osc.frequency, freq * 0.95, time);
    this._exponentialRampToValue(osc.frequency, freq, time + 0.05);

    const blareGain = this._createGain(ctx, 0, gain);
    this._setValueAtTime(blareGain.gain, 0, time);
    this._linearRampToValue(blareGain.gain, Math.max(0.001, velocity * 0.25), time + 0.05);
    this._exponentialRampToValue(blareGain.gain, 0.001, time + 0.2);
    const blare = this._createOscillator(ctx, "sawtooth", freq * 2, blareGain);

    const filter = this._createFilter(ctx, "lowpass");
    this._setValueAtTime(filter.frequency, freq + 400, time);
    this._linearRampToValue(filter.frequency, freq + 1500 + velocity * 1000, time + 0.1);
    this._exponentialRampToValue(filter.frequency, freq + 400, time + sustainTime + releaseTime);

    gain.connect(filter);
    this._scheduleNodeStartStop(time, stopTime, osc);
    this._scheduleNodeStartStop(time, time + 0.2, blare);

    return filter;
  }
}
