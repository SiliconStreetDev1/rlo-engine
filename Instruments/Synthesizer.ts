import { ISynthInstrument } from "./ISynthInstrument.js";

/**
 * Handles routing and synthesis of different instrument types.
 */
export class Synthesizer {
  private _ctx: AudioContext;
  private _masterGain: GainNode;
  private _instruments: ISynthInstrument[];

  constructor(
    ctx: AudioContext,
    masterGain: GainNode,
    instruments: ISynthInstrument[],
  ) {
    this._ctx = ctx;
    this._masterGain = masterGain;
    this._instruments = instruments;
  }

  /**
   * Routes the note to the correct instrument synthesis method.
   */
  public _playNote(
    instrumentId: number,
    time: number,
    freq: number,
    duration: number,
    velocity: number,
  ): void {
    /** Key Tracking: High frequency waveforms carry significantly more perceived energy.
     * Gently rolling off the velocity of high notes prevents them from piercing the mix and distorting.
     * We also apply a 0.6 global headroom multiplier to prevent 30+ note crescendos from clipping. */
    const keyTrackVel = velocity * 0.6 * Math.min(1, 1600 / freq);

    const instrument = this._instruments[instrumentId] || this._instruments[0];

    if ((globalThis as any).DEBUG_MIDI) {
      console.log(
        `[MIDI Debug] Instr ID: ${instrumentId} | Class: ${instrument?.constructor.name || "Unknown"} | Freq: ${freq.toFixed(2)}Hz | Vel: ${velocity.toFixed(2)} | Dur: ${duration.toFixed(2)}s | Time: ${time.toFixed(2)}s`,
      );
    }

    if (instrument) {
      instrument._playNote(
        this._ctx,
        this._masterGain,
        time,
        freq,
        duration,
        keyTrackVel,
      );
    }
  }
}
