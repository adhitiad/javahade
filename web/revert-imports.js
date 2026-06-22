const fs = require('fs');
const path = require('path');

const domains = [
  'admin', 'auth', 'booking', 'chat', 'creator',
  'family', 'feed', 'host', 'kyc', 'landing',
  'streaming', 'wallet'
];

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = [
  ...walk('./src/app'),
  ...walk('./src/features'),
  ...walk('./src/components')
];

let replacedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  domains.forEach(domain => {
    // Revert @/features/domain/components/ back to @/components/domain/
    const regex1 = new RegExp(`@/features/${domain}/components/`, 'g');
    content = content.replace(regex1, `@/components/${domain}/`);
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    replacedCount++;
  }
});

console.log(`Updated imports back in ${replacedCount} files.`);
