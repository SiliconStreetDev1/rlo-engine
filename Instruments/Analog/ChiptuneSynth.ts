import { AnalogSynthBase, AnalogCfg } from "./AnalogSynthBase.js";
import { Osc } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for 8-bit Chiptune sounds.
 * Uses a raw square wave with a rapid pitch-drop "blip" attack.
 */
/**
 * Generates retro 8-bit style square waves, ideal for recreating classic video game soundtracks.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 */
export class ChiptuneSynth extends AnalogSynthBase {
  protected _envelopeConfig: import("./AnalogSynthBase.js").AnalogCfg = [0.4, 0.005, 0.05];

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

    /** Classic tracker "blip" attack: starts one octave higher for a fraction of a second */
    this._setValueAtTime(osc.frequency, freq * 2, time);
    this._setValueAtTime(osc.frequency, freq, time + 0.02);

    this._scheduleNodeStartStop(time, stopTime, osc);
  }
}
