import { defineConfig } from "vite";
import fs from "fs";
import zlib from "zlib";
import { minify } from "terser";

const customTerserOptions = {
  ecma: 2020 as const,
  module: true,
  compress: {
    drop_console: true,
    passes: 3,
    unsafe: true,
    unsafe_math: true, // Forces native JS Math methods to mangle cleanly
  },
  mangle: {
    toplevel: true,
    properties: { regex: /^_/ }, // Squashes all internal engine fields to 1 char
  },
  format: { comments: false },
  sourceMap: true,
};

/**
 * HOSTILE BYTE-SHAVING CONFIGURATION FOR JS13K
 * Replaces all library convenience features with extreme dead-code elimination.
 */
export default defineConfig({
  define: {
    // Turn OFF everything. We only want pure mathematical oscillators and a raw play function.
    __ENABLE_TRANSPILER__: false, // Strip RLO Binary Decoding
    __ENABLE_MUSIC_PLAYER__: false, // Strip Network Fetch & Reverb Nodes
    __ENABLE_GAME_ENGINE__: false, // Strip Master Compression & SFX Bus
    __ENABLE_WORKER_METRONOME__: false, // Strip Web Worker metronomes
    __ENABLE_NOTE_PARSER__: false, // Strip String parsing (e.g., "C#5")
    __ENABLE_STRICT_GC__: false, // Strip AudioNode Garbage Collection
    __ENABLE_MIDI_DEBUG__: false, // Strip the MIDI logging logic
  },
  build: {
    target: "es2020",
    minify: "terser",
    terserOptions: customTerserOptions,
    lib: {
      entry: "./crush.ts",
      name: "RLOEngine",
      formats: ["es"], // For JS13k, we only need the ultra-lean ES module
      fileName: () => "rlo-engine.min.js",
    },
  },
  plugins: [
    {
      name: "force-terser-on-es-module",
      apply: "build" as const,
      enforce: "post" as const,
      async renderChunk(code: string, chunk: any, options: any) {
        if (options.format === "es") {
          const result = await minify(code, customTerserOptions as any);
          return { code: result.code as string, map: result.map as any };
        }
        return null;
      },
    },
    {
      name: "print-crush-size",
      apply: "build" as const,
      writeBundle(options: any, bundle: any) {
        const file = Object.keys(bundle).find((name) => name.endsWith(".js"));
        if (file && bundle[file].type === "chunk") {
          const code = bundle[file].code;
          const gzipped = zlib.gzipSync(code);
          console.log(
            `\n📦 CRUSH BUILD: ${code.length} bytes (Raw) / ${gzipped.length} bytes (Gzipped)\n`,
          );
        }
      },
    },
  ],
});
