import { RloData } from "./types.js";
import { Synthesizer } from "./Instruments/Synthesizer.js";
import { AudioEffects, ReverbMode } from "./AudioEffects.js";
import { RLOTranspiler } from "./RLO-Transpiler.js"; // Corrected import path
import { ISynthInstrument } from "./Instruments/ISynthInstrument.js";

export { RLOTranspiler };
export type { ISynthInstrument };

/**
 * A dummy synthesizer that does absolutely nothing.
 * Useful for completely muting specific MIDI IDs in an instrument map.
 */
export const SilentSynth: ISynthInstrument = {
  _playNote: () => {},
};

/** Configuration options for playing sequences/music. */
export interface PlaySequenceOptions {
  loop?: boolean;
  fadeInTime?: number;
  playbackRate?: number;
  volume?: number;
}

/** Configuration options for playing single Sound Effects. */
export interface SFXOptions {
  velocity?: number;
  timeOffset?: number;
}

/** Configuration for a standard ADSR volume envelope. */
export interface ADSREnvelope {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  peak?: number;
}

/**
 * Syntactic sugar for applying a standard ADSR envelope to a Web Audio GainNode.
 * @param gainParam The AudioParam (e.g., gainNode.gain) to animate.
 * @param now The physical start time of the sound.
 * @param duration The total held duration of the note.
 * @param opts ADSR configuration object.
 */
export function applyEnvelope(
  gainParam: AudioParam,
  now: number,
  duration: number,
  opts: ADSREnvelope,
): void {
  const a = opts.attack ?? 0.05;
  const d = opts.decay ?? 0.1;
  const s = opts.sustain ?? 0.8;
  const r = opts.release ?? 0.1;
  const peak = opts.peak ?? 1.0;

  gainParam.setValueAtTime(0, now);
  const realDur = Math.max(0, duration);

  if (realDur <= a) {
    const partialPeak = peak * (realDur / (a || 1));
    gainParam.linearRampToValueAtTime(partialPeak, now + realDur * 0.5);
    gainParam.linearRampToValueAtTime(0, now + realDur);
  } else if (realDur <= a + d) {
    gainParam.linearRampToValueAtTime(peak, now + a);
    gainParam.linearRampToValueAtTime(0, now + realDur);
  } else {
    gainParam.linearRampToValueAtTime(peak, now + a);
    gainParam.linearRampToValueAtTime(peak * s, now + a + d);
    const releaseStart = Math.max(now + a + d, now + realDur - r);
    gainParam.setValueAtTime(peak * s, releaseStart);
    gainParam.linearRampToValueAtTime(0, now + realDur);
  }
}

/** Flag injected by build tools to enable or disable string note parsing. */
declare const __ENABLE_NOTE_PARSER__: boolean;
const hasNoteParser =
  typeof __ENABLE_NOTE_PARSER__ !== "undefined" ? __ENABLE_NOTE_PARSER__ : true;

/**
 * Converts a musical note string (e.g., 'C4', 'F#5') to its frequency in Hz.
 * If a number is provided, it is returned as-is.
 */
