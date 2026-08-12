/**
 * Build full CBETA corpus pack from the extracted cbeta-text zip.
 *
 * Reads from input/cbeta-text-extracted/cbeta-text/<collection>/<workId>/
 * Each work folder has a .yaml (metadata) and per-juan .txt files.
 *
 * Output: ../../corpus-dist/full/ (manifest + catalog + units/*.json)
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitSentences, toUnits } from './lib/split-sentences.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTRACTED_DIR = path.join(__dirname, 'input/cbeta-text-extracted/cbeta-text');
const OUT_DIR = path.resolve(__dirname, '../../corpus-dist/full');
const UNITS_DIR = path.join(OUT_DIR, 'units');
const VERSION = process.env.CBETA_VERSION || '2026R1';

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function parseYaml(text) {
  const result = {};
  for (const line of text.split('\n')) {
    if (line.startsWith('---') || !line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    result[key] = val;
  }
  return result;
}

function stripHeaders(text) {
  return text
    .split('\n')
    .filter((l) => !l.startsWith('#'))
    .join('\n')
    .trim();
}

async function discoverWorks() {
  const collections = await readdir(EXTRACTED_DIR);
  const works = [];

  for (const col of collections) {
    const colDir = path.join(EXTRACTED_DIR, col);
    const s = await stat(colDir);
    if (!s.isDirectory()) continue;

    const workDirs = await readdir(colDir);
    for (const wid of workDirs) {
      const wdir = path.join(colDir, wid);
      const ws = await stat(wdir);
      if (!ws.isDirectory()) continue;
      works.push({ workId: wid, dir: wdir });
    }
  }

  works.sort((a, b) => a.workId.localeCompare(b.workId));
  return works;
}

async function main() {
  const works = await discoverWorks();
  if (works.length === 0) {
    console.warn('No works found in extracted CBETA directory');
    process.exit(0);
  }

  console.log(`Found ${works.length} works. Building…`);
  await mkdir(UNITS_DIR, { recursive: true });

  const files = [];
  const catalogWorks = [];
  let processed = 0;

  for (const { workId, dir } of works) {
    let title = workId;
    try {
      const yamlPath = path.join(dir, `${workId}.yaml`);
      const yamlText = await readFile(yamlPath, 'utf8');
      const meta = parseYaml(yamlText);
      if (meta.title) title = meta.title;
    } catch {}

    const dirFiles = await readdir(dir);
    const juanFiles = dirFiles
      .filter((f) => f.endsWith('.txt'))
      .sort();

    if (juanFiles.length === 0) continue;

    let combined = '';
    for (const jf of juanFiles) {
      const raw = await readFile(path.join(dir, jf), 'utf8');
      combined += stripHeaders(raw) + '\n';
    }

    const sentences = splitSentences(combined.trim());
    const units = toUnits(sentences);
    if (units.length === 0) continue;

    const unitPayload = { workId, units };
    const relPath = `units/${workId}.json`;
    const json = JSON.stringify(unitPayload);
    const bytes = Buffer.byteLength(json, 'utf8');
    const hash = sha256(json);
    await writeFile(path.join(OUT_DIR, relPath), json, 'utf8');

    files.push({ workId, path: relPath, bytes, sha256: hash });
    catalogWorks.push({
      id: workId,
      title,
      shortTitle: title.length > 8 ? title.slice(0, 8) : title,
      source: `CBETA ${workId}`,
      unitCount: units.length,
      hasZhuyin: false,
      pack: 'full',
    });

    processed++;
    if (processed % 200 === 0) {
      console.log(`  ${processed}/${works.length}…`);
    }
  }

  const catalog = { works: catalogWorks };
  await writeFile(path.join(OUT_DIR, 'catalog.json'), JSON.stringify(catalog), 'utf8');

  const manifest = {
    packId: 'full',
    version: VERSION,
    label: `CBETA 全集成 ${VERSION}`,
    kind: 'full',
    catalogPath: 'catalog.json',
    files,
    totalBytes: files.reduce((n, f) => n + f.bytes, 0),
  };
  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`Built full pack ${VERSION}: ${catalogWorks.length} works → ${OUT_DIR}`);
  console.log(`Total size: ${(manifest.totalBytes / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
