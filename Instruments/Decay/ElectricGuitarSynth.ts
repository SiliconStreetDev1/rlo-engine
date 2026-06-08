import { DecaySynthBase } from "./DecaySynthBase.js";
import {} from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Electric and Distorted Guitars.
 */
/**
 * Simulates a distorted electric guitar using a sawtooth wave run through heavy overdrive and bandpass filtering.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class ElectricGuitarSynth extends DecaySynthBase {
  protected _envelopeConfig = { _peakVelocity: 0.5, _attackTimeSeconds: 0.02, _decayTimeSeconds: 0.2, _maxDurationSeconds: 4.0 };

  protected _applyDecay(
    gainParam: AudioParam,
    peakVol: number,
    time: number,
    attack: number,
    safeDuration: number,
    decayTail: number,
  ): void {
    /** Compressed sustain mimicking an electric guitar amp */
    this._exponentialRampToValue(
      gainParam,
      Math.max(0.001, peakVol * 0.4),
      time + Math.min(0.5, safeDuration),
    );
    this._exponentialRampToValue(gainParam, 0.001, time + safeDuration + decayTail);
  }

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
    const filter = this._createFilterSweep(
      ctx,
      "lowpass",
      2500 + velocity * 1500,
      600,
      time,
      safeDuration,
    );

    const [osc, osc2] = this._createStereoOscillator(ctx, "sawtooth", 0, 1, 0, gain);
    this._setValueAtTime(osc.frequency, freq * 1.02, time);
    this._exponentialRampToValue(osc.frequency, freq, time + 0.05);
    this._setValueAtTime(osc2.frequency, freq * 1.022, time);
    this._exponentialRampToValue(osc2.frequency, freq * 1.002, time + 0.05);

    const vibrato = this._createLFO(
      ctx,
      5.0,
      freq * 0.015,
      time,
      0.2,
      stopTime,
      osc.frequency,
      0.4,
    );
    vibrato.connect(osc2.frequency);

    gain.connect(filter);

    /** Heavy plectrum attack */
    this._createTransient(
      ctx,
      "square",
      3500,
      masterGain,
      time,
      Math.max(0.001, velocity * 0.25),
      0.015,
    );

    this._scheduleNodeStartStop(time, stopTime, osc, osc2);

    return filter;
  }
}
