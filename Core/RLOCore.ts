import { RloData } from "../types.js";
import { ISynthInstrument } from "../Instruments/ISynthInstrument.js";
import { Synthesizer } from "../Instruments/Synthesizer.js";

/**
 * Options for playing a compiled RLO sequence.
 */
export interface PlaySequenceOptions {
  loop?: boolean;
  fadeInTime?: number;
  playbackRate?: number;
  volume?: number;
}

declare const __ENABLE_WORKER_METRONOME__: boolean;
const hasWorkerMetronome = typeof __ENABLE_WORKER_METRONOME__ !== "undefined" ? __ENABLE_WORKER_METRONOME__ : false;

/**
 * Base Engine Core responsible for the precise scheduling and timing of Web Audio nodes.
 * 
 * @reason Why we use a Worker for the metronome:
 * In modern browsers, `setTimeout` or `setInterval` on the main thread is throttled 
 * to ~1000ms if the user switches browser tabs (to save battery). 
 * By offloading the timing loop to a Web Worker, we guarantee that background tabs
 * continue to schedule audio nodes perfectly at 50ms intervals without skipping a beat.
 */
export class RLOCore {
  protected _ctx: AudioContext;
  protected _isPlaying: boolean = false;
  protected _timer: ReturnType<typeof setTimeout> | null = null;
  protected _workerTimer: Worker | null = null;
  protected _sequenceId: number = 0;
  protected _trkT: number = 0;
  protected _trkD: number = 0;
  protected _activeNodes: AudioNode[] = [];
  protected _volume: number = 0.5;
  protected _seekTarget: number | null = null;

  public playbackRate: number = 1.0;

  protected _instrumentMap: ISynthInstrument[];
  protected _workerUrl: string | null = null;

  constructor(audioContext: AudioContext, instrumentMap: ISynthInstrument[] = []) {
    this._ctx = audioContext;
    this._instrumentMap = instrumentMap;

    if (hasWorkerMetronome) {
      const blob = new Blob(
        [
          "let t=null;self.onmessage=e=>{let d=e.data;if(d=='start'){if(t)clearInterval(t);t=setInterval(()=>self.postMessage('tick'),50)}else if(d=='stop'&&t){clearInterval(t);t=null}};"
        ],
        { type: "application/javascript" },
      );
      this._workerUrl = URL.createObjectURL(blob);
      this._workerTimer = new Worker(this._workerUrl);
    }
  }

  protected get _now(): number {
    return this._ctx.currentTime;
  }

  public setVolume(vol: number): void {
    this._volume = vol;
  }

  public seek(timeInSeconds: number): void {
    if (this._trkD > 0) {
      this._seekTarget = Math.max(0, timeInSeconds) % this._trkD;
    }
  }

  public stop(): void {
    this._isPlaying = false;
    this._sequenceId++;
    if (this._timer) clearTimeout(this._timer);
    if (hasWorkerMetronome && this._workerTimer) this._workerTimer.postMessage("stop");

    const nodesToClean = this._activeNodes;
    this._activeNodes = [];

    while (nodesToClean.length) {
      try { nodesToClean.pop()!.disconnect(); } catch (e) {}
    }
  }

  public dispose(): void {
    this.stop();
    if (hasWorkerMetronome && this._workerTimer) {
      this._workerTimer.terminate();
      this._workerTimer = null;
    }
    if (hasWorkerMetronome && this._workerUrl) {
      URL.revokeObjectURL(this._workerUrl);
      this._workerUrl = null;
    }
  }

  protected _createGain(): GainNode {
    return this._ctx.createGain();
  }

  protected _applyLinearFade(gain: AudioParam, target: number, time: number): void {
    gain.setValueAtTime(time > 0 ? 0 : target, this._now);
    if (time > 0) gain.linearRampToValueAtTime(target, this._now + time);
  }

  protected _createCompressor(ctx: AudioContext = this._ctx): DynamicsCompressorNode {
    const c = ctx.createDynamicsCompressor();
    c.threshold.value = -24;
    c.knee.value = 12;
    c.ratio.value = 8;
    c.attack.value = 0.001;
    c.release.value = 0.25;
    return c;
  }

  protected _createRouting(fadeInTime: number = 0): { destination: AudioNode } {
    const gain = this._createGain();
    this._applyLinearFade(gain.gain, this._volume, fadeInTime);
    gain.connect(this._ctx.destination);
    this._activeNodes.push(gain);
    return { destination: gain };
  }

  public playSequence(track: RloData, loopOrOpts: boolean | PlaySequenceOptions = true, oldFadeInTime: number = 0): void {
    let loop = true;
    let fadeInTime = oldFadeInTime;
    if (typeof loopOrOpts === "object") {
      loop = loopOrOpts.loop ?? true;
      fadeInTime = loopOrOpts.fadeInTime ?? 0;
      this.playbackRate = loopOrOpts.playbackRate ?? this.playbackRate;
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
      if (len === 0) return; // Prevent infinite loop on empty tracks

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
        
        // Duck the volume briefly to hide the 0.5s lookahead buffer overlap
        const duckGain = destination as GainNode;
        if (duckGain.gain) {
           duckGain.gain.cancelScheduledValues(currentPhysicalTime);
           duckGain.gain.setValueAtTime(0.001, currentPhysicalTime);
           duckGain.gain.exponentialRampToValueAtTime(this._volume, currentPhysicalTime + 0.5);
        }
      } else {
        this._trkT += deltaPhysical * this.playbackRate;
      }

      const loopDurationSecs = track.durationSecs;

      while (notePtr < len) {
        const noteTrackTime = loopOffsetSecs + notes[notePtr + 1];

        if (noteTrackTime >= this._trkT + lookaheadTime * this.playbackRate) break;

        // The "Lag Chord" drop threshold:
        // If a thread freeze occurred, drop notes that are more than 150ms in the past
        if (this._trkT - noteTrackTime <= 0.15 * this.playbackRate) {
          const notePhysicalTime = currentPhysicalTime + Math.max(0, (noteTrackTime - this._trkT) / this.playbackRate);
          synthesizer._playNote(notes[notePtr + 4], notePhysicalTime, notes[notePtr], notes[notePtr + 2] / this.playbackRate, notes[notePtr + 3]);
        }
        notePtr += 5;
      }

      if (notePtr >= len) {
        if (loop) {
          notePtr = 0;
          loopOffsetSecs += loopDurationSecs;
          schedule();
        } else {
          if (hasWorkerMetronome && this._workerTimer) this._workerTimer.postMessage("stop");
        }
        return;
      }
      if (!hasWorkerMetronome || !this._workerTimer) {
        this._timer = setTimeout(schedule, 50);
      }
    };
    if (hasWorkerMetronome && this._workerTimer) {
      this._workerTimer.onmessage = () => schedule();
      this._workerTimer.postMessage("start");
    }
    schedule();
  }
}
