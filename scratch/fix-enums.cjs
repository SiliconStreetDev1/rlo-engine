const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.ts')) results.push(file);
  });
  return results;
}
const files = walk('c:/projects/rlo-engine/Instruments');
files.push('c:/projects/rlo-engine/README.md');

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content
    .replace(/Osc\.Sine/g, '"sine"')
    .replace(/Osc\.Square/g, '"square"')
    .replace(/Osc\.Sawtooth/g, '"sawtooth"')
    .replace(/Osc\.Triangle/g, '"triangle"')
    .replace(/Filter\.Lowpass/g, '"lowpass"')
    .replace(/Filter\.Highpass/g, '"highpass"')
    .replace(/Filter\.Bandpass/g, '"bandpass"')
    .replace(/import\s*\{\s*CoreSynthBase,\s*Osc,\s*Filter\s*\}\s*from/g, 'import { CoreSynthBase } from')
    .replace(/import\s*\{\s*Osc,\s*Filter\s*\}\s*from/g, 'import {} from')
    .replace(/import\s*\{\s*CoreSynthBase,\s*Osc\s*\}\s*from/g, 'import { CoreSynthBase } from')
    .replace(/import\s*\{\s*CoreSynthBase,\s*applyEnvelope\s*\}\s*from/g, 'import { CoreSynthBase, applyEnvelope } from');

  fs.writeFileSync(f, content);
});
console.log('Fixed Enums');
