# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-06-10

### 🚀 The JS13k Compression Update
This release focuses aggressively on reducing the mathematical footprint of the engine for JS13k size-coding competitions, bringing the base engine down to ~2.4KB Gzipped while introducing massive array compression techniques.

### Added
- **LZ77-Style Macro Compression**: Added `compress_macro.cjs` to the toolkit. It natively scans JSON track arrays and losslessly extracts repeating musical patterns (like drum loops and basslines) into reusable templates, reducing `.json` music file sizes by up to 60%.
- **Macro Expander Engine**: Upgraded `RLOCore` to detect and dynamically unpack `255` macro instructions in-memory seamlessly before playback. 
- **Macro Demo Tool**: Added an interactive, browser-based LZ77 array compressor directly into the `index.html` demo rig.
- **Expander Feature Flag**: Added the `__ENABLE_MACRO_EXPANDER__` feature flag to `vite.config.ts`. The macro engine costs exactly 209 bytes, but can be totally stripped via Dead-Code Elimination if developers use uncompressed arrays.

### Changed
- **Array-Based Envelopes**: Replaced verbose ADSR JSON objects across all 23 synthesizer classes with tightly packed JS array tuples, saving hundreds of bytes before compression.
- **Golfed Mapper**: Optimized the JS13k `createDirectMap` fallback in `InstrumentMap.ts` to utilize sparse dynamic arrays instead of forced `null` constructors.
- **Native Flat Extraction**: Refactored the internal macro expander to utilize ES2019 `.flat()` and raw integer sub-arrays to completely eliminate object key mapping, keeping the entire `crush` footprint under 2.44 KB.
- **AudioNode GC Optimization**: Eliminated the redundant `typeof n.disconnect === 'function'` type checks during Garbage Collection since modern browser environments inherently guarantee the method's existence.

---

## [1.1.0] - 2026-06-08

### 🚀 Major Architectural Refactor (Enterprise Standards)
This release represents a massive architectural overhaul of the `rlo-engine`

### Added
- **Formal Web Worker Metronome**: Documented and secured the C++ audio thread fallback. The Web Worker now properly avoids tab-throttling on background browsers.
- **Enterprise JSDoc Formatting**: Injected over 30+ files with rich acoustic design rationale and architectural notes (which are successfully stripped by Vite/Terser to preserve 0 bloat).
- **Standalone `RLOTranspiler` Exports**: Replaced the static class with `decodeBinary`, `encodeToBinary`, and `encodeToSoA` to guarantee mathematically perfect tree-shaking for Rollup.
- **Strict `Decay` vs `Analog` Physics Separation**: Created specialized base classes to handle finite pluck/struck instruments versus infinite sustain instruments.
- **Safety Limits**: Added an explicit `_maxDurationSeconds: 10.0` guard to `AnalogSynthBase` to prevent malformed MIDI notes from causing DSP memory leaks.

### Changed
- **AST Mathematical Optimization**: Stripped over 240 bytes of raw bloat via AST and Rollup optimizations. Removed `Osc` and `Filter` array maps in favor of gzip-friendly string literals. Upgraded `RLOCore` options parsing to ES2020 Nullish Coalescing.
- **Phantom Property Elimination**: Explicitly guarded all internal `_workerTimer` usages with the `__ENABLE_WORKER_METRONOME__` compilation flag. This perfectly forces Rollup to mathematically delete the massive native Web Worker DOM strings (e.g. `URL.revokeObjectURL()`) when the worker is toggled off in JS13K pipelines.
- **Total Deconstruction of the God Class**: The massive monolithic `RLO-Player.ts` has been securely decoupled into `RLOCore`, `RLOMusicPlayer`, `RLOGameEngine`, `SequenceBuilder`, and `AudioMath`. This prevents JS13K developers from bundling network/UI logic into their games.
- **Optimized Note Arrays**: Migrated `RloData.notes` from standard standard Arrays to native `Float32Array`, eliminating V8 boxing overhead and improving cache locality.
- **Compiler Strategy Pattern**: Refactored `compiler.ts` to use explicit `MidiProcessor`, `ZipProcessor`, and `JsonProcessor` pipelines instead of chaotic branching.
- **Variable Expansion**: Cryptic variables (e.g. `this._lin(this._c.v)`) were rewritten as highly readable enterprise code (`this._linearRampToValue(this._envelopeConfig._peakVelocity)`). Minification is now handled strictly via Terser's `/^_/` regex mapping.

### Fixed
- **The "Lag Chord" Bug**: Fixed a critical clipping issue where unfreezing the JS main thread would cause all missed notes to stack and play instantaneously. Missed notes are now dropped gracefully.
- **Infinite Stack Overflow on Empty Tracks**: Added a critical `if (len === 0) return;` guard to `RLOCore` to prevent instant freezes when playing empty tracks.
- **Audio Overlap during `seek()`**: Added a rapid 0.5s master gain ducking mechanic to seamlessly mask lookahead-buffer overlaps when seeking tracks backward or forward.
- **Regex Edge-Case**: Fixed `AudioMath.ts` note parser returning undefined when `hasNoteParser` was flagged off.
