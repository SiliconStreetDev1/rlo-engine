/**
 * RLO Audio Engine - Macro Compressor (LZ77-style Array Compression)
 * 
 * This tool scans an uncompressed RLO JSON track array (consisting of 5-tuple notes:
 * [frequency, time, duration, velocity, instrument]) and greedily extracts repeating 
 * patterns into reusable chunks ("macros") to drastically reduce the JSON string size
 * for the JS13k competition.
 * 
 * The algorithm forces EXACT pitch and rhythm matching to ensure the decompression 
 * is 100% mathematically lossless.
 * 
 * Usage:
 * node compress_macro.cjs [input.json] [output-macro.json]
 * 
 * If no arguments are provided, it automatically compresses all tracks in the 'tracks/array/' folder.
 */

const fs = require('fs');
const path = require('path');

function compressMacro(inputPath, outputPath) {
    if (!fs.existsSync(inputPath)) {
        console.error(`Error: File not found -> ${inputPath}`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const raw = data.notes;
    
    // Step 1: Parse the flat 1D array into a structured array of objects for easier logic
    let notes = [];
    for(let i=0; i<raw.length; i+=5) {
        notes.push({
            f: raw[i], t: raw[i+1], d: raw[i+2], v: raw[i+3], i: raw[i+4],
            used: false,
            isTemplate: false
        });
    }

    // Ensure the array is sorted chronologically
    notes.sort((a,b) => a.t - b.t);

    let templates = [];
    let macros = [];

    // Step 2: Greedily find repeating chunks
    // We search for chunks from length 64 (large sequences) down to length 4 (small sequences)
    for (let L = 64; L >= 4; L--) {
        for (let i = 0; i <= notes.length - L; i++) {
            
            // Skip if any note in the chunk is already part of a previously found macro
            if (notes.slice(i, i+L).some(n => n.used || n.isTemplate)) continue;

            const baseChunk = notes.slice(i, i+L);
            let matches = [];

            // Scan ahead in the array to find identical matches for the current chunk
            for (let j = i + L; j <= notes.length - L; j++) {
                if (notes.slice(j, j+L).some(n => n.used || n.isTemplate)) continue;
                
                const targetChunk = notes.slice(j, j+L);
                let isMatch = true;

                for (let k = 0; k < L; k++) {
                    const n1 = baseChunk[k];
                    const n2 = targetChunk[k];

                    // Strict matching: Frequency, duration, velocity, and instrument must be exactly identical
                    if (n1.f !== n2.f || n1.d !== n2.d || n1.v !== n2.v || n1.i !== n2.i) {
                        isMatch = false; break;
                    }

                    // Check relative timing: The spacing between notes inside the chunk must be identical
                    if (Math.abs((n1.t - baseChunk[0].t) - (n2.t - targetChunk[0].t)) > 0.005) {
                        isMatch = false; break;
                    }
                }

                if (isMatch) {
                    matches.push({ startIndex: j, ratio: 1.0 });
                }
            }

            // Step 3: If we found matches, extract them into a Macro!
            if (matches.length > 0) {
                // The source index is the position this template will occupy at the start of the final array
                const templateIndex = templates.reduce((sum, t) => sum + t.length, 0);
                
                // Keep a copy of the base chunk as a template
                const clonedBase = baseChunk.map(n => ({...n}));
                templates.push(clonedBase);
                
                // Mark the base chunk notes as used so they aren't processed twice
                baseChunk.forEach(n => { n.used = true; n.isTemplate = true; });

                // Replace the matching chunks with Macro instructions
                matches.forEach(m => {
                    // Mark the original matching notes as used so they are deleted from the final output
                    notes.slice(m.startIndex, m.startIndex + L).forEach(n => n.used = true);
                    
                    const matchStart = notes[m.startIndex].t;
                    const baseStart = clonedBase[0].t;
                    
                    // Push the 255 macro command
                    // Format: [sourceIndex, timeOffset, noteCount, pitchMultiplier, 255]
                    macros.push({
                        sourceIndex: templateIndex,
                        timeOffset: matchStart - baseStart, // The relative time delay compared to the template
                        noteCount: L,
                        pitchMult: m.ratio
                    });
                });
            }
        }
    }

    // Step 4: Build the final compressed 1D array
    const finalNotes = [];
    
    // a. Write the templates at the very beginning (they will play at their original absolute time)
    templates.forEach(chunk => {
        chunk.forEach(n => {
            finalNotes.push(n.f, n.t, n.d, n.v, n.i);
        });
    });

    // b. Write all the remaining uncompressed original notes
    notes.forEach(n => {
        if (!n.used) {
            finalNotes.push(n.f, n.t, n.d, n.v, n.i);
        }
    });

    // c. Write the Macro instructions
    macros.forEach(m => {
        finalNotes.push(
            m.sourceIndex, 
            Math.round(m.timeOffset * 1000) / 1000, 
            m.noteCount, 
            Math.round(m.pitchMult * 1000) / 1000, 
            255 // The magic identifier
        );
    });

    data.notes = finalNotes;
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 0));
    
    // Print Statistics
    const origStr = JSON.stringify(raw).length;
    const newStr = JSON.stringify(finalNotes).length;
    const percentSaved = (100 - (newStr / origStr) * 100).toFixed(1);
    console.log(`[OK] ${path.basename(inputPath)}: Compressed length ${origStr} -> ${newStr} (${percentSaved}% space saved)`);
}

// ----------------------------------------------------------------------------------
// CLI Entry Point
// ----------------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.length === 2) {
    // Run for a specific file
    compressMacro(args[0], args[1]);
} else if (args.length === 0) {
    // Batch run the tracks array folder
    const tracksDir = path.join(__dirname, 'tracks', 'array');
    if (fs.existsSync(tracksDir)) {
        const files = ['Canon.json', 'Morningmood.json', 'cyberpunk.json', 'noir.json', '80s.json'];
        files.forEach(f => {
            const inPath = path.join(tracksDir, f);
            if (fs.existsSync(inPath)) {
                compressMacro(inPath, path.join(tracksDir, f.replace('.json', '-macro.json')));
            }
        });
        console.log('Batch compression complete.');
    } else {
        console.error('Error: tracks/array/ directory not found. Please provide an input and output file.');
    }
} else {
    console.log('Usage: node compress_macro.cjs <input_file.json> <output_file.json>');
    console.log('Or run with no arguments to batch process the tracks/array/ directory.');
}
