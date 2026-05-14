import { AnalogSynthBase } from "../Analog/AnalogSynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Brass and Wind instruments with a slow filter envelope.
 */
export class BrassSynth extends AnalogSynthBase {
  protected _c = { v: 0.5, a: 0.1, r: 0.1 };

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
    const osc = this._osc(ctx, Osc.Square, 0, gain);
    this._set(osc.frequency, freq * 0.95, time);
    this._exp(osc.frequency, freq, time + 0.05);

    const blareGain = this._gain(ctx, 0, gain);
    this._set(blareGain.gain, 0, time);
    this._lin(blareGain.gain, Math.max(0.001, velocity * 0.25), time + 0.05);
    this._exp(blareGain.gain, 0.001, time + 0.2);
    const blare = this._osc(ctx, Osc.Sawtooth, freq * 2, blareGain);

    const filter = this._filter(ctx, Filter.Lowpass);
    this._set(filter.frequency, freq + 400, time);
    this._lin(filter.frequency, freq + 1500 + velocity * 1000, time + 0.1);
    this._exp(filter.frequency, freq + 400, time + sustainTime + releaseTime);

    gain.connect(filter);
    this._on(time, stopTime, osc);
    this._on(time, time + 0.2, blare);

    return filter;
  }
}
