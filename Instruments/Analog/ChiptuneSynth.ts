import { AnalogSynthBase, AnalogCfg } from "./AnalogSynthBase.js";
import { Osc } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for 8-bit Chiptune sounds.
 * Uses a raw square wave with a rapid pitch-drop "blip" attack.
 */
export class ChiptuneSynth extends AnalogSynthBase {
  protected _c = { v: 0.4, a: 0.005, r: 0.05 };

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

    /** Classic tracker "blip" attack: starts one octave higher for a fraction of a second */
    this._set(osc.frequency, freq * 2, time);
    this._set(osc.frequency, freq, time + 0.02);

    this._on(time, stopTime, osc);
  }
}
