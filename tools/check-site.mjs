import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', '.wrangler']);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
}

walk(root);
const htmlFiles = files.filter(file => file.endsWith('.html'));
const missing = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    const ref = match[1].trim();
    if (!ref || /^(?:#|https?:|data:|mailto:|tel:|javascript:|\/\/)/i.test(ref) || /[`${}]/.test(ref)) continue;
    const clean = decodeURIComponent(ref.split('#')[0].split('?')[0]);
    if (!clean) continue;
    const target = path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(target)) missing.push(`${path.relative(root, file)} -> ${ref}`);
  }
}

if (missing.length) {
  console.error(`Missing local references:\n${missing.join('\n')}`);
  process.exit(1);
}
console.log(`Checked ${htmlFiles.length} HTML files: all local references resolve.`);
