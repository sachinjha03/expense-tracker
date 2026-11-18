import { mkdir, readFile, writeFile, copyFile, cp } from 'node:fs/promises';

await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
const assets = {};
for (const [path, file, type] of [
  ['/', 'index.html', 'text/html'],
  ['/style.css', 'style.css', 'text/css'],
  ['/app.js', 'app.js', 'text/javascript'],
]) {
  assets[path] = { body: await readFile('docs/' + file, 'utf8'), type: type + '; charset=utf-8' };
}
const worker = await readFile('server/worker.mjs', 'utf8');
await writeFile('dist/server/index.js', worker.replace("import { assets } from './assets.mjs';", 'const assets = ' + JSON.stringify(assets) + ';'));
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/drizzle', { recursive: true });
