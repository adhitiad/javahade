const fs = require('fs');
const path = require('path');

const domains = [
  'admin', 'auth', 'booking', 'chat', 'creator',
  'family', 'feed', 'host', 'kyc', 'landing',
  'streaming', 'wallet'
];

function walk(dir) {
  let results = [];
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
  ...walk('./src/features')
];

let replacedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  domains.forEach(domain => {
    // Replace @/components/domain/ with @/features/domain/components/
    const regex1 = new RegExp(`@/components/${domain}/`, 'g');
    content = content.replace(regex1, `@/features/${domain}/components/`);
    
    // Replace ./something and ../something inside features (optional, but since they moved together, relative imports between them are still fine, except if they import from outside or vice versa).
    // Actually, relative imports within the same feature folder (e.g. from chat-view.tsx to ./chat-helpers) still work!
    // But if a page in src/app/(main)/chat/page.tsx imports from '@/components/chat/...', the regex1 catches it.
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    replacedCount++;
  }
});

console.log(`Updated imports in ${replacedCount} files.`);
