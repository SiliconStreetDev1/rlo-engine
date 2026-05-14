/**
 * DEDICATED JS13K ENTRY POINT
 * Only export what you explicitly use. Rollup will violently tree-shake everything else.
 */
import { RLOCore as BaseCore, createDirectMap } from "./RLO-Player.js";

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
