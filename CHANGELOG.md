# Changelog

All notable changes to this project will be documented in this file.

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
