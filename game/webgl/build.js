const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const root = __dirname;
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}

fs.mkdirSync(dist, { recursive: true });
for (const file of walk(src)) {
  if (!file.endsWith('.js')) continue;
  const rel = path.relative(src, file);
  const out = path.join(dist, 'src', rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(file, out);
}

console.log('SR3 WebGL source copied to dist/src.');
console.log('Use the checked-in dist/index.html as the browser entry point.');
