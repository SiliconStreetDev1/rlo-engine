/**
 * @fileoverview DEDICATED JS13K ENTRY POINT
 * 
 * @reason Why do we have a separate entry point for JS13k?
 * The standard NPM entry point (`index.ts`) instantiates a `MasterInstrumentMap`
 * containing all 16 default synthesizers, which prevents Rollup from tree-shaking them.
 * This `crush.ts` file only instantiates exactly the synths you manually define here,
 * allowing Rollup to violently tree-shake all unused synthesizers, bringing the engine 
 * weight down from 7KB to ~2KB.
 */
import { createDirectMap } from "./Core/InstrumentMap.js";
import { RLOCore as BaseCore } from "./Core/RLOCore.js";

import { PianoSynth } from "./Instruments/Decay/PianoSynth.js";
import { ChromaticPercussionSynth } from "./Instruments/Decay/ChromaticPercussionSynth.js";
import { SlapBassSynth } from "./Instruments/Decay/SlapBassSynth.js";

// Bake the map directly into the minified bundle so your game code stays tiny!
const crushMap = createDirectMap([
  { synth: new PianoSynth(), ids: [0] },
  { synth: new ChromaticPercussionSynth(), ids: [8] },
  { synth: new SlapBassSynth(), ids: [36] },
]);

export class RLOCore extends BaseCore {
  constructor(ctx: AudioContext, customMap?: any) {
    super(ctx, customMap || crushMap);
  }
}
