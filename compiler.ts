#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const _AdmZip = require("adm-zip");

import { RloData, PERCUSSION_INSTRUMENT_ID } from "./types.js";
import { RLOTranspiler } from "./RLO-Transpiler.js";
import { convertMidiToRlo, CompileStats } from "./midi-parser.js";

const OUTPUT_JSON = process.argv.includes("--json");
const OUTPUT_RLO = process.argv.includes("--rlo") || !OUTPUT_JSON;
const NO_TRIM = process.argv.includes("--no-trim");
const FULL_RANGE = process.argv.includes("--full-range");

/**
 * Processes a single entry within a zip file.
 */
export function processZipEntry(
  entry: any,
  zipName: string,
  zipOutDir: string,
  manifest: { id: string; name: string; url: string }[],
  stats: CompileStats,
  baseUrl: string,
): void {
  if (entry.isDirectory || !entry.entryName.match(/\.midi?$/i)) return;

  try {
    const midiBuffer = entry.getData();
    const rloData = convertMidiToRlo(midiBuffer, NO_TRIM);

    if (rloData) {
      stats.midiBytes += midiBuffer.length;
      stats.totalTracks++;
      stats.totalNotes += rloData.notes.length / 5;

      const songName = path
        .basename(entry.name, path.extname(entry.name))
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const ext = FULL_RANGE ? ".rlof" : ".rlo";
      const fileName = `${songName}${ext}`;
      const url = `${baseUrl}${zipName}/${fileName}`;

      if (OUTPUT_RLO) {
        const binBuffer = RLOTranspiler._encodeToBinary(rloData, FULL_RANGE);
        const compressed = zlib.gzipSync(Buffer.from(binBuffer));
        fs.writeFileSync(path.join(zipOutDir, fileName), compressed);
        stats.rloBytes += compressed.length;
      }
      if (OUTPUT_JSON) {
        const rawJson = JSON.stringify(rloData);
        fs.writeFileSync(path.join(zipOutDir, `${songName}.json`), rawJson);
        stats.jsonBytes += Buffer.byteLength(rawJson);
      }

      const displayName = entry.name
        .replace(/\.midi?$/i, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());
      manifest.push({
        id: songName,
        name: displayName,
        url: OUTPUT_RLO ? url : `${baseUrl}${zipName}/${songName}.json`,
      });
      console.log(
        ` -> Converted: ${songName} (${rloData.notes.length} notes) to ${ext}`,
      );
    }
  } catch (err: unknown) {
    console.warn(` -> Failed: ${entry.name}: ${(err as Error).message}`);
  }
}

/**
 * Extracts and compiles a single ZIP archive.
 */
export function processZipArchive(
  zipFile: string,
  zipsDir: string,
  outDir: string,
  manifest: { id: string; name: string; url: string }[],
  stats: CompileStats,
  baseUrl: string,
): void {
  const zipName = path
    .basename(zipFile, path.extname(zipFile))
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const zipOutDir = path.join(outDir, zipName);
  if (!fs.existsSync(zipOutDir)) fs.mkdirSync(zipOutDir, { recursive: true });

  console.log(`Processing: ${zipFile}...`);
  const zip = new (_AdmZip as any)(path.join(zipsDir, zipFile));
  zip
    .getEntries()
    .forEach((entry: any) =>
      processZipEntry(entry, zipName, zipOutDir, manifest, stats, baseUrl),
    );
}

/**
 * Processes a single loose MIDI file.
 */
