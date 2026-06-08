import { DecaySynthBase } from "../Decay/DecaySynthBase.js";
import {} from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for deep Bass instruments using sawtooth waves.
 */
/**
 * Synthesizes a deep, resonant bass tone using a lowpass-filtered sawtooth wave. Perfect for foundational low-end frequencies.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class BassSynth extends DecaySynthBase {
  protected _envelopeConfig = { _peakVelocity: 0.8, _attackTimeSeconds: 0.05, _decayTimeSeconds: 0.1, _maxDurationSeconds: 4.0 };

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
    /** Deep envelope sweep for punchy, muffled bass attack. Capped safely below Nyquist. */
    const filter = this._createFilterSweep(
      ctx,
      "lowpass",
      300 + velocity * 500,
      100,
      time,
      safeDuration,
    );

    const osc = this._createOscillator(ctx, "sawtooth", 0, gain);
    this._setValueAtTime(osc.frequency, freq * 0.92, time);
    this._exponentialRampToValue(osc.frequency, freq, time + 0.04);

    const subGain = this._createGain(ctx, 0.6, gain);
    const subOsc = this._createOscillator(ctx, "sine", 0, subGain);
    this._setValueAtTime(subOsc.frequency, (freq / 2) * 0.92, time);
    this._exponentialRampToValue(subOsc.frequency, freq / 2, time + 0.04);

    gain.connect(filter);

    this._scheduleNodeStartStop(time, stopTime, osc, subOsc);

    return filter;
  }
}
