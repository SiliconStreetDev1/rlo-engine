import { AnalogSynthBase } from "./AnalogSynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Woodwinds and Pipes (Flute, Piccolo, Recorder, Ocarina).
 * Characterized by a pure, hollow, and breathy tone using sine and triangle waves.
 */
export class WoodwindSynth extends AnalogSynthBase {
  protected _c = { v: 0.7, a: 0.05, r: 0.1 };

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
    /** Flutes are mostly a fundamental sine wave with a tiny bit of triangle for the "chiff" sound */
    const osc1 = this._osc(ctx, Osc.Sine, freq, gain);

    /** Triangle is mixed much lower just to provide a bit of upper harmonic texture */
    const triGain = this._gain(ctx, 0, gain);
    /** Breath transient: louder at attack, decaying to a whisper during sustain */
    this._set(triGain.gain, 0.3, time);
    this._exp(triGain.gain, 0.05, time + 0.2);
    const osc2 = this._osc(ctx, Osc.Triangle, freq, triGain);

    /** Lowpass filter to keep it extremely smooth and remove any digital sharpness */
    const filter = this._filter(ctx, Filter.Lowpass);
    this._set(filter.frequency, freq + 800, time);

    /** Diaphragm vibrato: blooms slowly after the initial breath attack */
    const vibrato = this._lfo(
      ctx,
      5.5,
      freq * 0.015,
      time,
      0.4,
      stopTime,
      osc1.frequency,
    );
    vibrato.connect(osc2.frequency);

    /** True Amplitude Modulation (Tremolo) pipelined from the diaphragm vibrato */
    const tremoloNode = this._gain(ctx, 1.0);
    const tremoloDepth = this._gain(ctx, 0.15, tremoloNode.gain);
    vibrato.connect(tremoloDepth);

    gain.connect(tremoloNode).connect(filter);

    this._on(time, stopTime, osc1, osc2);

    return filter;
  }
}
