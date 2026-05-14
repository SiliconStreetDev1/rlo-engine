import { ISynthInstrument } from "./ISynthInstrument.js";

declare const __ENABLE_STRICT_GC__: boolean;
const hasStrictGC =
  typeof __ENABLE_STRICT_GC__ !== "undefined" ? __ENABLE_STRICT_GC__ : true;

export const enum Osc {
  Sine = 0,
  Square = 1,
  Sawtooth = 2,
  Triangle = 3,
}
export const enum Filter {
  Lowpass = 0,
  Highpass = 1,
  Bandpass = 2,
}

export abstract class CoreSynthBase implements ISynthInstrument {
  public abstract _playNote(
    ctx: AudioContext,
    masterGain: GainNode,
    time: number,
    freq: number,
    duration: number,
    velocity: number,
  ): void;

  public _osc(
    ctx: AudioContext,
    type: Osc,
    freq: number,
    dest?: AudioNode | AudioParam,
  ): OscillatorNode {
    const o = ctx.createOscillator();
    o.type = ["sine", "square", "sawtooth", "triangle"][type] as OscillatorType;
    if (freq) o.frequency.value = Math.min(22000, freq);
    if (dest) o.connect(dest as any);
    return o;
  }
  public _gain(
    ctx: AudioContext,
    val: number,
    dest?: AudioNode | AudioParam,
  ): GainNode {
    const g = ctx.createGain();
    g.gain.value = val;
    if (dest) g.connect(dest as any);
    return g;
  }
  public _filter(ctx: AudioContext, type: Filter): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = ["lowpass", "highpass", "bandpass"][type] as BiquadFilterType;
    return f;
  }
  public _pan(
    ctx: AudioContext,
    val: number,
    dest?: AudioNode,
  ): StereoPannerNode {
    const p = ctx.createStereoPanner();
    p.pan.value = val;
    if (dest) p.connect(dest);
    return p;
  }
  public _on(t: number, s: number, ...n: AudioScheduledSourceNode[]): void {
    n.forEach((x) => {
      x.start(t);
      x.stop(s);
    });
  }
  public _set(p: AudioParam, v: number, t: number): void {
    p.setValueAtTime(Math.min(22000, v), t);
  }
  public _lin(p: AudioParam, v: number, t: number): void {
    p.linearRampToValueAtTime(Math.min(22000, v), t);
  }
  public _exp(p: AudioParam, v: number, t: number): void {
    p.exponentialRampToValueAtTime(Math.min(22000, v), t);
  }

  public _transient(
    ctx: AudioContext,
    type: Osc,
    freq: number,
    dest: AudioNode,
    time: number,
    peak: number,
    dur: number,
    atk: number = 0,
  ): void {
    const g = this._gain(ctx, 0, dest);
    this._set(g.gain, atk > 0 ? 0 : peak, time);
    if (atk > 0) this._lin(g.gain, peak, time + atk);
    this._exp(g.gain, 0.001, time + dur);
    this._on(time, time + dur, this._osc(ctx, type, freq, g));
  }
  public _filterSweep(
    ctx: AudioContext,
    type: Filter,
    f1: number,
    f2: number,
    t1: number,
    dur: number,
  ): BiquadFilterNode {
    const f = this._filter(ctx, type);
    this._set(f.frequency, f1, t1);
    this._exp(f.frequency, f2, t1 + dur);
    return f;
  }
  public _stereoOsc(
    ctx: AudioContext,
    type: Osc,
    freq: number,
    detune: number,
    pan: number,
    dest: AudioNode,
  ): [OscillatorNode, OscillatorNode] {
    return [
      this._osc(ctx, type, freq, this._pan(ctx, -pan, dest)),
      this._osc(ctx, type, freq * detune, this._pan(ctx, pan, dest)),
    ];
  }
  public _lfo(
    ctx: AudioContext,
    freq: number,
    depth: number,
    time: number,
    fadeIn: number,
    stopTime: number,
    dest: AudioNode | AudioParam,
    delay: number = 0,
  ): GainNode {
    const g = this._gain(ctx, 0, dest);
    this._set(g.gain, 0, time);
    if (delay > 0) this._set(g.gain, 0, time + delay);
    this._lin(g.gain, depth, time + delay + fadeIn);
    this._on(time, stopTime, this._osc(ctx, Osc.Sine, freq, g));
    return g;
  }

  public _gc(
    ctx: AudioContext,
    time: number,
    stopTime: number,
    ...nodes: AudioNode[]
  ): void {
    if (hasStrictGC) {
      const gcOsc = ctx.createOscillator();
      gcOsc.onended = () => {
        nodes.forEach((n) => {
          try {
            n.disconnect();
          } catch (e) {}
        });
      };
      gcOsc.start(time);
      gcOsc.stop(stopTime);
    }
  }
}
