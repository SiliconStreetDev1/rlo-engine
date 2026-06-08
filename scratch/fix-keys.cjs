const fs = require('fs');
const path = require('path');

const dirs = [
  'c:/projects/rlo-engine/Instruments/Analog',
  'c:/projects/rlo-engine/Instruments/Decay',
  'c:/projects/rlo-engine/Instruments/Speciality'
];

dirs.forEach(dir => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));
  files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace object keys in configs
    let newContent = content
      .replace(/peakVelocity:/g, '_peakVelocity:')
      .replace(/attackTimeSeconds:/g, '_attackTimeSeconds:')
      .replace(/releaseTimeSeconds:/g, '_releaseTimeSeconds:')
      .replace(/maxDurationSeconds:/g, '_maxDurationSeconds:')
      .replace(/decayTimeSeconds:/g, '_decayTimeSeconds:');

    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log('Fixed keys in ' + file);
    }
  });
});
console.log('Done fixing TS config errors');
