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

files.forEach(f => {
  if (f.endsWith('CoreSynthBase.ts')) return;
  let content = fs.readFileSync(f, 'utf8');
  
  if (content.includes('this._scheduleNodeDisposal(')) {
     content = content.replace(/this\._scheduleNodeDisposal\(/g, 'if (hasStrictGC) this._scheduleNodeDisposal(');
     
     // Ensure hasStrictGC is imported
     if (!content.includes('hasStrictGC')) {
        content = content.replace(/import \{.*?CoreSynthBase.*?\}.*?;/g, match => {
           return match.replace('CoreSynthBase', 'CoreSynthBase, hasStrictGC');
        });
     }
  }

  fs.writeFileSync(f, content);
});
console.log('Fixed GC Calls');
