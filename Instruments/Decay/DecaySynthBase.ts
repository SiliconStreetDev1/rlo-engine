import { CoreSynthBase, hasStrictGC } from "../CoreSynthBase.js";

export type DecayCfg = { _peakVelocity: number; _attackTimeSeconds: number; _decayTimeSeconds: number; _maxDurationSeconds: number };

/**
 * Abstract base class for plucked, struck, and decaying synthesizers (e.g. Pianos, Guitars, Marimbas).
 * 
 * @reason Physics Simulation:
 * Unlike Analog instruments that hold their peak volume as long as a key is pressed,
 * physical instruments like Guitars or Pianos immediately begin decaying the moment they are struck.
 * This class abstracts the mathematical envelope necessary to simulate that physical decay, 
 * including a hard `maxDurationSeconds` limit to prevent infinite resonance loops from 
 * leaking memory if a MIDI file passes a malformed 60-second note duration.
 */
export abstract class DecaySynthBase extends CoreSynthBase {
  protected _envelopeConfig: DecayCfg = { _peakVelocity: 0.5, _attackTimeSeconds: 0.02, _decayTimeSeconds: 0.2, _maxDurationSeconds: 4.0 };

  public _playNote(
    ctx: AudioContext,
    masterGain: GainNode,
    time: number,
    freq: number,
    duration: number,
    velocity: number,
  ): void {
    const gain = ctx.createGain();

    const c = this._getEnvelopeConfig();
    const peakVol = Math.max(0.001, velocity * c._peakVelocity);

    /** Physical strings/mallets stop vibrating quickly. Protects against stuck MIDI notes. */
    const safeDuration = Math.max(0.02, Math.min(duration, c._maxDurationSeconds));

    this._setValueAtTime(gain.gain, 0, time);
    this._linearRampToValue(gain.gain, peakVol, time + c._attackTimeSeconds);

    this._applyDecay(gain.gain, peakVol, time, c._attackTimeSeconds, safeDuration, c._decayTimeSeconds);

    /** Pad the oscillator stop time slightly past the volume decay to prevent digital clicking */
    const stopTime = time + safeDuration + c._decayTimeSeconds + 0.1;

    const output = this._setupSynthesis(
      ctx,
      masterGain,
      gain,
      time,
      freq,
      velocity,
      safeDuration,
      stopTime,
    );

    const finalNode = output || gain;
    finalNode.connect(masterGain);
    if (hasStrictGC) this._scheduleNodeDisposal(ctx, time, stopTime + 2.0, finalNode);
  }

  protected _getEnvelopeConfig(): DecayCfg {
    return this._envelopeConfig;
  }

  /** Override this for complex envelopes (like electric guitar compression) */
  protected _applyDecay(
    gainParam: AudioParam,
    peakVol: number,
    time: number,
    attack: number,
    safeDuration: number,
    decayTail: number,
  ): void {
    this._exponentialRampToValue(gainParam, 0.001, time + safeDuration + decayTail);
  }

  /**
   * Set up the specific oscillators and filters for this instrument.
   */
  protected abstract _setupSynthesis(
    ctx: AudioContext,
    masterGain: GainNode,
    gain: GainNode,
    time: number,
    freq: number,
    velocity: number,
    safeDuration: number,
    stopTime: number,
  ): AudioNode | void;
}
