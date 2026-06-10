import { AnalogSynthBase, AnalogCfg } from "./AnalogSynthBase.js";
import {} from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Formant Choirs (Human Vox).
 * Uses parallel bandpass filters locked to specific "vowel" resonant frequencies.
 */
/**
 * Mimics human vowel sounds (a, e, i, o, u) using parallel bandpass filters (formants) tuned to specific vocal tract resonant frequencies.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class FormantSynth extends AnalogSynthBase {
  protected _envelopeConfig: import("./AnalogSynthBase.js").AnalogCfg = [0.8, 0.1, 0.4];

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
    const osc = this._createOscillator(ctx, "sawtooth", freq);
    this._createLFO(ctx, 5, freq * 0.015, time, 0.2, stopTime, osc.frequency);

    // Typical 'Ah' vowel formants: 730Hz, 1090Hz, 2440Hz
    [730, 1090, 2440].forEach((f) => {
      if (f < 22000) {
        const filter = this._createFilter(ctx, "bandpass");
        filter.frequency.value = f;
        filter.Q.value = 12; // High resonance to isolate the formant
        osc.connect(filter).connect(gain);
      }
    });

    this._scheduleNodeStartStop(time, stopTime, osc);
  }
}
