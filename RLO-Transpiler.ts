import { RloData } from "./types.js";

declare const __ENABLE_TRANSPILER__: boolean;
const hasTranspiler =
  typeof __ENABLE_TRANSPILER__ !== "undefined" ? __ENABLE_TRANSPILER__ : true;

/**
 * Universal translator for handling RLO data formats.
 * Converts between Human AoS (Array of Structures), Intermediate SoA (Structure of Arrays),
 * and highly compressed binary buffers.
 * 
 * @reason Why Structure of Arrays (SoA) and Delta-Time?
 * By decoupling a note into flat typed arrays (time, duration, frequency, velocity, instrument)
 * we allow gzip/deflate algorithms to identify massive byte repetition. For example, if a 
 * hi-hat plays on the exact same instrument ID and velocity for 50 notes, SoA groups those 50
 * identical bytes contiguously in memory, allowing gzip to compress them down to literally 1 or 2 bytes.
 * Converting absolute time to delta-time serves the same purpose: instead of constantly increasing 
 * time signatures, rhythmic music will yield contiguous identical delta-time bytes which gzip dominates.
 */
/** 
 * Converts standard interleaved JSON into Delta-Timed Structure of Arrays.
 * @param humanJson The flat-packed JSON array.
 * @param fullRangeFreq If true, writes raw 32-bit floats. If false, aggressively quantizes to 8-bit MIDI scale.
 */
export function encodeToSoA(humanJson: RloData, fullRangeFreq: boolean = false) {
  if (!hasTranspiler) return null as unknown as typeof soa;
    const N = humanJson.notes.length / 5;
    const f = fullRangeFreq ? new Float32Array(N) : new Uint8Array(N);
    const t = new Uint16Array(N);
    const d = new Uint16Array(N);
    const v = new Uint8Array(N);
    const i = new Uint8Array(N);

    let lastRoundedTime = 0;
    for (let n = 0, ptr = 0; n < N; n++, ptr += 5) {
      const time = humanJson.notes[ptr + 1];
      const freq = humanJson.notes[ptr];
      if (fullRangeFreq) {
        f[n] = freq;
      } else {
        // Map the frequency in Hz back down to a 1-byte 0-255 index
        f[n] =
          freq > 0
            ? Math.max(
                0,
                Math.min(255, Math.round(12 * Math.log2(freq / 440) + 69)),
              )
            : 0;
      }

      const roundedTime = Math.max(0, Math.round(time * 1000));
      t[n] = Math.min(65535, roundedTime - lastRoundedTime); // Clamp to Uint16 max to prevent wraparound
      d[n] = Math.min(
        65535,
        Math.max(0, Math.round(humanJson.notes[ptr + 2] * 1000)),
      );
      v[n] = Math.max(
        0,
        Math.min(255, Math.round(humanJson.notes[ptr + 3] * 255)),
      );
      i[n] = humanJson.notes[ptr + 4];
      lastRoundedTime += t[n]; // Add the clamped delta to accurately track absolute encoded time
    }

    const soa = {
      durationSecs: humanJson.durationSecs,
      f,
      t,
      d,
      v,
      i,
    };
    return soa;
  }

/** 
 * Tightly packs the Delta-Timed SoA into a memory-aligned ArrayBuffer.
 * 
 * @reason We explicitly manage endianness via DataView for the 16-bit and 32-bit arrays
 * to ensure that a `.rlo` file compiled on an x86 machine (Little Endian) plays flawlessly
 * on an ARM or obscure Big-Endian web client. 
 */
