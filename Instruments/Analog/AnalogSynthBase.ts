import { CoreSynthBase, hasStrictGC } from "../CoreSynthBase.js";

export type AnalogCfg = { _peakVelocity: number; _attackTimeSeconds: number; _releaseTimeSeconds: number; _maxDurationSeconds?: number };

/**
 * Synthesizer instrument implementation.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
 * 
 * @reason Separation of Sustained vs Decaying Physics:
 * Synthesizers like an Organ will sustain at peak volume infinitely as long as the key is held,
 * whereas a Piano will physically decay to silence even if the key remains held down. 
 * This base class encapsulates the mathematical ADSR envelope logic specifically for 
 * infinite-sustain physics, ensuring derived classes only need to define the timbre (Oscillators/Filters).
 */
export abstract class AnalogSynthBase extends CoreSynthBase {
  protected _envelopeConfig: AnalogCfg = { _peakVelocity: 0.5, _attackTimeSeconds: 0.05, _releaseTimeSeconds: 0.1, _maxDurationSeconds: 10.0 };

  public _playNote(
    ctx: AudioContext,
    masterGain: GainNode,
    time: number,
    freq: number,
    duration: number,
    velocity: number,
  ): void {
    const gain = ctx.createGain();

    const c = this._getEnvelopeConfig(duration);
    const peakVol = Math.max(0.001, velocity * c._peakVelocity);
    const safeDuration = c._maxDurationSeconds ? Math.min(duration, c._maxDurationSeconds) : duration;

    this._setValueAtTime(gain.gain, 0, time);
    this._linearRampToValue(gain.gain, peakVol, time + c._attackTimeSeconds);

    const sustainTime = Math.max(c._attackTimeSeconds, safeDuration);
    this._setValueAtTime(gain.gain, peakVol, time + sustainTime);
    this._linearRampToValue(gain.gain, 0.001, time + sustainTime + c._releaseTimeSeconds);

    const stopTime = time + sustainTime + c._releaseTimeSeconds;

    const output = this._setupSynthesis(
      ctx,
      gain,
      time,
      freq,
      velocity,
      sustainTime,
      c._releaseTimeSeconds,
      stopTime,
    );

    const finalNode = output || gain;
    finalNode.connect(masterGain);
    if (hasStrictGC) this._scheduleNodeDisposal(ctx, time, stopTime + 0.1, finalNode);
  }

  protected _getEnvelopeConfig(_decayTimeSeconds: number): AnalogCfg {
    return this._envelopeConfig;
  }

  /**
   * Set up the specific oscillators and filters for this instrument.
   * You must start() and stop() your own oscillators.
   * @returns The final audio node in the chain to connect to the master mix. If omitted, the base envelope gain is used.
   */
  protected abstract _setupSynthesis(
    ctx: AudioContext,
    gain: GainNode,
    time: number,
    freq: number,
    velocity: number,
    sustainTime: number,
    releaseTime: number,
    stopTime: number,
  ): AudioNode | void;
}
