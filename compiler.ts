#!/usr/bin/env node
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const _AdmZip = require("adm-zip");

import { RloData } from "./types.js";
import { encodeToBinary } from "./RLO-Transpiler.js";
import { convertMidiToRlo, CompileStats } from "./midi-parser.js";

/** Configuration options for the compilation pipeline. */
export interface CompilerOptions {
  outputJson: boolean;
  outputRlo: boolean;
  noTrim: boolean;
  fullRange: boolean;
  zipsDir: string;
  midiDir: string;
  jsonDir: string | null;
  outDir: string;
  baseUrl: string;
}

/** Represents a processed file in the generated manifest. */
export interface ManifestEntry {
  id: string;
  name: string;
  url: string;
}

/** Strategy interface for processing different input sources. */
export interface IFileProcessor {
  /** Processes the target source and updates the manifest and statistics. */
  process(options: CompilerOptions, manifest: ManifestEntry[], stats: CompileStats): void;
}

/** Abstract base processor containing shared compilation and output logic. */
abstract class BaseProcessor implements IFileProcessor {
  public abstract process(options: CompilerOptions, manifest: ManifestEntry[], stats: CompileStats): void;

  protected _outputCompiledData(
    songName: string,
    displayName: string,
    rloData: RloData,
    targetDir: string,
    urlPrefix: string,
    options: CompilerOptions,
    manifest: ManifestEntry[],
    stats: CompileStats,
  ): void {
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    stats.totalTracks++;
    stats.totalNotes += rloData.notes.length / 5;

    const ext = options.fullRange ? ".rlof" : ".rlo";
    const fileName = `${songName}${ext}`;
    const url = `${options.baseUrl}${urlPrefix}${fileName}`;

    if (options.outputRlo) {
      const binBuffer = encodeToBinary(rloData, options.fullRange);
      const compressed = zlib.gzipSync(Buffer.from(binBuffer));
      fs.writeFileSync(path.join(targetDir, fileName), compressed);
      stats.rloBytes += compressed.length;
    }

    if (options.outputJson) {
      const rawJson = JSON.stringify(rloData);
      fs.writeFileSync(path.join(targetDir, `${songName}.json`), rawJson);
      stats.jsonBytes += Buffer.byteLength(rawJson);
    }

    manifest.push({
      id: songName,
      name: displayName,
      url: options.outputRlo ? url : `${options.baseUrl}${urlPrefix}${songName}.json`,
    });

    console.log(` -> Converted: ${songName} (${rloData.notes.length} notes) to ${ext}`);
  }