export function processLooseMidiFile(
  midiFile: string,
  midiDir: string,
  outDir: string,
  manifest: { id: string; name: string; url: string }[],
  stats: CompileStats,
  baseUrl: string,
): void {
  const looseOutDir = path.join(outDir, "loose_midi");
  if (!fs.existsSync(looseOutDir))
    fs.mkdirSync(looseOutDir, { recursive: true });

  console.log(`Processing loose file: ${midiFile}...`);
  try {
    const midiBuffer = fs.readFileSync(path.join(midiDir, midiFile));
    const rloData = convertMidiToRlo(midiBuffer, NO_TRIM);

    if (rloData) {
      stats.midiBytes += midiBuffer.length;
      stats.totalTracks++;
      stats.totalNotes += rloData.notes.length / 5;

      const songName = path
        .basename(midiFile, path.extname(midiFile))
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const ext = FULL_RANGE ? ".rlof" : ".rlo";
      const fileName = `${songName}${ext}`;
      const url = `${baseUrl}loose_midi/${fileName}`;

      if (OUTPUT_RLO) {
        const binBuffer = RLOTranspiler._encodeToBinary(rloData, FULL_RANGE);
        const compressed = zlib.gzipSync(Buffer.from(binBuffer));
        fs.writeFileSync(path.join(looseOutDir, fileName), compressed);
        stats.rloBytes += compressed.length;
      }
      if (OUTPUT_JSON) {
        const rawJson = JSON.stringify(rloData);
        fs.writeFileSync(path.join(looseOutDir, `${songName}.json`), rawJson);
        stats.jsonBytes += Buffer.byteLength(rawJson);
      }

      const displayName = midiFile
        .replace(/\.midi?$/i, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());
      manifest.push({
        id: songName,
        name: displayName,
        url: OUTPUT_RLO ? url : `${baseUrl}loose_midi/${songName}.json`,
      });
      console.log(
        ` -> Converted: ${songName} (${rloData.notes.length} notes) to ${ext}`,
      );
    }
  } catch (err: unknown) {
    console.warn(` -> Failed: ${midiFile}: ${(err as Error).message}`);
  }
}

/**
 * Processes a single loose JSON file containing RloData and converts it to binary.
 */
export function processLooseJsonFile(
  jsonFile: string,
  jsonDir: string,
  outDir: string,
  manifest: { id: string; name: string; url: string }[],
  stats: CompileStats,
  baseUrl: string,
): void {
  const looseOutDir = path.join(outDir, "loose_json");
  if (!fs.existsSync(looseOutDir))
    fs.mkdirSync(looseOutDir, { recursive: true });

  console.log(`Processing loose JSON: ${jsonFile}...`);
  try {
    const jsonString = fs.readFileSync(path.join(jsonDir, jsonFile), "utf-8");
    const rloData = JSON.parse(jsonString) as RloData;

    if (rloData && Array.isArray(rloData.notes)) {
      stats.totalTracks++;
      stats.totalNotes += rloData.notes.length / 5;
      stats.jsonBytes += Buffer.byteLength(jsonString);

      const songName = path
        .basename(jsonFile, path.extname(jsonFile))
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const ext = FULL_RANGE ? ".rlof" : ".rlo";
      const fileName = `${songName}${ext}`;
      const url = `${baseUrl}loose_json/${fileName}`;

      if (OUTPUT_RLO) {
        const binBuffer = RLOTranspiler._encodeToBinary(rloData, FULL_RANGE);
        const compressed = zlib.gzipSync(Buffer.from(binBuffer));
        fs.writeFileSync(path.join(looseOutDir, fileName), compressed);
        stats.rloBytes += compressed.length;
      }

      const displayName = jsonFile
        .replace(/\.json$/i, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());
      manifest.push({
        id: songName,
        name: displayName,
        url: OUTPUT_RLO ? url : `${baseUrl}loose_json/${songName}.json`,
      });
      console.log(
        ` -> Converted JSON: ${songName} (${rloData.notes.length} notes) to ${ext}`,
      );
    } else {
      console.warn(` -> Failed: ${jsonFile}: Invalid RLO JSON format`);
    }
  } catch (err: unknown) {
    console.warn(` -> Failed: ${jsonFile}: ${(err as Error).message}`);
  }
}

/**
 * Main execution function for the compiler.
 * Scans the zips directory, processes all MIDI files, and outputs .rlo tracks.
 */
