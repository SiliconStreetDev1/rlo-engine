# RLO Audio Engine

An optimized compiler and procedural Web Audio engine designed specifically for web-based games.

RLO converts sequence files (like MIDI) into 1D numerical arrays, bypassing the need for external parsing libraries or audio samples. Audio is synthesized dynamically at runtime using pure mathematics and the native Web Audio API.


Demo PWA game using this library : https://github.com/SiliconStreetDev1/NeonBlitz

🎮 **[PLAY NEON BLITZ DIRECTLY IN YOUR BROWSER HERE!](https://siliconstreetdev1.github.io/NeonBlitz/)** 🎮

### 🚀 Two Ways to Use the Engine

This library uses a **Hybrid Architecture**. You can either install it directly via NPM for standard development, or clone it as a build-pipeline boilerplate to achieve high compression for JS13K competitions.

---

## Paradigm A: The NPM Module (Standard Usage)

For modern game developers who want a drop-in library that handles everything automatically.

### 1. Install the Package

```bash
npm install rlo-engine
```

### 2. Compile Your Audio Tracks

Installing the package automatically exposes the `rlo` CLI tool. Drop your MIDI files into a local folder and run the compiler to shrink them into `.rlo` binaries:

```bash
npx rlo --in-midi ./assets/midi --out ./public/audio
```

_(Note: The compiler also accepts zip archives! Use `--in-zips ./assets/zips`)_

### 3. Initialize the Engine (Mapping Your Instruments)

Depending on your goals, you can initialize the engine in three different ways:

**Option 1: The Fallback (Zero Config, Full Bundle)**
If you initialize the engine without providing a list of instruments, it automatically falls back to a master list containing every default synthesizer. It plays every MIDI instrument out-of-the-box, but forces your bundler to pack every synth.

**Option 2: The Extension (Adding Experimental Synths)**
If you want to use the default master list, but also want to inject one of the "Disabled by default" synths (like the `ChiptuneSynth`), you can import `MasterInstrumentMap` and merge them together using `extendInstrumentMap`.

**Option 3: The Override (Minimal Footprint)**
To minimize footprint, you can pass a custom map using `createInstrumentMap`. This overrides the master list, ensuring _only_ the synths you explicitly import are included in your final JavaScript bundle.

**Option 4: Muting an Instrument**
If you want to use the default master list but completely mute a specific instrument (like the Drum Kit), you can overwrite its ID with the built-in `SilentSynth`.

#### Included Synthesizers

The engine routes MIDI instrument IDs to the following built-in synths automatically. If an exact ID isn't mapped, it mathematically routes to the closest one.

| Synthesizer                | Default MIDI Range  | Description                                                                        |
| -------------------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `PianoSynth`               | 0 - 7               | Acoustic & Electric Pianos, Clavinet                                               |
| `FMSynth`                  | 4 - 5               | **(Disabled by default)** 80s FM Electric Pianos (DX7 style)                       |
| `ChromaticPercussionSynth` | 8 - 15              | Glockenspiel, Vibraphone, Marimba, Bells                                           |
| `AdditiveSynth`            | 14, 98, 112         | **(Disabled by default)** Tubular Bells, Crystal, Tinkle Bell                      |
| `OrganSynth`               | 16 - 23             | Hammond, Church, Reed Organs, Accordion                                            |
| `GuitarSynth`              | 24 - 26             | Acoustic, Nylon, Jazz Guitars                                                      |
| `KarplusSynth`             | 24 - 25             | **(Disabled by default)** Hyper-realistic physical modeling Acoustic/Nylon Guitars |
| `ElectricGuitarSynth`      | 27 - 31             | Clean, Overdrive, Distortion, Harmonics                                            |
| `BassSynth`                | 32 - 39             | Acoustic, Finger, Pick, Synth Basses                                               |
| `ReeseBassSynth`           | 38 - 39             | **(Disabled by default)** Synth Bass 1 & 2                                         |
| `StringSynth`              | 40 - 55             | Violins, Violas, Choirs, Orchestral Harps                                          |
| `FormantSynth`             | 52 - 54             | **(Disabled by default)** Choir Aahs, Voice Oohs, Synth Voice                      |
| `BrassSynth`               | 56 - 71             | Trumpets, Trombones, French Horns, Synth Brass                                     |
| `WoodwindSynth`            | 72 - 79             | Flutes, Oboes, Clarinets, Ocarinas                                                 |
| `ChiptuneSynth`            | 80 - 82             | **(Disabled by default)** Retro 8-bit Square waves (GameBoy style)                 |
| `SlapBassSynth`            | 36 - 37             | **(Disabled by default)** 80s Slap Bass (DX7/Seinfeld style)                       |
| `LeadSynth`                | 83 - 87             | Modern Analog Leads, Sawtooths                                                     |
| `PadSynth`                 | 88 - 95             | Warm Pads, Sweeps, Halo, Bowed Glass                                               |
| `SoundEffectsSynth`        | 96 - 103, 120 - 127 | Sci-Fi, Rain, Breath, Seashore, Gunshots, Footsteps                                |
| `EthnicSynth`              | 104 - 111           | Sitar, Shamisen, Koto, Kalimba                                                     |
| `DrumSynth`                | 112 - 119, 128      | Woodblocks, Taikos, Percussion, and Channel 10 Drum Kits                           |

```typescript
import {
  RLOGameEngine,
  MasterInstrumentMap,
  extendInstrumentMap,
  createInstrumentMap,
  RetroInstrumentMap,
  PianoSynth,
  ChiptuneSynth,
  DrumSynth,
  SilentSynth,
} from "rlo-engine";

const ctx = new (window.AudioContext || window.webkitAudioContext)();

// OPTION 1: The Fallback (Loads all default instruments automatically)
const engine1 = new RLOGameEngine(ctx);

// OPTION 2: The Extension (Keeps defaults, but injects the disabled ChiptuneSynth)
const extendedMap = extendInstrumentMap(MasterInstrumentMap, [
  { synth: new ChiptuneSynth(), start: 80, end: 82 },
]);
const engine2 = new RLOGameEngine(ctx, extendedMap);

// OPTION 3: The Override (Minimal footprint! Only loads exactly what you pass)
const customMap = createInstrumentMap([
  { synth: new PianoSynth(), start: 0, end: 7 },
  { synth: new ChiptuneSynth(), start: 80, end: 82 },
  { synth: new DrumSynth(), start: 128, end: 128 },
]);
const engine3 = new RLOGameEngine(ctx, customMap);

// OPTION 5: Pre-Packaged Maps (e.g. 8-Bit Retro)
// Only bundles ChiptuneSynth and DrumSynth automatically
const retroEngine = new RLOGameEngine(ctx, RetroInstrumentMap);

// OPTION 4: Muting (Keeps defaults, but mutes the Drum Kit at ID 128)
const mutedMap = extendInstrumentMap(MasterInstrumentMap, [
  { synth: SilentSynth, start: 128, end: 128 },
]);

// RLOGameEngine expects decoded RloData objects!
// To load binary .rlo files, see the "Decoding .rlo Binary Files" section below.
```

### Decoding `.rlo` Binary Files

If you are using `RLOMusicPlayer`, it handles fetching and decompression automatically via `player.play('/track.rlo')`. However, if you are using `RLOGameEngine` or `RLOCore`, you must fetch and decode the `.rlo` files yourself.

The `.rlo` files generated by the CLI compiler are **gzipped binary buffers**. Here is the standard boilerplate to fetch, unzip, and decode them using native browser APIs:

```javascript
import { RLOTranspiler } from "rlo-engine";

async function loadAndPlayRLO(url, engine) {
  const res = await fetch(url);

  // 1. Unzip the file using the native Browser DecompressionStream
  const ds = new DecompressionStream("gzip");
  const decompressedStream = res.body.pipeThrough(ds);
  const buffer = await new Response(decompressedStream).arrayBuffer();

  // 2. Decode the binary buffer into the RloData object format
  const trackData = RLOTranspiler._decodeBinary(buffer);

  // 3. Play it!
  engine.playMusic(trackData); // Use playSequence(trackData) if using RLOCore
}
```

---

## Paradigm B: The JS13k Boilerplate (High Compression)

For size-coding and JS13k developers. By cloning the repo and using the custom build pipeline, you bypass ES module boundaries, allowing the Terser minifier to mangle internal properties and strip out any synthesizers you don't actively use.

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/rlo-engine.git
cd rlo-engine
npm install
```

### 2. Local Testing (The Test Rig)

To hear your tracks, test the synthesizers, or debug sequence arrays, you can use the included `index.html` test rig.

1. Drop your `.mid` or `.zip` files into `tracks/midi/` or `tracks/zips/`.
2. Run `npm run start`.
3. A web page will open where you can play your sequences, test the Convolution Reverb, and trigger Game Engine sound effects.

### 3. Configure & Crush Your Engine

To achieve the absolute smallest file size, the JS13k build uses a dedicated entry point (`crush.ts`) to completely bypass the master instrument map.

1. Open `crush.ts` and import **only** the exact classes you need. Bake the map directly into the core wrapper so your game code stays tiny:

   ```typescript
   // crush.ts
   import { RLOCore as BaseCore, createDirectMap } from "./RLO-Player.js";
   import { DrumSynth } from "./Instruments/Speciality/DrumSynth.js";
   import { PianoSynth } from "./Instruments/Decay/PianoSynth.js";

   const crushMap = createDirectMap([
     { synth: new PianoSynth(), ids: [0] },
     { synth: new DrumSynth(), ids: [128] },
   ]);

   export class RLOCore extends BaseCore {
     constructor(ctx: AudioContext, customMap?: any) {
       super(ctx, customMap || crushMap);
     }
   }
   ```

   - _Any synth not explicitly imported and mapped here will be removed by Rollup's tree-shaking._

#### What are the mapping parameters used for?

The `createDirectMap` function takes an array of objects that connect incoming musical notes to the correct audio synthesizer:

1. **`synth`** _(e.g., `new PianoSynth()`)_
   This instantiates the physical "instrument" that will sit in memory waiting for notes.
2. **`ids`** _(e.g., `[36]` or `[0, 1, 2]`)_
   This is an array of **General MIDI Instrument Numbers**. When you compile a MIDI file into an `.rlo` array, every note is tagged with an ID from `0` to `128`.
   - If a note comes in tagged with ID `36`, the engine routes it to the `SlapBassSynth`.
   - If you want a single synth to cover multiple IDs, expand the array: `ids: [0, 4, 6]`.
   - _Note: ID `128` is specially reserved for the Drum/Percussion Kit._

3. **Crush the Engine:** Run `npm run build:crush`
4. Copy the minified `dist/rlo-engine.min.js` file and your `dist/tracks/` folder directly into your game.

#### Engine Feature Flags (`vite.config.ts`)

Set these `define` flags to `false` to squeeze out even more bytes via dead-code elimination:

| Flag                          | Description                                                                | Default |
| ----------------------------- | -------------------------------------------------------------------------- | ------- |
| `__ENABLE_TRANSPILER__`       | Decodes binary `.rlo` files. Disable if you only use raw JSON arrays.      | `true`  |
| `__ENABLE_MUSIC_PLAYER__`     | Includes network fetching, convolver reverb, and track caching.            | `true`  |
| `__ENABLE_GAME_ENGINE__`      | Includes the dedicated SFX routing bus.                                    | `true`  |
| `__ENABLE_WORKER_METRONOME__` | Uses an un-throttled Web Worker for bulletproof background tab scheduling. | `false` |

---

## API Reference

The library exports three specialized execution cores depending on your game's needs. All constructors accept an optional `customMap` parameter. If omitted, they will safely fall back to the master list of all instruments.

### 1. `RLOGameEngine` (For Standard Games)

Built for instant action. Features a persistent master routing bus and a dynamics compressor. Sound effects are fire-and-forget and won't interrupt the background sequencer or cause clipping. Includes dedicated internal volume routing for music and SFX.

```javascript
import { RLOGameEngine } from "rlo-engine";

const ctx = new (window.AudioContext || window.webkitAudioContext)();
const engine = new RLOGameEngine(ctx); // Omit 2nd parameter to use all instruments

// Dedicated bus volumes
engine.setMusicVolume(0.8);
engine.setSFXVolume(1.0);

engine.playMusic("/tracks/boss-theme.rlo", {
  loop: true,
  fadeInTime: 0.5,
  volume: 0.9,
});

// Fire-and-forget SFX
engine.playSFX(128, 60, 0.5, { velocity: 1.0 }); // Kick drum thump
engine.playSFX(9, "B5", 0.1, { velocity: 0.7 }); // Glockenspiel coin sound using Note Pitch Helper!

// Exact audio-thread scheduling using timeOffset (e.g. for arpeggios without setTimeout)
engine.playSFX(83, "A4", 0.2, { velocity: 0.7, timeOffset: 0.0 }); // Note 1 plays instantly
engine.playSFX(83, "C#5", 0.2, { velocity: 0.7, timeOffset: 0.1 }); // Note 2 plays 100ms later
engine.playSFX(83, "E5", 0.2, { velocity: 0.7, timeOffset: 0.2 }); // Note 3 plays 200ms later

// Define a short sequence (durationSecs, [freq, time, duration, velocity, instrumentId, ...])
const myLevelCompleteData = {
  durationSecs: 1.0,
  notes: [
    440.0,
    0.0,
    0.2,
    0.8,
    83, // A4
    554.37,
    0.2,
    0.2,
    0.8,
    83, // C#5
    659.25,
    0.4,
    0.4,
    0.8,
    83, // E5
  ],
};

// Play an entire compiled RLO sequence as a fire-and-forget SFX payload!
engine.playSFXSequence(myLevelCompleteData);
```

### 2. `RLOMusicPlayer` (Rich Playback)

Best for general music players. Includes network fetching, gzip decompression, convolution reverb environments, and UI playback tracking.

```javascript
import { RLOMusicPlayer } from "rlo-engine";

const ctx = new (window.AudioContext || window.webkitAudioContext)();
const player = new RLOMusicPlayer(ctx); // Omit 2nd parameter to use all instruments

await player.play("/tracks/my-song.rlo", { fadeInTime: 0.5, loop: true });
player.setVolume(0.8);
player.setReverbMode("studio"); // 'concert' or 'studio'

console.log(`Time: ${player.getCurrentTime()} / ${player.getTotalDuration()}`);
player.stop();
```

### 3. `RLOCore` (Micro Size)

The base procedural sequencer. No networking, no master effects. Converts 1D memory arrays to soundwaves.

```javascript
import { RLOCore } from "rlo-engine";

const ctx = new (window.AudioContext || window.webkitAudioContext)();
const core = new RLOCore(ctx); // Omit 2nd parameter to use all instruments

// RLOCore is bare-metal and bypasses the transpiler, so you must pass a raw JSON object!
core.playSequence(
  { durationSecs: 2.0, notes: [440, 0, 0.5, 1, 83] },
  { loop: true },
);
```

---

## Understanding The Data Format

To achieve the smallest possible file size and zero garbage-collection overhead, sequences are flattened into a 1-dimensional numerical array. Every 5 numbers in the `notes` array represents a single musical note:

`[ frequency, time, duration, velocity, instrumentId ]`

- **`frequency`**: The pitch of the note in Hertz (e.g., `440.0` for A4).
- **`time`**: Start time in seconds.
- **`duration`**: How long the note is held in seconds.
- **`velocity`**: The volume/velocity (`0.0` to `1.0`).
- **`instrumentId`**: General MIDI instrument number (`0` to `127`), or `128` for the percussion engine.

**Bypassing the Transpiler for Instant Web Games:**
You can skip `.rlo` files entirely and pass compiled JSON arrays directly into the player. This is ideal for tiny HTML5 games where you want to hardcode the audio payload directly into your Javascript bundle for zero-latency execution.

```javascript
player.play({ durationSecs: 12.5, notes: [440, 0, 1, 1.0, 1 /* ... */] });
```

---

## How Synthesizers Work (Building Custom Instruments)

Instead of playing audio files, synthesizers in RLO generate sound waves mathematically. Every synthesizer extends the `CoreSynthBase` class (or `AnalogSynthBase` for sustained ADSR instruments) and implements the `_playNote` method.

The base class provides hyper-minified utility wrappers around the native Web Audio API (e.g., `_osc`, `_gain`, `_set`, `_lin`, `_exp`, `_on`) to keep your custom synth code tiny.

If you want a totally unique sound, you can easily create your own synth and inject it via a custom instrument map!

### Example: Custom 8-Bit Square Wave Synth

```javascript
import { CoreSynthBase, Osc, applyEnvelope } from "rlo-engine";

export class MyCustomSynth extends CoreSynthBase {
  _playNote(ctx, masterGain, time, freq, duration, velocity) {
    // 1. Create a volume node (Gain) routed to the master bus
    const gain = this._gain(ctx, 0, masterGain);

    // 2. Create a sound wave (Oscillator)
    const osc = this._osc(ctx, Osc.Square, freq, gain);

    // 3. Mathematical Volume Envelope (ADSR)
    applyEnvelope(gain.gain, time, duration, {
      attack: 0.05,
      release: 0.1,
      peak: velocity * 0.5,
    });

    // 4. Start & Stop the oscillator
    this._on(osc, time, time + duration);
  }
}
```

---

## What Happens if an Instrument is Missing? (Fallback Behavior)

Because this engine is built defensively, it handles missing synthesizers in two completely different ways depending on your build pipeline to ensure your game never crashes:

### 1. The Standard NPM Fallback (Smart Algorithm)

If you initialize the engine using `createInstrumentMap` (which the default `MasterInstrumentMap` uses), the engine runs a mathematical **"closest-match"** algorithm during setup.
If a MIDI file calls for a Harpsichord (ID `6`), but you didn't map a Harpsichord, the engine loops through the IDs, realizes that the `PianoSynth` (mapped to IDs `0-7`) is mathematically the closest acoustic relative, and automatically routes the Harpsichord notes to the Piano. Every single slot from 0 to 128 is guaranteed to be filled.

### 2. The JS13k Crush Fallback (Safe Silence)

If you use `createDirectMap` (used in `crush.ts`), you explicitly bypass the smart algorithm to save bytes. Slots you don't map are left as `null`. When the engine receives a note:

1. **Exact Match:** It checks for the exact ID (e.g., ID `36` for Slap Bass).
2. **Default Fallback:** If unmapped, it automatically falls back to whatever synthesizer is sitting at ID `0` (traditionally the Acoustic Piano).
3. **Safe Silence:** If ID `0` is _also_ unmapped, the engine safely ignores the note. It plays silence instead of throwing a fatal JavaScript `undefined` exception and crashing your game loop.

---

## 🤖 Guide to Prompts (For Humans & AI)

Because RLO synthesizes sounds mathematically from raw Web Audio API oscillators, it does not behave like a standard MIDI soundfont player. Writing (or prompting an AI to write) good sequence arrays requires specific formatting and acoustic tricks.

### The "Master Prompt" (Copy & Paste to AI)

If you want another AI to successfully generate a new track for this engine on the first try, copy and paste this exact prompt to them:

```text
Act as an expert procedural audio sequencer. Generate a JSON sequence for the RLO engine.
Vibe: "[INSERT SONG OR VIBE HERE]".

Strict Format Requirements:
1. Output valid JSON only, using this exact structure: `{ "durationSecs": <number>, "notes": [f, t, d, v, i, ...] }`.
2. Every note is flattened into exactly 5 numbers: `frequency` (Hz), `time` (seconds), `duration` (seconds), `velocity` (0.0 to 1.0), and `instrumentId` (0-128).
3. CRITICAL: The `notes` array MUST be strictly sorted chronologically by `time`.

Acoustic & Procedural Rules:
- Articulation Gaps: Never let notes touch perfectly. Make `duration` slightly shorter than the time between notes (e.g., if notes are spaced by 0.25s, use duration 0.20s).
- Velocity Humanization: Alternate velocities slightly (e.g., 0.95, 0.70, 0.85) to create an organic groove.
- Electric Guitar (ID 27): To create heavy distortion, stack 2 or 3 frequencies (Root, Fifth, Octave) into power chords at the EXACT SAME `time`, at high velocity (0.9 - 1.0). The engine's compressor will squash them into natural overdrive.
- Drums (ID 128): 40Hz/60Hz @ 1.0 vel = Kick. 80Hz @ 1.0 vel = Snare. 100Hz+ @ 0.6 vel = Hi-Hats. Drum durations should always be 0.1s.
- Strings/Pads (ID 48/88): Use long, multi-second durations with lower velocities (0.3) to swell underneath melodies.
```

### The "NPM Implementation Prompt" (Copy & Paste to AI)

If you want an AI to write the boilerplate initialization code for your web game using the standard NPM package, use this prompt:

```text
Act as an expert Web Audio game developer. I am using the `rlo-engine` NPM package.
Write the TypeScript/JavaScript initialization code to set up the `RLOGameEngine`.

Rules:
1. Import `RLOGameEngine` from `rlo-engine`.
2. Instantiate the engine with a standard Web AudioContext.
3. Do NOT pass a custom instrument map (rely on the engine's default master list).
4. Provide a simple example of playing a background music track (`.rlo` file) and triggering a sound effect.
```

### The "Custom Instrument Map Prompt" (Copy & Paste to AI)

If you want an AI to help you override the default routing with specific synths, use this prompt:

```text
Act as an expert Web Audio developer using the `rlo-engine` NPM package.
Write the code to create a custom instrument map using `createInstrumentMap` and inject it into `RLOMusicPlayer`.

I only want to use: [INSERT DESIRED SYNTHS, e.g., Pianos and Synth Basses].

Rules:
1. Import the necessary synth classes (e.g., `PianoSynth`, `BassSynth`) and `createInstrumentMap`.
2. Map them to their correct General MIDI IDs (e.g., Piano: 0-7, Bass: 32-39).
3. Pass the custom map as the second argument when initializing the player.
```

### The "JS13k Optimizer Prompt" (Copy & Paste to AI)

If you are using Paradigm B (the JS13k boilerplate) and want an AI to optimize your Vite build, use this prompt:

```text
Act as an expert JS13k optimizer. I am using the `rlo-engine` dual-build pipeline.
I need to update the `crush.ts` file to export only the following instruments: [INSERT DESIRED SYNTHS HERE].

Rules:
1. Write the exact code for `crush.ts` to import the requested synths, map them using `createDirectMap`, and export a wrapped `RLOCore` that uses this map by default.
2. Remind me to run `npm run build:crush` to strip the unused synths from the final bundle via dead-code elimination.
```

### The "Custom Synthesizer Prompt" (Copy & Paste to AI)

If you want an AI to write a completely custom DSP synthesizer for your game, use this prompt:

```text
Act as an expert Web Audio DSP engineer. I am using the `rlo-engine`.
Write a custom synthesizer class that extends `CoreSynthBase`.
I want it to sound like: [INSERT DESIRED SOUND HERE, e.g., a spooky Theremin].

Rules:
1. Implement the `_playNote(ctx: AudioContext, masterGain: GainNode, time: number, freq: number, duration: number, velocity: number)` method.
2. Use the base class utilities: `this._gain`, `this._osc`, `this._set`, `this._lin`, `this._exp`, and `this._on`.
3. Ensure oscillators are properly scheduled to start at `time` and stop at `time + duration`.
```

---

## Credits & Licensing

The Beethoven test files included in the `beeth` zip archive are sequenced by Bernd Krueger.
The MIDI, audio (MP3, OGG), and video files of Bernd Krueger are licensed under the CC-BY-SA Germany License. This means that you can use and adapt the files, as long as you attribute the copyright holder:

- **Name:** Bernd Krueger
- **Source:** http://www.piano-midi.de

The distribution or public playback of the files is only allowed under identical license conditions. The scores are open source.

## Disclaimer

This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.