  protected _sanitizeName(name: string): string {
    return path.basename(name, path.extname(name)).replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  protected _formatDisplayName(name: string): string {
    return name
      .replace(/\.midi?$/i, "")
      .replace(/\.json$/i, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
  }
}

/** Processes ZIP archives containing MIDI files. */
export class ZipProcessor extends BaseProcessor {
  public process(options: CompilerOptions, manifest: ManifestEntry[], stats: CompileStats): void {
    if (!fs.existsSync(options.zipsDir)) return;
    const zipFiles = fs.readdirSync(options.zipsDir).filter((f) => f.toLowerCase().endsWith(".zip"));

    zipFiles.forEach((zipFile) => {
      console.log(`Processing: ${zipFile}...`);
      const zipName = this._sanitizeName(zipFile);
      const zipOutDir = path.join(options.outDir, zipName);
      
      const zip = new (_AdmZip as any)(path.join(options.zipsDir, zipFile));
      zip.getEntries().forEach((entry: any) => {
        if (entry.isDirectory || !entry.entryName.match(/\.midi?$/i)) return;
        try {
          const midiBuffer = entry.getData();
          const rloData = convertMidiToRlo(midiBuffer, options.noTrim);
          if (rloData) {
            stats.midiBytes += midiBuffer.length;
            this._outputCompiledData(
              this._sanitizeName(entry.name),
              this._formatDisplayName(entry.name),
              rloData,
              zipOutDir,
              `${zipName}/`,
              options,
              manifest,
              stats
            );
          }
        } catch (err: unknown) {
          console.warn(` -> Failed: ${entry.name}: ${(err as Error).message}`);
        }
      });
    });
  }
}

/** Processes loose MIDI files in a directory. */
export class MidiProcessor extends BaseProcessor {
  public process(options: CompilerOptions, manifest: ManifestEntry[], stats: CompileStats): void {
    if (!fs.existsSync(options.midiDir)) return;
    const midiFiles = fs.readdirSync(options.midiDir).filter((f) => f.match(/\.midi?$/i));
    const looseOutDir = path.join(options.outDir, "loose_midi");

    midiFiles.forEach((midiFile) => {
      console.log(`Processing loose file: ${midiFile}...`);
      try {
        const midiBuffer = fs.readFileSync(path.join(options.midiDir, midiFile));
        const rloData = convertMidiToRlo(midiBuffer, options.noTrim);
        if (rloData) {
          stats.midiBytes += midiBuffer.length;
          this._outputCompiledData(
            this._sanitizeName(midiFile),
            this._formatDisplayName(midiFile),
            rloData,
            looseOutDir,
            `loose_midi/`,
            options,
            manifest,
            stats
          );
        }
      } catch (err: unknown) {
        console.warn(` -> Failed: ${midiFile}: ${(err as Error).message}`);
      }
    });
  }
}

/** Processes pre-compiled loose JSON RLO files. */
export class JsonProcessor extends BaseProcessor {
  public process(options: CompilerOptions, manifest: ManifestEntry[], stats: CompileStats): void {
    if (!options.jsonDir || !fs.existsSync(options.jsonDir)) return;
    const jsonFiles = fs.readdirSync(options.jsonDir).filter((f) => f.toLowerCase().endsWith(".json"));
    const looseOutDir = path.join(options.outDir, "loose_json");

    jsonFiles.forEach((jsonFile) => {
      console.log(`Processing loose JSON: ${jsonFile}...`);
      try {
        const jsonString = fs.readFileSync(path.join(options.jsonDir!, jsonFile), "utf-8");
        const rloData = JSON.parse(jsonString) as RloData;

        if (rloData && Array.isArray(rloData.notes)) {
          stats.jsonBytes += Buffer.byteLength(jsonString);
          this._outputCompiledData(
            this._sanitizeName(jsonFile),
            this._formatDisplayName(jsonFile),
            rloData,
            looseOutDir,
            `loose_json/`,
            options,
            manifest,
            stats
          );
        } else {
          console.warn(` -> Failed: ${jsonFile}: Invalid RLO JSON format`);
        }
      } catch (err: unknown) {
        console.warn(` -> Failed: ${jsonFile}: ${(err as Error).message}`);
      }
    });
  }
}

/**
 * Enterprise Compiler Pipeline orchestrating the file processors.
 */
export class CompilerPipeline {
  private _options: CompilerOptions;
  private _processors: IFileProcessor[];
  
  constructor(options: CompilerOptions) {
    this._options = options;
    this._processors = [new ZipProcessor(), new MidiProcessor(), new JsonProcessor()];
  }

  public execute(): void {
    if (fs.existsSync(this._options.outDir)) fs.rmSync(this._options.outDir, { recursive: true, force: true });
    fs.mkdirSync(this._options.outDir, { recursive: true });

    const manifest: ManifestEntry[] = [];
    const stats: CompileStats = {
      totalTracks: 0,
      totalNotes: 0,
      midiBytes: 0,
      rloBytes: 0,
      jsonBytes: 0,
    };

    this._processors.forEach((processor) => processor.process(this._options, manifest, stats));

    fs.writeFileSync(path.join(this._options.outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    this._printSummary(stats);
  }

  private _printSummary(stats: CompileStats): void {
    const formatBytes = (bytes: number) => (bytes / 1024).toFixed(2) + " KB";
    console.log(`\n=== Compilation Summary ===`);
    console.log(`Tracks Compiled: ${stats.totalTracks}`);
    console.log(`Total Notes:     ${stats.totalNotes}`);
    console.log(`Original MIDI:   ${formatBytes(stats.midiBytes)}`);

    if (this._options.outputJson) console.log(`Output JSON:     ${formatBytes(stats.jsonBytes)}`);

    if (this._options.outputRlo) {
      const ext = this._options.fullRange ? ".rlof" : ".rlo";
      console.log(`Output ${ext}:      ${formatBytes(stats.rloBytes)} (Gzipped)`);
      if (stats.midiBytes > 0) {
        const reductionMidi = ((1 - stats.rloBytes / Math.max(1, stats.midiBytes)) * 100).toFixed(1);
        console.log(`Size vs MIDI:    ${reductionMidi}% smaller`);
      }
      if (this._options.outputJson && stats.jsonBytes > 0) {
        const reductionJson = ((1 - stats.rloBytes / Math.max(1, stats.jsonBytes)) * 100).toFixed(1);
        console.log(`Size vs JSON:    ${reductionJson}% smaller`);
      }
    }
    console.log(`===========================\n`);
  }
}

/** Parses CLI arguments into an Options Object and executes the pipeline. */
export function runCompiler(): void {
  const userCwd = process.cwd();
  const getArg = (flag: string, defaultPath: string) => {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 && process.argv[idx + 1] ? path.resolve(userCwd, process.argv[idx + 1]) : path.resolve(userCwd, defaultPath);
  };
  const getArgStr = (flag: string, defaultStr: string) => {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : defaultStr;
  };

  const outputJson = process.argv.includes("--json");
  const options: CompilerOptions = {
    outputJson,
    outputRlo: process.argv.includes("--rlo") || !outputJson,
    noTrim: process.argv.includes("--no-trim"),
    fullRange: process.argv.includes("--full-range"),
    zipsDir: getArg("--in-zips", "tracks/zips"),
    midiDir: getArg("--in-midi", "tracks/midi"),
    jsonDir: getArgStr("--in-json", "") ? path.resolve(userCwd, getArgStr("--in-json", "")) : null,
    outDir: getArg("--out", "dist/tracks"),
    baseUrl: getArgStr("--base-url", "/dist/tracks/").endsWith("/") ? getArgStr("--base-url", "/dist/tracks/") : getArgStr("--base-url", "/dist/tracks/") + "/",
  };

  const pipeline = new CompilerPipeline(options);
  pipeline.execute();
}

if (process.argv[1] && process.argv[1].includes("compiler")) {
  runCompiler();
}
