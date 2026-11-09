// Writes precache.js (the service worker's file list + content hash) so the
// cache list can never drift from the files actually shipped.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENTRIES = ['index.html', 'manifest.json', 'src', 'icons', 'assets'];
const IGNORED = new Set(['.DS_Store']);

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => null);
  if (!entries) return [path];
  const nested = await Promise.all(
    entries.filter((e) => !IGNORED.has(e.name)).map((e) => collect(join(path, e.name))),
  );
  return nested.flat();
}

const absolute = (await Promise.all(ENTRIES.map((e) => collect(join(ROOT, e))))).flat();
const files = absolute.map((f) => relative(ROOT, f).split(sep).join('/')).sort();

const hash = createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update(await readFile(join(ROOT, file)));
}
const version = hash.digest('hex').slice(0, 12);

const precache = { version, files: ['./', ...files] };
await writeFile(join(ROOT, 'precache.js'), `self.PRECACHE = ${JSON.stringify(precache, null, 2)};\n`);
console.log(`precache.js: ${files.length} files, version ${version}`);
