import { ISynthInstrument } from "./ISynthInstrument.js";

declare const __ENABLE_STRICT_GC__: boolean;
export const hasStrictGC =
  typeof __ENABLE_STRICT_GC__ !== "undefined" ? __ENABLE_STRICT_GC__ : true;

export type Osc = "sine" | "square" | "sawtooth" | "triangle";
export type Filter = "lowpass" | "highpass" | "bandpass";

export abstract class CoreSynthBase implements ISynthInstrument {
  public abstract _playNote(
    ctx: AudioContext,
    masterGain: GainNode,
    time: number,
    freq: number,
    duration: number,
    velocity: number,
  ): void;

  public _createOscillator(
    ctx: AudioContext,
    type: Osc,
    freq: number,
    dest?: AudioNode | AudioParam,
  ): OscillatorNode {
    const o = ctx.createOscillator();
    o.type = type;
    if (freq) o.frequency.value = Math.min(22000, freq);
    if (dest) o.connect(dest as any);
    return o;
  }
  public _createGain(
    ctx: AudioContext,
    val: number,
    dest?: AudioNode | AudioParam,
  ): GainNode {
    const g = ctx.createGain();
    g.gain.value = val;
    if (dest) g.connect(dest as any);
    return g;
  }
  public _createFilter(ctx: AudioContext, type: Filter): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = type;
    return f;
  }
  public _createStereoPanner(
    ctx: AudioContext,
    val: number,
    dest?: AudioNode,
  ): StereoPannerNode {
    const p = ctx.createStereoPanner();
    p.pan.value = val;
    if (dest) p.connect(dest);
    return p;
  }
  public _scheduleNodeStartStop(t: number, s: number, ...n: AudioScheduledSourceNode[]): void {
    n.forEach((x) => {
      x.start(t);
      x.stop(s);
    });
  }
  public _setValueAtTime(p: AudioParam, v: number, t: number): void {
    p.setValueAtTime(Math.min(22000, v), t);
  }
  public _linearRampToValue(p: AudioParam, v: number, t: number): void {
    p.linearRampToValueAtTime(Math.min(22000, v), t);
  }
  public _exponentialRampToValue(p: AudioParam, v: number, t: number): void {
    p.exponentialRampToValueAtTime(Math.min(22000, v), t);
  }

  public _createTransient(
    ctx: AudioContext,
    type: Osc,
    freq: number,
    dest: AudioNode,
    time: number,
    peak: number,
    dur: number,
    atk: number = 0,
  ): void {
    const g = this._createGain(ctx, 0, dest);
    this._setValueAtTime(g.gain, atk > 0 ? 0 : peak, time);
    if (atk > 0) this._linearRampToValue(g.gain, peak, time + atk);
    this._exponentialRampToValue(g.gain, 0.001, time + dur);
    this._scheduleNodeStartStop(time, time + dur, this._createOscillator(ctx, type, freq, g));
  }
  public _createFilterSweep(
    ctx: AudioContext,
    type: Filter,
    f1: number,
    f2: number,
    t1: number,
    dur: number,
  ): BiquadFilterNode {
    const f = this._createFilter(ctx, type);
    this._setValueAtTime(f.frequency, f1, t1);
    this._exponentialRampToValue(f.frequency, f2, t1 + dur);
    return f;
  }
  public _createStereoOscillator(
    ctx: AudioContext,
    type: Osc,
    freq: number,
    detune: number,
    pan: number,
    dest: AudioNode,
  ): [OscillatorNode, OscillatorNode] {
    return [
      this._createOscillator(ctx, type, freq, this._createStereoPanner(ctx, -pan, dest)),
      this._createOscillator(ctx, type, freq * detune, this._createStereoPanner(ctx, pan, dest)),
    ];
  }
  public _createLFO(
    ctx: AudioContext,
    freq: number,
    depth: number,
    time: number,
    fadeIn: number,
    stopTime: number,
    dest: AudioNode | AudioParam,
    delay: number = 0,
  ): GainNode {
    const g = this._createGain(ctx, 0, dest);
    this._setValueAtTime(g.gain, 0, time);
    if (delay > 0) this._setValueAtTime(g.gain, 0, time + delay);
    this._linearRampToValue(g.gain, depth, time + delay + fadeIn);
    this._scheduleNodeStartStop(time, stopTime, this._createOscillator(ctx, "sine", freq, g));
    return g;
  }

  /**
   * Schedules a delayed garbage collection using a native C++ audio thread.
   * 
   * @reason Why we use a dummy OscillatorNode instead of setTimeout:
   * The JS event loop is inherently jittery and subject to GC pauses and tab throttling.
   * By scheduling a silent OscillatorNode with a precise `.stop(stopTime)`, we leverage
   * the Web Audio API's C++ audio thread to trigger the `onended` callback precisely at the sample
   * boundary. This guarantees that `disconnect()` is called on exhausted nodes exactly when
   * they finish decaying, preventing memory leaks (stray disconnected nodes) without any JS timing overhead.
   * 
   * @param ctx The AudioContext.
   * @param time The start time of the GC lifecycle.
   * @param stopTime The exact time when the audio nodes should be completely unlinked from the graph.
   * @param nodes The nodes to disconnect.
   */
  public _scheduleNodeDisposal(
    ctx: AudioContext,
    time: number,
    stopTime: number,
    ...nodes: AudioNode[]
  ): void {
    if (hasStrictGC) {
      const gcOsc = this._createOscillator(ctx, "sine", 0);
      gcOsc.onended = () => {
        nodes.forEach((n) => {
          try {
            if (n && typeof n.disconnect === "function") {
              n.disconnect();
            }
          } catch (e) {
            // Safe swallow: Node may have been externally disconnected by Game Engine routing.
          }
        });
      };
      gcOsc.start(time);
      gcOsc.stop(stopTime);
    }
  }
}