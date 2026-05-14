import { CoreSynthBase, Osc, Filter } from "../CoreSynthBase.js";

/**
 * Synthesizer strategy for Percussion and Drum kits.
 */
export class DrumSynth extends CoreSynthBase {
  /** Cached white noise buffer to prevent massive memory allocations and GC spikes. */
  private static _cachedNoiseBuffer: AudioBuffer | null = null;

  private static _getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (
      !DrumSynth._cachedNoiseBuffer ||
      DrumSynth._cachedNoiseBuffer.sampleRate !== ctx.sampleRate
    ) {
      const bufferSize = ctx.sampleRate * 1.0;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      DrumSynth._cachedNoiseBuffer = buffer;
    }
    return DrumSynth._cachedNoiseBuffer;
  }

  public _playNote(
    ctx: AudioContext,
    masterGain: GainNode,
    time: number,
    freq: number,
    duration: number,
    velocity: number,
  ): void {
    /** Standard MIDI maps specific frequencies to specific drum kit pieces */
    if (freq < 70) {
      const gain = this._gain(ctx, 0, masterGain);
      const osc = this._osc(ctx, Osc.Sine, 0, gain);

      this._set(osc.frequency, 150, time);
      this._exp(osc.frequency, 30, time + 0.1);
      this._set(gain.gain, Math.max(0.001, velocity * 1.5), time);
      this._exp(gain.gain, 0.001, time + 0.5);

      this._on(time, time + 0.5, osc);

      this._gc(ctx, time, time + 0.6, gain);
    } else {
      /** HI-HAT / SNARE (White Noise generation) */
      const isSnare = freq < 90;

      const noise = ctx.createBufferSource();
      noise.buffer = DrumSynth._getNoiseBuffer(ctx);
      const gain = this._gain(ctx, 0, masterGain);
      const filter = this._filter(
        ctx,
        isSnare ? Filter.Bandpass : Filter.Highpass,
      );
      const panner = this._pan(ctx, isSnare ? 0 : Math.random() * 0.6 - 0.3);

      filter.frequency.value = isSnare ? 1500 : 5000;

      this._set(gain.gain, Math.max(0.001, velocity), time);
      this._exp(gain.gain, 0.001, time + (isSnare ? 0.2 : 0.05));

      noise.connect(filter).connect(gain).connect(panner);
      this._on(time, time + (isSnare ? 0.2 : 0.05), noise);

      /** Add an extra body thwack tone if it is a snare */
      if (isSnare) {
        const snareOsc = this._osc(ctx, Osc.Triangle, 0, gain);
        /** Snare drum head tension: quick pitch drop when the stick hits the skin */
        this._set(snareOsc.frequency, 300, time);
        this._exp(snareOsc.frequency, 100, time + 0.1);
        this._on(time, time + 0.2, snareOsc);
      } else {
        /** 808 Cymbal Metallic Ring: TR-808 hi-hats contain high-pitched ringing square waves */
        this._transient(
          ctx,
          Osc.Square,
          7000,
          panner,
          time,
          Math.max(0.001, velocity * 0.2),
          0.05,
        );
      }

      this._gc(ctx, time, time + 0.4, filter, gain, panner);
    }
  }
}
