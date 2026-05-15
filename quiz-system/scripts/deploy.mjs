import { execSync } from 'child_process';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir  = dirname(fileURLToPath(import.meta.url));
const root   = resolve(__dir, '..');
const quiz   = resolve(root, '..', 'quiz');
const assets = resolve(quiz, 'assets');

if (!existsSync(quiz))   { console.error('ไม่พบโฟลเดอร์ quiz/'); process.exit(1); }
if (!existsSync(assets)) mkdirSync(assets, { recursive: true });

console.log('🔨 Building...');
execSync('npm run build', { stdio: 'inherit', cwd: root });

console.log('📦 Copying to quiz/...');

function copyFile(src, dest) {
  writeFileSync(dest, readFileSync(src));
}

copyFile(resolve(root, 'dist', 'index.html'), resolve(quiz, 'index.html'));

const srcAssets = resolve(root, 'dist', 'assets');
for (const f of readdirSync(srcAssets)) {
  copyFile(resolve(srcAssets, f), resolve(assets, f));
}

console.log('✅ Done — quiz/ updated. Ready to git push.');
