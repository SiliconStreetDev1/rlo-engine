import { CoreSynthBase, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Karplus-Strong physical modeling.
 * Uses a noise burst fed into a tuned delay line with a feedback filter
 * to accurately simulate the physics of plucked strings (Acoustic Guitar, Harp).
 */
export class KarplusSynth extends CoreSynthBase {
  public _playNote(
    ctx: AudioContext,
    masterGain: GainNode,
    time: number,
    freq: number,
    duration: number,
    velocity: number,
  ): void {
    const delayTime = 1 / freq;

    // 1. The Plectrum (A microscopic burst of white noise)
    const burstBuffer = ctx.createBuffer(
      1,
      Math.max(1, ctx.sampleRate * delayTime),
      ctx.sampleRate,
    );
    const data = burstBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * velocity;

    const burst = ctx.createBufferSource();
    burst.buffer = burstBuffer;

    // 2. The String (A delay node exactly the length of the frequency)
    const delay = ctx.createDelay(delayTime);
    delay.delayTime.value = delayTime;

    // 3. The Body Damping (Lowpass filter inside the feedback loop to absorb high frequencies)
    const filter = this._filter(ctx, Filter.Lowpass);
    filter.frequency.value = Math.min(22000, freq * 6);

    // 4. The Tension (Feedback gain)
    const feedback = this._gain(ctx, 0.98); // Higher value = longer ring time

    burst.connect(delay).connect(filter).connect(feedback).connect(delay);

    const output = this._gain(ctx, 0, masterGain);
    this._set(output.gain, 1, time);
    this._exp(output.gain, 0.001, time + duration);

    delay.connect(output);
    this._on(time, time + duration, burst);

    this._gc(ctx, time, time + duration + 3.0, output, delay, filter, feedback);
  }
}
