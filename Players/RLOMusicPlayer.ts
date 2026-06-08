import { RLOCore, PlaySequenceOptions } from "../Core/RLOCore.js";
import { RloData } from "../types.js";
import { ISynthInstrument } from "../Instruments/ISynthInstrument.js";
import { AudioEffects, ReverbMode } from "../AudioEffects.js";
import { decodeBinary } from "../RLO-Transpiler.js";

declare const __ENABLE_MUSIC_PLAYER__: boolean;
const hasMusicPlayer = typeof __ENABLE_MUSIC_PLAYER__ !== "undefined" ? __ENABLE_MUSIC_PLAYER__ : true;

declare const __ENABLE_WORKER_METRONOME__: boolean;
const hasWorkerMetronome = typeof __ENABLE_WORKER_METRONOME__ !== "undefined" ? __ENABLE_WORKER_METRONOME__ : false;

declare const window: any;
declare const document: any;

/**
 * A specialized extension of `RLOCore` designed for standalone music playback.
 * 
 * @reason Architecture Separation:
 * The base `RLOCore` is extremely lightweight and purely handles scheduling logic.
 * `RLOMusicPlayer` adds heavy features like Convolution Reverb routing, URL fetching,
 * binary decompression streams, and track caching. By separating these into a derived class,
 * JS13k game developers who just want to play simple 1-channel blips don't have to bundle
 * the gzip DecompressionStream or Convolution Reverb code.
 */
export class RLOMusicPlayer extends RLOCore {
  private _masterGainNode: GainNode | null = null;
  private _reverbNode: ConvolverNode | null = null;
  private _fxGainNode: GainNode | null = null;
  private _trackCacheMap: Map<string, RloData> = new Map();
  private _visibilityEventHandler!: () => void;
  private _maxCacheSizeLimit: number = 20;
  private _currentReverbMode: ReverbMode = "concert";

  constructor(audioContext: AudioContext, instrumentMap: ISynthInstrument[] = []) {
    super(audioContext, instrumentMap);
    if (!hasMusicPlayer) return;

    AudioEffects._generateReverb(this._ctx, "concert");
    AudioEffects._generateReverb(this._ctx, "studio");

    this._visibilityEventHandler = () => {
      if (document.hidden) {
        this._ctx.suspend();
      } else if (this._isPlaying) {
        this._ctx.resume();
      }
    };

    if (typeof document !== "undefined" && !hasWorkerMetronome) {
      document.addEventListener("visibilitychange", this._visibilityEventHandler);
    }
  }

  public setReverbMode(mode: ReverbMode): void {
    if (!hasMusicPlayer) return;
    this._currentReverbMode = mode;
    if (this._reverbNode && this._fxGainNode) {
      this._reverbNode.buffer = AudioEffects._generateReverb(this._ctx, mode);
      this._fxGainNode.gain.setTargetAtTime(mode === "studio" ? 0.05 : 0.2, this._now, 0.1);
    }
  }

  public dispose(): void {
    if (!hasMusicPlayer) return super.dispose();
    super.dispose();
    if (typeof document !== "undefined" && !hasWorkerMetronome) {
      document.removeEventListener("visibilitychange", this._visibilityEventHandler);
    }
    this._trackCacheMap.clear();
  }

  public setVolume(vol: number): void {
    super.setVolume(vol);
    if (!hasMusicPlayer) return;
    if (this._masterGainNode) {
      this._masterGainNode.gain.setTargetAtTime(vol, this._now, 0.1);
    }
  }

  public getCurrentTime(): number {
    if (!hasMusicPlayer) return 0;
    if (this._trkD === 0 || !this._isPlaying) return 0;
    return Math.max(0, this._trkT) % this._trkD;
  }

  public getTotalDuration(): number {
    if (!hasMusicPlayer) return 0;
    return this._trkD;
  }

  protected _createRouting(fadeInTime: number = 0): { destination: AudioNode } {
    if (!hasMusicPlayer) return super._createRouting(fadeInTime);
    this._reverbNode = this._ctx.createConvolver();
    this._reverbNode.buffer = AudioEffects._generateReverb(this._ctx, this._currentReverbMode);
    this._masterGainNode = this._createGain();
    this._activeNodes.push(this._reverbNode, this._masterGainNode);

    this._applyLinearFade(this._masterGainNode.gain, this._volume, fadeInTime);

    this._fxGainNode = this._createGain();
    this._fxGainNode.gain.value = this._currentReverbMode === "studio" ? 0.05 : 0.2;
    this._activeNodes.push(this._fxGainNode);

    const masterFilter = this._ctx.createBiquadFilter();
    masterFilter.type = "lowpass";
    masterFilter.frequency.value = Math.min(this._ctx.sampleRate / 2 - 1, 6500);
    this._activeNodes.push(masterFilter);

    const compressor = this._createCompressor();
    this._activeNodes.push(compressor);

    this._masterGainNode.connect(masterFilter).connect(compressor).connect(this._ctx.destination);
    this._masterGainNode.connect(this._reverbNode).connect(this._fxGainNode).connect(masterFilter);

    return { destination: this._masterGainNode };
  }

  public async play(trackUrlOrData: string | RloData, fadeInOrOpts: number | PlaySequenceOptions = 0, oldLoop: boolean = true): Promise<void> {
    if (!hasMusicPlayer) return;
    let track: RloData;
    let fadeInTime = 0;
    let optionsObj: PlaySequenceOptions = {};
    if (typeof fadeInOrOpts === "object") {
      fadeInTime = fadeInOrOpts.fadeInTime ?? 0;
      optionsObj = fadeInOrOpts;
    } else {
      fadeInTime = fadeInOrOpts;
      optionsObj = { fadeInTime, loop: oldLoop };
    }

    if (typeof trackUrlOrData === "string") {
      if (this._trackCacheMap.has(trackUrlOrData)) {
        track = this._trackCacheMap.get(trackUrlOrData)!;
      } else {
        const response = await fetch(trackUrlOrData);
        const hasTranspiler = typeof (window as any).__ENABLE_TRANSPILER__ !== "undefined" ? (window as any).__ENABLE_TRANSPILER__ : true;

        if (!hasTranspiler || trackUrlOrData.toLowerCase().endsWith(".json")) {
          const text = await response.text();
          track = JSON.parse(text);
        } else {
          const rawBuffer = await response.arrayBuffer();
          const view = new DataView(rawBuffer);
          const isDecompressed = view.byteLength >= 3 && view.getUint8(0) === 82 && view.getUint8(1) === 76 && view.getUint8(2) === 79;

          if (isDecompressed) {
            track = decodeBinary(rawBuffer);
          } else {
            const ds = new (window as any).DecompressionStream("gzip");
            const writer = ds.writable.getWriter();
            writer.write(rawBuffer);
            writer.close();
            track = decodeBinary(await new Response(ds.readable).arrayBuffer());
          }
        }
        this._trackCacheMap.set(trackUrlOrData, track);
        if (this._trackCacheMap.size > this._maxCacheSizeLimit) {
          const firstKey = this._trackCacheMap.keys().next().value;
          if (firstKey) this._trackCacheMap.delete(firstKey);
        }
      }
    } else {
      track = trackUrlOrData;
    }
    this.playSequence(track, optionsObj);
  }

  public stop(): void {
    if (!hasMusicPlayer) return super.stop();
    if (this._masterGainNode) {
      const now = this._now;
      this._masterGainNode.gain.cancelScheduledValues(now);
      this._masterGainNode.gain.setValueAtTime(0, now);
      this._masterGainNode = null;
      this._fxGainNode = null;
      this._reverbNode = null;
    }
    super.stop();
  }
}