export function encodeToBinary(
  humanJson: RloData,
  fullRangeFreq: boolean = false,
): ArrayBuffer {
  if (!hasTranspiler) return new ArrayBuffer(0);
  const isLittleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
  const soa = encodeToSoA(humanJson, fullRangeFreq);
    const N = soa.f.length;

    // Arrays: Time(2*N) + Dur(2*N) + Freq(1*N or 4*N) + Vel(1*N) + Inst(1*N)
    const bytesPerNote = fullRangeFreq ? 10 : 7;
    const buffer = new ArrayBuffer(12 + bytesPerNote * N);
    const view = new DataView(buffer);

    view.setUint8(0, 82);
    view.setUint8(1, 76);
    view.setUint8(2, 79);
    view.setUint8(3, fullRangeFreq ? 70 : 50); // 'RLOF' for Float32, 'RLO2' for Uint8
    view.setFloat32(4, soa.durationSecs, true);
    view.setUint32(8, N, true);

    if (isLittleEndian) {
      new Uint16Array(buffer, 12, N).set(soa.t);
      new Uint16Array(buffer, 12 + 2 * N, N).set(soa.d);
      if (fullRangeFreq) {
        new Float32Array(buffer, 12 + 4 * N, N).set(soa.f as Float32Array);
      }
    } else {
      // Explicitly write multi-byte values as Little-Endian using DataView
      // to ensure cross-platform compatibility (avoiding native endianness issues of TypedArrays)
      for (let n = 0; n < N; n++) {
        view.setUint16(12 + n * 2, soa.t[n], true);
        view.setUint16(12 + 2 * N + n * 2, soa.d[n], true);
        if (fullRangeFreq) {
          view.setFloat32(12 + 4 * N + n * 4, (soa.f as Float32Array)[n], true);
        }
      }
    }

    if (fullRangeFreq) {
      new Uint8Array(buffer, 12 + 8 * N, N).set(soa.v);
      new Uint8Array(buffer, 12 + 9 * N, N).set(soa.i);
    } else {
      new Uint8Array(buffer, 12 + 4 * N, N).set(soa.f as Uint8Array);
      new Uint8Array(buffer, 12 + 5 * N, N).set(soa.v);
      new Uint8Array(buffer, 12 + 6 * N, N).set(soa.i);
    }

    return buffer;
  }

/** 
 * Reconstructs a high-speed runtime object directly from the binary buffer.
 * 
 * @reason During decode, we pre-allocate the exact flat array size `new Array(N * 5)`.
 * This guarantees that the V8 engine allocates contiguous memory without dynamic resizing overhead.
 * It reconstructs absolute time by accumulating the delta-time ticks to prevent floating-point drift.
 */
export function decodeBinary(buffer: ArrayBuffer): RloData {
  if (!hasTranspiler) return { durationSecs: 0, notes: new Float32Array(0) };
    const view = new DataView(buffer);
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3),
    );
    if (magic !== "RLO2" && magic !== "RLOF")
      throw new Error("Invalid RLO Binary format. Please recompile tracks.");
    const isFullRange = magic === "RLOF";

    const durationSecs = view.getFloat32(4, true);
    const N = view.getUint32(8, true);

    // Single-byte arrays are endian-agnostic
    const f8 = isFullRange ? null : new Uint8Array(buffer, 12 + 4 * N, N);
    const v = new Uint8Array(buffer, 12 + (isFullRange ? 8 : 5) * N, N);
    const i = new Uint8Array(buffer, 12 + (isFullRange ? 9 : 6) * N, N);

    const notes = new Float32Array(N * 5);
    let currentTime = 0;

    for (let n = 0, ptr = 0; n < N; n++, ptr += 5) {
      // Read multi-byte values explicitly as Little-Endian
      const tn = view.getUint16(12 + n * 2, true);
      const dn = view.getUint16(12 + 2 * N + n * 2, true);
      const fn = isFullRange
        ? view.getFloat32(12 + 4 * N + n * 4, true)
        : f8![n];

      currentTime += tn / 1000;
      notes[ptr] = isFullRange
        ? fn
        : fn > 0
          ? 440 * Math.pow(2, (fn - 69) / 12)
          : 0;
      notes[ptr + 1] = currentTime;
      notes[ptr + 2] = dn / 1000;
      notes[ptr + 3] = v[n] / 255;
      notes[ptr + 4] = i[n];
    }

  return { durationSecs, notes };
}
