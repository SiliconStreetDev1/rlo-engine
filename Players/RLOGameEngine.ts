import { RLOCore, PlaySequenceOptions } from "../Core/RLOCore.js";
import { Note } from "../Core/AudioMath.js";
import { RloData } from "../types.js";
import { ISynthInstrument } from "../Instruments/ISynthInstrument.js";
import { Synthesizer } from "../Instruments/Synthesizer.js";

declare const __ENABLE_GAME_ENGINE__: boolean;
const hasGameEngine = typeof __ENABLE_GAME_ENGINE__ !== "undefined" ? __ENABLE_GAME_ENGINE__ : true;

export interface SFXOptions {
  velocity?: number;
  timeOffset?: number;
}

/**
 * Advanced audio engine designed specifically for video games (like JS13k entries).
 * 
 * @reason Architectural Separation:
 * This class completely isolates the Music bus from the SFX (Sound Effects) bus.
 * Games require distinct volume sliders for Music vs SFX. By instantiating a dedicated
 * internal `Synthesizer` explicitly for SFX, we can route all UI clicks, explosions, 
 * and jump sounds through the `_sfxRoutingGain` without disrupting the background 
 * music's master volume or looping sequence logic.
 */
export class RLOGameEngine extends RLOCore {
  private _gameMasterGain!: GainNode;
  private _sfxRoutingGain!: GainNode;
  private _musicRoutingGain!: GainNode;
  private _sfxInternalSynthesizer!: Synthesizer;

  constructor(audioContext: AudioContext, instrumentMap: ISynthInstrument[] = []) {
    super(audioContext, instrumentMap);
    if (!hasGameEngine) return;

    this._gameMasterGain = this._createGain();
    this._gameMasterGain.gain.value = this._volume;

    const compressor = this._createCompressor();

    this._gameMasterGain.connect(compressor).connect(this._ctx.destination);

    this._musicRoutingGain = this._createGain();
    this._musicRoutingGain.connect(this._gameMasterGain);

    this._sfxRoutingGain = this._createGain();
    this._sfxRoutingGain.connect(this._gameMasterGain);
    this._sfxInternalSynthesizer = new Synthesizer(this._ctx, this._sfxRoutingGain, this._instrumentMap);
  }

  public setVolume(vol: number): void {
    super.setVolume(vol);
    if (!hasGameEngine) return;
    this._gameMasterGain.gain.setTargetAtTime(vol, this._now, 0.1);
  }

  public setMusicVolume(vol: number): void {
    if (!hasGameEngine) return;
    this._musicRoutingGain.gain.setTargetAtTime(vol, this._now, 0.1);
  }

  public setSFXVolume(vol: number): void {
    if (!hasGameEngine) return;
    this._sfxRoutingGain.gain.setTargetAtTime(vol, this._now, 0.1);
  }

  protected _createRouting(fadeInTime: number = 0): { destination: AudioNode } {
    if (!hasGameEngine) return super._createRouting(fadeInTime);
    const musicGain = this._createGain();
    musicGain.connect(this._musicRoutingGain);
    this._activeNodes.push(musicGain);

    this._applyLinearFade(musicGain.gain, 1, fadeInTime);

    return { destination: musicGain };
  }

  public playSFX(instrumentId: number, freqOrNote: number | string, duration: number, velocityOrOpts: number | SFXOptions = 1.0, oldTimeOffset: number = 0) {
    if (!hasGameEngine) return;
    if (this._ctx.state === "suspended") this._ctx.resume();

    let velocity = 1.0;
    let timeOffset = oldTimeOffset;
    if (typeof velocityOrOpts === "object") {
      velocity = velocityOrOpts.velocity ?? 1.0;
      timeOffset = velocityOrOpts.timeOffset ?? 0;
    } else {
      velocity = velocityOrOpts;
    }
    this._sfxInternalSynthesizer._playNote(instrumentId, this._now + timeOffset, Note(freqOrNote), duration, velocity);
  }

  public playSFXSequence(track: RloData, timeOffset: number = 0): void {
    if (!hasGameEngine) return;
    if (this._ctx.state === "suspended") this._ctx.resume();

    const start = this._now + timeOffset;
    const n = track.notes;
    const len = n.length;

    for (let i = 0; i < len; i += 5) {
      this._sfxInternalSynthesizer._playNote(n[i + 4], start + n[i + 1], n[i], n[i + 2], n[i + 3]);
    }
  }

  public playMusic(track: RloData, loopOrOpts: boolean | PlaySequenceOptions = true, oldFadeInTime: number = 0): void {
    if (!hasGameEngine) return;
    let opts: boolean | PlaySequenceOptions = loopOrOpts;
    if (typeof loopOrOpts === "object" && loopOrOpts.volume !== undefined) {
      this.setMusicVolume(loopOrOpts.volume);
      opts = { ...loopOrOpts };
      delete (opts as PlaySequenceOptions).volume;
    }
    this.playSequence(track, opts, oldFadeInTime);
  }

  public stopMusic(): void {
    super.stop();
  }
}
