const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('gold')) {
      // Replaces 'gold' mostly used in class names (e.g., text-gold-400, gold-glow, etc.)
      let newContent = content.replace(/gold/g, 'neon');
      // Fix potential capitalization issues if 'Gold' was used in text
      newContent = newContent.replace(/Gold/g, 'Neon');
      
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
