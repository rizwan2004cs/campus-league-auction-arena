
import fs from 'fs';
import path from 'path';

const hexMap = {
  '#2d2640': '#1e293b', // Navy Blue
  '#7a6d9a': '#475569', // Dark Blue
  '#8c6a7a': '#475569', // Dark Blue   
  '#5a4d80': '#334155', // Slate Blue
  '#a094b8': '#64748b', // Muted Blue
  
  '#fd8287': '#ff8787', // Pastel Red
  '#9c3a6a': '#a78bfa', // Pastel Purple
  
  '#e0d4fc': '#bae6fd', // Pastel Blue bg
  '#b8acd4': '#93c5fd', // Soft Blue border
  
  '#ffebd2': '#ffeed9', // Pastel Orange bg
  '#fff0f5': '#fdf4ff', // Pastel Pink bg
  '#f4eefc': '#f0f9ff'  // Light Blue bg
};

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDirs = ['src/components', 'src/pages', 'src/App.tsx'];

targetDirs.forEach(target => {
  if (fs.existsSync(target)) {
    if (fs.statSync(target).isDirectory()) {
      walk(target, filePath => {
        if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
          let content = fs.readFileSync(filePath, 'utf8');
          let modified = false;
          
          for (const [oldHex, newHex] of Object.entries(hexMap)) {
            // Case-insensitive replace
            const regex = new RegExp(oldHex, 'gi');
            if (regex.test(content)) {
              content = content.replace(regex, newHex);
              modified = true;
            }
          }
          
          if (modified) {
            fs.writeFileSync(filePath, content);
            console.log('Updated: ' + filePath);
          }
        }
      });
    } else {
        let filePath = target;
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        for (const [oldHex, newHex] of Object.entries(hexMap)) {
            const regex = new RegExp(oldHex, 'gi');
            if (regex.test(content)) {
              content = content.replace(regex, newHex);
              modified = true;
            }
        }
        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log('Updated: ' + filePath);
        }
    }
  }
});
console.log('Done replacement.');

