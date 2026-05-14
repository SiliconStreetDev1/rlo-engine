export type ReverbMode = "concert" | "studio";

/**
 * Utility class for generating programmatic audio effects.
 */
export class AudioEffects {
  private static _cachedConcert: AudioBuffer | null = null;
  private static _cachedStudio: AudioBuffer | null = null;

  /**
   * Generates a mathematical impulse response for a Convolution Reverb node.
   * @param {AudioContext} ctx - The active AudioContext.
   * @param {ReverbMode} mode - The type of acoustic space to simulate.
   * @returns {AudioBuffer} The synthesized reverb impulse buffer.
   */
  public static _generateReverb(
    ctx: AudioContext,
    mode: ReverbMode = "studio",
  ): AudioBuffer {
    if (mode === "concert" && this._cachedConcert) return this._cachedConcert;
    if (mode === "studio" && this._cachedStudio) return this._cachedStudio;

    const isStudio = mode === "studio";
    const length =
      ctx.sampleRate *
      (isStudio ? 0.2 : 1.5); /** 0.2s for Studio, 1.5s for Concert */
    const decay = isStudio ? 8 : 4; /** Exponential decay factor */

    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let i = 0; i < 2; i++) {
      const channel = impulse.getChannelData(i);
      let lastOut = 0;
      for (let j = 0; j < length; j++) {
        /** Simple lowpass filter to absorb harsh high frequencies in the tail */
        const noise = Math.random() * 2 - 1;
        lastOut = lastOut + 0.3 * (noise - lastOut);
        /** True exponential acoustic decay multiplied by a linear fade to ensure 0 at the tail */
        channel[j] =
          lastOut * Math.exp(-decay * (j / length)) * (1 - j / length);
      }
    }

    // Cache the newly generated impulse
    return isStudio
      ? (this._cachedStudio = impulse)
      : (this._cachedConcert = impulse);
  }
}
