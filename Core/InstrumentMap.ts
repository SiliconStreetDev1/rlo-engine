import { ISynthInstrument } from "../Instruments/ISynthInstrument.js";

/**
 * Helper synth that produces zero sound, used as a fallback or placeholder.
 */
export const SilentSynth: ISynthInstrument = {
  _playNote: () => {},
};

/**
 * Creates a raw mapping between explicit MIDI Program IDs (0-128) and Synthesizer instances.
 * 
 * @reason Used primarily by the `crush` JS13k build where only 2 or 3 synths are bundled,
 * avoiding the need for complex fuzzy-matching loops.
 */
export function createDirectMap(assignments: { synth: ISynthInstrument; ids: number[] }[]): ISynthInstrument[] {
  const m: ISynthInstrument[] = [];
  assignments.forEach((a) => a.ids.forEach((id) => (m[id] = a.synth)));
  return m;
}

/**
 * Populates a 128-slot Array mapping MIDI Program IDs to Synthesizer instances.
 * 
 * @reason The NPM library comes with 16 default synths. Standard MIDI files might
 * request Program ID 44 (Contrabass), but we only have `StringSynth` mapped to 40-55.
 * This function uses a fuzzy "closest neighbor" algorithm to automatically fill
 * any missing gaps (e.g. mapping ID 44 to the nearest available synth ID). This guarantees
 * that imported MIDI files will always produce sound, even if the user hasn't explicitly
 * instantiated all 128 GM instruments.
 */
export function createInstrumentMap(modules: { synth: ISynthInstrument; start: number; end: number }[]): ISynthInstrument[] {
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

export function extendInstrumentMap(baseMap: ISynthInstrument[], overrides: { synth: ISynthInstrument; start: number; end: number }[]): ISynthInstrument[] {
  const newMap = [...baseMap];
  overrides.forEach((m) => {
    for (let i = m.start; i <= m.end; i++) newMap[i] = m.synth;
  });
  return newMap;
}