export function runCompiler(): void {
  // For CLI usage, we must operate relative to where the user runs the command
  const userCwd = process.cwd();

  // Parse CLI arguments to allow developers to specify their own custom directories
  const getArg = (flag: string, defaultPath: string) => {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 && process.argv[idx + 1]
      ? path.resolve(userCwd, process.argv[idx + 1])
      : path.resolve(userCwd, defaultPath);
  };
  const getArgStr = (flag: string, defaultStr: string) => {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 && process.argv[idx + 1]
      ? process.argv[idx + 1]
      : defaultStr;
  };

  const zipsDir = getArg("--in-zips", "tracks/zips");
  const midiDir = getArg("--in-midi", "tracks/midi");
  const outDir = getArg("--out", "dist/tracks");
  const manifestPath = path.resolve(outDir, "manifest.json");
  let baseUrl = getArgStr("--base-url", "/dist/tracks/");
  if (!baseUrl.endsWith("/")) baseUrl += "/";

  const jsonDirStr = getArgStr("--in-json", "");
  const jsonDir = jsonDirStr ? path.resolve(userCwd, jsonDirStr) : null;

  if (!fs.existsSync(zipsDir)) fs.mkdirSync(zipsDir, { recursive: true });
  if (!fs.existsSync(midiDir)) fs.mkdirSync(midiDir, { recursive: true });
  if (fs.existsSync(outDir))
    fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const zipFiles = fs
    .readdirSync(zipsDir)
    .filter((f) => f.toLowerCase().endsWith(".zip"));
  const midiFiles = fs.readdirSync(midiDir).filter((f) => f.match(/\.midi?$/i));

  let jsonFiles: string[] = [];
  if (jsonDir && fs.existsSync(jsonDir)) {
    jsonFiles = fs
      .readdirSync(jsonDir)
      .filter((f) => f.toLowerCase().endsWith(".json"));
  }

  if (
    zipFiles.length === 0 &&
    midiFiles.length === 0 &&
    jsonFiles.length === 0
  ) {
    console.log(
      "No .zip, .mid, or .json files found. Place some in the respective input folders and run again.",
    );
    process.exit(0);
  }

  const manifest: { id: string; name: string; url: string }[] = [];
  const stats: CompileStats = {
    totalTracks: 0,
    totalNotes: 0,
    midiBytes: 0,
    rloBytes: 0,
    jsonBytes: 0,
  };

  zipFiles.forEach((zipFile) => {
    processZipArchive(zipFile, zipsDir, outDir, manifest, stats, baseUrl);
  });

  midiFiles.forEach((midiFile) => {
    processLooseMidiFile(midiFile, midiDir, outDir, manifest, stats, baseUrl);
  });

  jsonFiles.forEach((jsonFile) => {
    processLooseJsonFile(jsonFile, jsonDir!, outDir, manifest, stats, baseUrl);
  });

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const formatBytes = (bytes: number) => (bytes / 1024).toFixed(2) + " KB";
  console.log(`\n=== Compilation Summary ===`);
  console.log(`Tracks Compiled: ${stats.totalTracks}`);
  console.log(`Total Notes:     ${stats.totalNotes}`);
  console.log(`Original MIDI:   ${formatBytes(stats.midiBytes)}`);

  if (OUTPUT_JSON) {
    console.log(`Output JSON:     ${formatBytes(stats.jsonBytes)}`);
  }

  if (OUTPUT_RLO) {
    const ext = FULL_RANGE ? ".rlof" : ".rlo";
    console.log(`Output ${ext}:      ${formatBytes(stats.rloBytes)} (Gzipped)`);
    if (stats.midiBytes > 0) {
      const reductionMidi = (
        (1 - stats.rloBytes / Math.max(1, stats.midiBytes)) *
        100
      ).toFixed(1);
      console.log(`Size vs MIDI:    ${reductionMidi}% smaller`);
    }

    if (OUTPUT_JSON && stats.jsonBytes > 0) {
      const reductionJson = (
        (1 - stats.rloBytes / Math.max(1, stats.jsonBytes)) *
        100
      ).toFixed(1);
      console.log(`Size vs JSON:    ${reductionJson}% smaller`);
    }
  }
  console.log(`===========================\n`);
}

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].includes("compiler")) {
  runCompiler();
}
