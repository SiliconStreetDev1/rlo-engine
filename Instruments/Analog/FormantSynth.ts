import { AnalogSynthBase, AnalogCfg } from "./AnalogSynthBase.js";
import { Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Formant Choirs (Human Vox).
 * Uses parallel bandpass filters locked to specific "vowel" resonant frequencies.
 */
export class FormantSynth extends AnalogSynthBase {
  protected _c = { v: 0.8, a: 0.1, r: 0.4 };

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
    const osc = this._osc(ctx, Osc.Sawtooth, freq);
    this._lfo(ctx, 5, freq * 0.015, time, 0.2, stopTime, osc.frequency);

    // Typical 'Ah' vowel formants: 730Hz, 1090Hz, 2440Hz
    [730, 1090, 2440].forEach((f) => {
      if (f < 22000) {
        const filter = this._filter(ctx, Filter.Bandpass);
        filter.frequency.value = f;
        filter.Q.value = 12; // High resonance to isolate the formant
        osc.connect(filter).connect(gain);
      }
    });

    this._on(time, stopTime, osc);
  }
}
