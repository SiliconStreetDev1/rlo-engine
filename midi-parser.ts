import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Midi } = require("@tonejs/midi");
import { RloData, PERCUSSION_INSTRUMENT_ID } from "./types.js";

export interface CompileStats {
  totalTracks: number;
  totalNotes: number;
  midiBytes: number;
  rloBytes: number;
  jsonBytes: number;
}

const trunc3 = (val: number): number => Math.round(val * 1000) / 1000;

export function convertMidiToRlo(
  midiBuffer: Buffer,
  noTrim: boolean = false,
): RloData | null {
  const midi = new Midi(midiBuffer);
  let noteStructs: { f: number; t: number; d: number; v: number; i: number }[] =
    [];

  let isVelocityFlat = true;
  let firstVelocity = -1;
  midi.tracks.forEach((track: any) => {
    track.notes.forEach((n: any) => {
      if (firstVelocity === -1) firstVelocity = n.velocity;
      else if (n.velocity !== firstVelocity) isVelocityFlat = false;
    });
  });

  const getCCValueAtTime = (
    ccArray: any[] | undefined,
    time: number,
    defaultVal: number,
  ): number => {
    if (!ccArray || ccArray.length === 0) return defaultVal;
    let left = 0;
    let right = ccArray.length - 1;
    let bestVal = ccArray[0].value;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (ccArray[mid].time <= time) {
        bestVal = ccArray[mid].value;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return bestVal;
  };

  midi.tracks.forEach((track: any) => {
    const isDrum = track.channel === 9;
    const instrumentId = isDrum
      ? PERCUSSION_INSTRUMENT_ID
      : track.instrument.number;

    const sustains = track.controlChanges[64];
    const volumes = track.controlChanges[7];
    const expressions = track.controlChanges[11];

    track.notes.forEach((n: any) => {
      let duration = n.duration;

      if (sustains && instrumentId !== PERCUSSION_INSTRUMENT_ID) {
        const nextSustainOff = sustains.find(
          (cc: any) => cc.time > n.time && cc.value < 64,
        );
        if (nextSustainOff && nextSustainOff.time > n.time + duration) {
          duration = nextSustainOff.time - n.time;
        }
      }

      duration = Math.min(duration, 5.0);
      duration = Math.max(0.01, duration - 0.02);

      const volCC = getCCValueAtTime(volumes, n.time, 1.0);
      const expCC = getCCValueAtTime(expressions, n.time, 1.0);
      let velocity = n.velocity * volCC * expCC;

      if (isVelocityFlat) {
        velocity = Math.max(
          0.1,
          Math.min(1.0, velocity + (Math.random() * 0.1 - 0.05)),
        );
      }

      let freq = Math.round(440 * Math.pow(2, (n.midi - 69) / 12) * 100) / 100;

      if (isDrum) {
        if (n.midi === 35 || n.midi === 36) freq = 40;
        else if (n.midi === 38 || n.midi === 40) freq = 80;
        else if (n.midi === 42 || n.midi === 44) freq = 100;
        else if (n.midi === 46) freq = 120;
        else if (
          n.midi === 49 ||
          n.midi === 51 ||
          n.midi === 52 ||
          n.midi === 53 ||
          n.midi === 55 ||
          n.midi === 57
        )
          freq = 150;
        else if (n.midi === 56) freq = 800;
        else freq = 60;
      }

      noteStructs.push({
        f: freq,
        t: trunc3(n.time),
        d: trunc3(duration),
        v: Math.round(velocity * 100) / 100,
        i: instrumentId,
      });
    });
  });

  if (noteStructs.length === 0) return null;

  noteStructs.sort((a, b) => {
    if (Math.abs(a.t - b.t) > 0.001) return a.t - b.t;
    if (a.f !== b.f) return a.f - b.f;
    return a.i - b.i;
  });

  const uniqueNotes: typeof noteStructs = [];
  noteStructs.forEach((n) => {
    if (uniqueNotes.length > 0) {
      const last = uniqueNotes[uniqueNotes.length - 1];
      if (Math.abs(last.t - n.t) < 0.005 && last.f === n.f && last.i === n.i) {
        last.v = Math.max(last.v, n.v);
        last.d = Math.max(last.d, n.d);
        return;
      }
    }
    uniqueNotes.push(n);
  });
  noteStructs = uniqueNotes;

  let finalDuration = midi.duration;
  const firstNoteTime = noteStructs[0].t;

  if (!noTrim && firstNoteTime > 0) {
    noteStructs.forEach((n) => (n.t = trunc3(n.t - firstNoteTime)));
    finalDuration = Math.max(0, finalDuration - firstNoteTime);
  }

  let maxTimeSecs = 0;
  const flatNotes: number[] = [];
  noteStructs.forEach((n) => {
    flatNotes.push(n.f, n.t, n.d, n.v, n.i);
    if (n.t + n.d > maxTimeSecs) maxTimeSecs = n.t + n.d;
  });

  finalDuration = Math.max(finalDuration, Math.ceil(maxTimeSecs));
  return { durationSecs: trunc3(finalDuration), notes: flatNotes };
}
