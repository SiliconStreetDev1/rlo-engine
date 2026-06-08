import { RloData } from "../types.js";
import { Note } from "./AudioMath.js";

/**
 * Fluent API for constructing RLO sequences programmatically without using a compiler.
 * 
 * @reason This class directly pushes `[frequency, time, duration, velocity, instrument]`
 * tuples into a flat `number[]` array. By avoiding intermediary JS Objects `{ note: 'C4', dur: 1 }`
 * we completely eliminate Garbage Collection (GC) pauses during sequence generation, 
 * making it incredibly fast for procedural music generation at runtime.
 */
export class RLOSequenceBuilder {
  private _notes: number[] = [];
  private _duration: number = 0;

  public addNote(opts: { instrument: number; pitch: string | number; duration: number; time?: number; velocity?: number; }): this {
    const time = opts.time !== undefined ? opts.time : this._duration;
    const freq = Note(opts.pitch);
    const vel = opts.velocity ?? 1.0;
    this._notes.push(freq, time, opts.duration, vel, opts.instrument);
    this._duration = Math.max(this._duration, time + opts.duration);
    return this;
  }
  public setDuration(secs: number): this {
    this._duration = secs;
    return this;
  }
  public compile(): RloData {
    return { durationSecs: this._duration, notes: this._notes };
  }
}