export function Note(pitch: string | number): number {
  if (typeof pitch === "number") return pitch;
  if (!hasNoteParser) return 0;
  const match = pitch.match(/^([a-gA-G])([#b]?)(\d)$/);
  if (!match) return 0;
  const offsets: Record<string, number> = {
    C: -9,
    D: -7,
    E: -5,
    F: -4,
    G: -2,
    A: 0,
    B: 2,
  };
  const [, note, accidental, octave] = match;
  let semitone = offsets[note.toUpperCase()];
  if (accidental === "#") semitone++;
  if (accidental === "b") semitone--;
  semitone += (parseInt(octave, 10) - 4) * 12;
  return Number((440 * Math.pow(2, semitone / 12)).toFixed(2));
}

/** A fluent, chainable builder for creating RloData sequences procedurally. */
export class RLOSequenceBuilder {
  private _notes: number[] = [];
  private _duration: number = 0;

  public addNote(opts: {
    instrument: number;
    pitch: string | number;
    duration: number;
    time?: number;
    velocity?: number;
  }): this {
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

/** Flag injected by build tools (e.g., Vite) to enable or disable the transpiler (dead-code elimination). */
declare const __ENABLE_TRANSPILER__: boolean;
const hasTranspiler =
  typeof __ENABLE_TRANSPILER__ !== "undefined" ? __ENABLE_TRANSPILER__ : true;

/** Flag injected by build tools to enable or disable the RLOMusicPlayer features. */
declare const __ENABLE_MUSIC_PLAYER__: boolean;
const hasMusicPlayer =
  typeof __ENABLE_MUSIC_PLAYER__ !== "undefined"
    ? __ENABLE_MUSIC_PLAYER__
    : true;

/** Flag injected by build tools to enable or disable the RLOGameEngine features. */
declare const __ENABLE_GAME_ENGINE__: boolean;
const hasGameEngine =
  typeof __ENABLE_GAME_ENGINE__ !== "undefined" ? __ENABLE_GAME_ENGINE__ : true;

/** Flag injected by build tools to enable or disable the Web Worker metronome for background playback. */
declare const __ENABLE_WORKER_METRONOME__: boolean;
const hasWorkerMetronome =
  typeof __ENABLE_WORKER_METRONOME__ !== "undefined"
    ? __ENABLE_WORKER_METRONOME__
    : false;

/**
 * A "dumb" mapping mechanism for strict JS13K size-coding.
 * Bypasses the closest-match algorithm and explicitly assigns synths to individual IDs.
 * @param assignments An array of synthesizer modules and the exact MIDI IDs they should respond to.
 * @returns A fully populated array of 129 elements, with unassigned slots remaining null.
 */
export function createDirectMap(
  assignments: { synth: ISynthInstrument; ids: number[] }[],
): ISynthInstrument[] {
  const mapArray = new Array(129).fill(null);
  assignments.forEach((a) => {
    a.ids.forEach((id) => (mapArray[id] = a.synth));
  });
  return mapArray;
}

/**
 * Mathematically maps instruments by MIDI ID, auto-falling back to the closest available synthesizer.
 * @param modules An array of synthesizer module configurations to map.
 * @returns A fully populated array of 129 synthesizer instruments.
 */
export function createInstrumentMap(
  modules: { synth: ISynthInstrument; start: number; end: number }[],
): ISynthInstrument[] {
  const mapArray = new Array(129).fill(null);
  modules.forEach((m) => {
    for (let i = m.start; i <= m.end; i++) mapArray[i] = m.synth;
  });

  for (let i = 0; i < 129; i++) {
    if (mapArray[i] === null) {
      let closest = null;
      let minDiff = Infinity;
      for (let j = 0; j < 129; j++) {
        if (mapArray[j] !== null) {
          const diff = Math.abs(i - j);
          if (diff < minDiff) {
            minDiff = diff;
            closest = mapArray[j];
          }
        }
      }
      mapArray[i] = closest;
    }
  }
  return mapArray;
}

/**
 * Creates a new instrument map by merging custom synth overrides into an existing base map.
 * @param baseMap The base instrument map array.
 * @param overrides An array of synthesizer module configurations to override in the base map.
 * @returns A new array of synthesizer instruments with the overrides applied.
 */
export function extendInstrumentMap(
  baseMap: ISynthInstrument[],
  overrides: { synth: ISynthInstrument; start: number; end: number }[],
): ISynthInstrument[] {
  const newMap = [...baseMap];
  overrides.forEach((m) => {
    for (let i = m.start; i <= m.end; i++) newMap[i] = m.synth;
  });
  return newMap;
}

/**
 * RLOCore: The bare-metal procedural sequencer.
 * Zero networking, zero master effects. Just pure math to audio waves.
 */
export class RLOCore {
  /** The Web Audio API context used for all audio operations. */
  protected _ctx: AudioContext;
  /** Indicates whether a sequence is currently playing. */
  protected _isPlaying: boolean = false;
  /** Stores the timer ID for the standard JavaScript timeout metronome. */
  protected _timer: ReturnType<typeof setTimeout> | null = null;
  /** Stores the Web Worker instance for accurate background metronome timing. */
  protected _workerTimer: Worker | null = null;
  /** Incremental ID to keep track of the current playback sequence and prevent overlapping schedules. */
  protected _sequenceId: number = 0;
  /** The current track playback time in seconds. */
  protected _trkT: number = 0;
  /** The total duration of the currently playing track in seconds. */
  protected _trkD: number = 0; // _currentTrackDuration
  /** Array of active audio nodes that need to be cleaned up when playback stops. */
  protected _activeNodes: AudioNode[] = [];
  /** The current global volume level (0.0 to 1.0). */
  protected _volume: number = 0.5;
  /** The target time to seek to on the next scheduling tick. */
  protected _seekTarget: number | null = null;

  /** The playback speed multiplier (1.0 is normal speed). */
  public playbackRate: number = 1.0;

  /** Array of synthesizers mapped to their corresponding MIDI instrument IDs. */
  protected _instrumentMap: ISynthInstrument[];
  /** The object URL for the Web Worker script, used for cleanup. */
  protected _workerUrl: string | null = null;

  /**
   * Initializes a new RLOCore instance.
   * @param audioContext The Web Audio API context.
   * @param instrumentMap The instrument routing map to use for synthesis.
   */
  constructor(
    audioContext: AudioContext,
    instrumentMap: ISynthInstrument[] = [],
  ) {
    this._ctx = audioContext;
    this._instrumentMap = instrumentMap;

    if (hasWorkerMetronome) {
      const blob = new Blob(
        [
          `
        let timerID = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timerID) clearInterval(timerID);
            timerID = setInterval(() => self.postMessage('tick'), 50);
          } else if (e.data === 'stop' && timerID) {
            clearInterval(timerID); timerID = null;
          }
        };
      `,
        ],
        { type: "application/javascript" },
      );
      this._workerUrl = URL.createObjectURL(blob);
      this._workerTimer = new Worker(this._workerUrl);
    }
  }

  /** Gets the current time of the audio context. */
  protected get _now(): number {
    return this._ctx.currentTime;
  }

  /**
   * Sets the global playback volume.
   * @param vol The volume level (0.0 to 1.0).
   */
  public setVolume(vol: number): void {
    this._volume = vol;
  }

  /**
   * Seeks the currently playing track to the specified time in seconds.
   * @param timeInSeconds The target time in seconds.
   */
  public seek(timeInSeconds: number): void {
    if (this._trkD > 0) {
      this._seekTarget = Math.max(0, timeInSeconds) % this._trkD;
    }
  }

  /** Stops playback and clears all scheduled audio nodes and timers. */
  public stop(): void {
    this._isPlaying = false;
    this._sequenceId++;
    if (this._timer) clearTimeout(this._timer);
    if (this._workerTimer) this._workerTimer.postMessage("stop");

    const nodesToClean = this._activeNodes;
    this._activeNodes = [];

    nodesToClean.forEach((node) => {
      try {
        node.disconnect();
      } catch (e) {}
    });
  }

  /** Destroys the core engine, releasing memory and background workers. */
  public dispose(): void {
    this.stop();
    if (this._workerTimer) {
      this._workerTimer.terminate();
      this._workerTimer = null;
    }
    if (this._workerUrl) {
      URL.revokeObjectURL(this._workerUrl);
      this._workerUrl = null;
    }
  }

  /** Creates and returns a new GainNode. */
  protected _gain(): GainNode {
    return this._ctx.createGain();
  }

  /**
   * Applies a linear fade to an AudioParam over a specified duration.
   * @param gain The AudioParam to fade.
   * @param target The target value.
   * @param time The duration of the fade in seconds.
   */
  protected _fade(gain: AudioParam, target: number, time: number): void {
    gain.setValueAtTime(time > 0 ? 0 : target, this._now);
    if (time > 0) gain.linearRampToValueAtTime(target, this._now + time);
  }

  /** Creates a pre-configured DynamicsCompressorNode for mastering. */
  protected _comp(ctx: AudioContext = this._ctx): DynamicsCompressorNode {
    const c = ctx.createDynamicsCompressor();
    c.threshold.value = -24;
    c.knee.value = 12;
    c.ratio.value = 8;
    c.attack.value = 0.001;
    c.release.value = 0.25;
    return c;
  }

  /**
   * Sets up the master audio routing graph for this core.
   * @param fadeInTime Optional fade-in duration in seconds.
   * @returns An object containing the destination AudioNode.
   */
  protected _createRouting(fadeInTime: number = 0): { destination: AudioNode } {
    const gain = this._gain();
    this._fade(gain.gain, this._volume, fadeInTime);
    gain.connect(this._ctx.destination);
    this._activeNodes.push(gain);
    return { destination: gain };
  }

  /**
   * Plays a compiled RLO sequence.
   * @param track The compiled RloData to play.
   * @param loopOrOpts Whether the track should loop, or an Options Object.
   * @param fadeInTime Optional fade-in duration in seconds (default 0).
   */
  public playSequence(
    track: RloData,
    loopOrOpts: boolean | PlaySequenceOptions = true,
    oldFadeInTime: number = 0,
  ): void {
    let loop = true;
    let fadeInTime = oldFadeInTime;
    if (typeof loopOrOpts === "object") {
      loop = loopOrOpts.loop ?? true;
      fadeInTime = loopOrOpts.fadeInTime ?? 0;
      if (loopOrOpts.playbackRate !== undefined)
        this.playbackRate = loopOrOpts.playbackRate;
      if (loopOrOpts.volume !== undefined) this.setVolume(loopOrOpts.volume);
    } else {
      loop = loopOrOpts;
    }

    this.stop();
    if (this._ctx.state === "suspended") this._ctx.resume();

    this._isPlaying = true;
    const currentSequenceId = ++this._sequenceId;
    this._trkD = track.durationSecs;

    const { destination } = this._createRouting(fadeInTime);
    const synthesizer = new Synthesizer(
      this._ctx,
      destination as GainNode,
      this._instrumentMap,
    );

    const lookaheadTime = 0.5;
    this._trkT = -0.05 * this.playbackRate;
    let lastScheduleTime = this._now;
    let loopOffsetSecs = 0;
    let notePtr = 0;
    const notes = track.notes;
    const len = notes.length;

    const schedule = () => {
      if (!this._isPlaying || this._sequenceId !== currentSequenceId) return;
      const currentPhysicalTime = this._now;
      const deltaPhysical = currentPhysicalTime - lastScheduleTime;
      lastScheduleTime = currentPhysicalTime;

      if (this._seekTarget !== null) {
        this._trkT = this._seekTarget;
        loopOffsetSecs = 0;
        notePtr = 0;
        while (notePtr < len && notes[notePtr + 1] < this._seekTarget) {
          notePtr += 5;
        }
        this._seekTarget = null;
      } else {
        this._trkT += deltaPhysical * this.playbackRate;
      }

      const loopDurationSecs = track.durationSecs;

      while (notePtr < len) {
        const freq = notes[notePtr];
        const noteTime = notes[notePtr + 1];
        const noteDur = notes[notePtr + 2];
        const velocity = notes[notePtr + 3];
        const instrumentId = notes[notePtr + 4];

        const noteTrackTime = loopOffsetSecs + noteTime;

        if (noteTrackTime < this._trkT + lookaheadTime * this.playbackRate) {
          const notePhysicalTime =
            currentPhysicalTime +
            Math.max(0, (noteTrackTime - this._trkT) / this.playbackRate);
          synthesizer._playNote(
            instrumentId,
            notePhysicalTime,
            freq,
            noteDur / this.playbackRate,
            velocity,
          );
          notePtr += 5;
        } else {
          break;
        }
      }

      if (notePtr >= len) {
        if (loop) {
          notePtr = 0;
          loopOffsetSecs += loopDurationSecs;
          schedule();
        } else {
          if (this._workerTimer) this._workerTimer.postMessage("stop");
        }
        return;
      }
      if (!this._workerTimer) {
        this._timer = setTimeout(schedule, 50);
      }
    };
    if (this._workerTimer) {
      this._workerTimer.onmessage = () => schedule();
      this._workerTimer.postMessage("start");
    }
    schedule();
  }
}

/**
 * RLOMusicPlayer: The standard music player.
 * Includes network fetching, gzip decoding, convolution reverb, compression, and UI playback controls.
 */
export class RLOMusicPlayer extends RLOCore {
  /** The master volume control node. */
  private _masterGain: GainNode | null = null;
  /** The convolver node used for reverb effects. */
  private _reverb: ConvolverNode | null = null;
  /** The gain node controlling the wet/dry mix of the reverb effect. */
  private _fxGain: GainNode | null = null;
  /** A cache of recently loaded tracks to prevent redundant network requests. */
  private _trackCache: Map<string, RloData> = new Map();
  /** Event handler for pausing/resuming audio when the document visibility changes. */
  private _visibilityHandler!: () => void;
  /** The maximum number of tracks to store in the cache. */
  private _maxCacheSize: number = 20;
  /** The current acoustic space simulation mode. */
  private _reverbMode: ReverbMode = "concert";

  /**
   * Initializes a new RLOMusicPlayer instance with advanced effects and network capabilities.
   * @param audioContext The Web Audio API context.
   * @param instrumentMap Optional custom instrument map.
   */
  constructor(
    audioContext: AudioContext,
    instrumentMap: ISynthInstrument[] = [],
  ) {
    super(audioContext, instrumentMap);
    if (!hasMusicPlayer) return;

    AudioEffects._generateReverb(this._ctx, "concert");
    AudioEffects._generateReverb(this._ctx, "studio");

    this._visibilityHandler = () => {
      if (document.hidden) {
        this._ctx.suspend();
      } else if (this._isPlaying) {
        this._ctx.resume();
      }
    };

    // Only pause the AudioContext on tab hide if we AREN'T explicitly running in the background
    if (typeof document !== "undefined" && !hasWorkerMetronome) {
      document.addEventListener("visibilitychange", this._visibilityHandler);
    }
  }

  /**
   * Changes the acoustic space simulation for the reverb effect.
   * @param mode 'concert' (large hall) or 'studio' (small room).
   */
  public setReverbMode(mode: ReverbMode): void {
    if (!hasMusicPlayer) return;
    this._reverbMode = mode;
    if (this._reverb && this._fxGain) {
      this._reverb.buffer = AudioEffects._generateReverb(this._ctx, mode);
      this._fxGain.gain.setTargetAtTime(
        mode === "studio" ? 0.05 : 0.2,
        this._now,
        0.1,
      );
    }
  }

  /** Disposes the player, clearing caches and removing event listeners. */
  public dispose(): void {
    if (!hasMusicPlayer) return super.dispose();
    super.dispose();

    if (typeof document !== "undefined" && !hasWorkerMetronome) {
      document.removeEventListener("visibilitychange", this._visibilityHandler);
    }
    this._trackCache.clear();
  }

  /**
   * Sets the playback volume, smoothly ramping to the target value.
   * @param vol The volume level (0.0 to 1.0).
   */
  public setVolume(vol: number): void {
    super.setVolume(vol);
    if (!hasMusicPlayer) return;
    if (this._masterGain) {
      this._masterGain.gain.setTargetAtTime(vol, this._now, 0.1);
    }
  }

  /** Returns the current playback time of the track in seconds. */
  public getCurrentTime(): number {
    if (!hasMusicPlayer) return 0;
    if (this._trkD === 0 || !this._isPlaying) return 0;
    return Math.max(0, this._trkT) % this._trkD;
  }

  /** Returns the total duration of the currently loaded track in seconds. */
  public getTotalDuration(): number {
    if (!hasMusicPlayer) return 0;
    return this._trkD;
  }

  /**
   * Overrides the core routing to include reverb, filtering, and mastering compression.
   * @param fadeInTime Optional fade-in duration in seconds.
   * @returns An object containing the destination AudioNode.
   */
  protected _createRouting(fadeInTime: number = 0): { destination: AudioNode } {
    if (!hasMusicPlayer) return super._createRouting(fadeInTime);
    this._reverb = this._ctx.createConvolver();
    this._reverb.buffer = AudioEffects._generateReverb(
      this._ctx,
      this._reverbMode,
    );
    this._masterGain = this._gain();
    this._activeNodes.push(this._reverb, this._masterGain);

    this._fade(this._masterGain.gain, this._volume, fadeInTime);

    this._fxGain = this._gain();
    this._fxGain.gain.value = this._reverbMode === "studio" ? 0.05 : 0.2;
    this._activeNodes.push(this._fxGain);

    const masterFilter = this._ctx.createBiquadFilter();
    masterFilter.type = "lowpass";
    masterFilter.frequency.value = Math.min(this._ctx.sampleRate / 2 - 1, 6500);
    this._activeNodes.push(masterFilter);

    const compressor = this._comp();
    this._activeNodes.push(compressor);

    this._masterGain
      .connect(masterFilter)
      .connect(compressor)
      .connect(this._ctx.destination);
    this._masterGain
      .connect(this._reverb)
      .connect(this._fxGain)
      .connect(masterFilter);

    return { destination: this._masterGain };
  }

  /**
   * Loads and plays a track from a URL, a JSON object, or an existing RloData object.
   * @param trackUrlOrData The URL to fetch, or the raw track data.
   * @param fadeInOrOpts Optional fade-in duration in seconds, or an Options Object.
   * @param oldLoop Whether to loop the track (default true).
   */
  public async play(
    trackUrlOrData: string | RloData,
    fadeInOrOpts: number | PlaySequenceOptions = 0,
    oldLoop: boolean = true,
  ): Promise<void> {
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
      if (this._trackCache.has(trackUrlOrData)) {
        track = this._trackCache.get(trackUrlOrData)!;
      } else {
        const response = await fetch(trackUrlOrData);

        if (!hasTranspiler || trackUrlOrData.toLowerCase().endsWith(".json")) {
          const text = await response.text();
          track = JSON.parse(text);
        } else {
          const rawBuffer = await response.arrayBuffer();
          const view = new DataView(rawBuffer);
          // Check for 'RLO' magic bytes to see if the browser natively decompressed it
          const isDecompressed =
            view.byteLength >= 3 &&
            view.getUint8(0) === 82 &&
            view.getUint8(1) === 76 &&
            view.getUint8(2) === 79;

          if (isDecompressed) {
            track = RLOTranspiler._decodeBinary(rawBuffer);
          } else {
            const ds = new (window as any).DecompressionStream("gzip");
            const writer = ds.writable.getWriter();
            writer.write(rawBuffer);
            writer.close();
            track = RLOTranspiler._decodeBinary(
              await new Response(ds.readable).arrayBuffer(),
            );
          }
        }
        this._trackCache.set(trackUrlOrData, track);

        if (this._trackCache.size > this._maxCacheSize) {
          const firstKey = this._trackCache.keys().next().value;
          if (firstKey) this._trackCache.delete(firstKey);
        }
      }
    } else {
      track = trackUrlOrData;
    }

    this.playSequence(track, optionsObj);
  }

  /** Stops playback and gently resets the master gain nodes. */
  public stop(): void {
    if (!hasMusicPlayer) return super.stop();
    if (this._masterGain) {
      const now = this._now;
      this._masterGain.gain.cancelScheduledValues(now);
      this._masterGain.gain.setValueAtTime(0, now);

      this._masterGain = null;
      this._fxGain = null;
      this._reverb = null;
    }
    super.stop();
  }
}

/**
 * RLOGameEngine: Built for instant action.
 * Features a persistent master routing bus so SFX can play over background music
 * without interrupting each other or causing clipping.
 */
export class RLOGameEngine extends RLOCore {
  /** The persistent master routing bus volume node. */
  private _masterGain!: GainNode;
  /** The dedicated routing bus for Sound Effects. */
  private _sfxGain!: GainNode;
  /** The dedicated routing bus for Background Music. */
  private _musicGain!: GainNode;
  /** A separate synthesizer instance strictly for playing non-blocking sound effects. */
  private _sfxSynthesizer!: Synthesizer;

  /**
   * Initializes a new RLOGameEngine instance tailored for dynamic real-time audio.
   * @param audioContext The Web Audio API context.
   * @param instrumentMap Optional custom instrument map.
   */
  constructor(
    audioContext: AudioContext,
    instrumentMap: ISynthInstrument[] = [],
  ) {
    super(audioContext, instrumentMap);
    if (!hasGameEngine) return;

    this._masterGain = this._gain();
    this._masterGain.gain.value = this._volume;

    const compressor = this._comp();

    this._masterGain.connect(compressor).connect(this._ctx.destination);

    this._musicGain = this._gain();
    this._musicGain.connect(this._masterGain);

    this._sfxGain = this._gain();
    this._sfxGain.connect(this._masterGain);
    this._sfxSynthesizer = new Synthesizer(
      this._ctx,
      this._sfxGain,
      this._instrumentMap,
    );
  }

  /**
   * Smoothly changes the master volume for all game audio.
   * @param vol The volume level (0.0 to 1.0).
   */
  public setVolume(vol: number): void {
    super.setVolume(vol);
    if (!hasGameEngine) return;
    this._masterGain.gain.setTargetAtTime(vol, this._now, 0.1);
  }

  /**
   * Smoothly changes the volume strictly for the background music routing bus.
   * @param vol The volume level (0.0 to 1.0).
   */
  public setMusicVolume(vol: number): void {
    if (!hasGameEngine) return;
    this._musicGain.gain.setTargetAtTime(vol, this._now, 0.1);
  }

  /**
   * Smoothly changes the volume strictly for the sound effects routing bus.
   * @param vol The volume level (0.0 to 1.0).
   */
  public setSFXVolume(vol: number): void {
    if (!hasGameEngine) return;
    this._sfxGain.gain.setTargetAtTime(vol, this._now, 0.1);
  }

  /**
   * Overrides the core routing to tap into the persistent master game bus.
   * @param fadeInTime Optional fade-in duration in seconds.
   * @returns An object containing the destination AudioNode.
   */
  protected _createRouting(fadeInTime: number = 0): { destination: AudioNode } {
    if (!hasGameEngine) return super._createRouting(fadeInTime);
    const musicGain = this._gain();
    musicGain.connect(this._musicGain);
    this._activeNodes.push(musicGain);

    this._fade(musicGain.gain, 1, fadeInTime);

    return { destination: musicGain };
  }

  /**
   * Plays a fire-and-forget sound effect dynamically at runtime.
   * @param instrumentId The General MIDI ID of the instrument to use (e.g., 128 for percussion).
   * @param freqOrNote The frequency in Hz, or a Note String (e.g. 'E4').
   * @param duration The duration of the sound effect in seconds.
   * @param velocityOrOpts The velocity (0.0 to 1.0), or an Options Object.
   * @param oldTimeOffset Optional delay in seconds before the sound effect plays.
   */
  public playSFX(
    instrumentId: number,
    freqOrNote: number | string,
    duration: number,
    velocityOrOpts: number | SFXOptions = 1.0,
    oldTimeOffset: number = 0,
  ) {
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
    this._sfxSynthesizer._playNote(
      instrumentId,
      this._now + timeOffset,
      Note(freqOrNote),
      duration,
      velocity,
    );
  }

  /**
   * Plays an entire compiled RLO sequence as a fire-and-forget sound effect.
   * Note: This bypasses the sequencer and schedules all notes instantly. Ideal for short, complex jingles.
   * @param track The compiled RloData to play.
   * @param timeOffset Optional delay in seconds before the sequence starts.
   */
  public playSFXSequence(track: RloData, timeOffset: number = 0): void {
    if (!hasGameEngine) return;
    if (this._ctx.state === "suspended") this._ctx.resume();

    const start = this._now + timeOffset;
    const n = track.notes;
    const len = n.length;

    for (let i = 0; i < len; i += 5) {
      this._sfxSynthesizer._playNote(
        n[i + 4],
        start + n[i + 1],
        n[i],
        n[i + 2],
        n[i + 3],
      );
    }
  }

  /**
   * Plays a background music track, routing it through the master game bus.
   * @param track The compiled RloData to play.
   * @param loopOrOpts Whether the track should loop indefinitely (default true), or an Options Object.
   * @param fadeInTime Optional fade-in duration in seconds (default 0).
   */
  public playMusic(
    track: RloData,
    loopOrOpts: boolean | PlaySequenceOptions = true,
    oldFadeInTime: number = 0,
  ): void {
    if (!hasGameEngine) return;
    let opts: boolean | PlaySequenceOptions = loopOrOpts;
    if (typeof loopOrOpts === "object" && loopOrOpts.volume !== undefined) {
      this.setMusicVolume(loopOrOpts.volume);
      opts = { ...loopOrOpts };
      delete (opts as PlaySequenceOptions).volume;
    }
    this.playSequence(track, opts, oldFadeInTime);
  }

  /** Stops the currently playing background music. SFX will continue to function. */
  public stopMusic(): void {
    super.stop();
  }
}
