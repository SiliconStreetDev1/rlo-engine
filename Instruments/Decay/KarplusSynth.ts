import { CoreSynthBase, Filter, hasStrictGC } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Karplus-Strong physical modeling.
 * Uses a noise burst fed into a tuned delay line with a feedback filter
 * to accurately simulate the physics of plucked strings (Acoustic Guitar, Harp).
 */
/**
 * Implements the Karplus-Strong string synthesis algorithm using a short noise burst fed through a tightly tuned feedback delay line.
 * 
 * @reason Acoustic Design:
 * Encapsulates the specific Web Audio node routing and ADSR parameters
 * required to physically model this instrument within the 13KB limit.
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
    const filter = this._createFilter(ctx, "lowpass");
    filter.frequency.value = Math.min(22000, freq * 6);

    // 4. The Tension (Feedback gain)
    const feedback = this._createGain(ctx, 0.98); // Higher value = longer ring time

    burst.connect(delay).connect(filter).connect(feedback).connect(delay);

    const output = this._createGain(ctx, 0, masterGain);
    this._setValueAtTime(output.gain, 1, time);
    this._exponentialRampToValue(output.gain, 0.001, time + duration);

    delay.connect(output);
    this._scheduleNodeStartStop(time, time + duration, burst);

    if (hasStrictGC) this._scheduleNodeDisposal(ctx, time, time + duration + 3.0, output, delay, filter, feedback);
  }
}
