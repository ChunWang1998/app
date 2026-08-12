/**
 * Build starter corpus pack from starter-sutras.source.mjs → mobile/assets/corpus/starter/
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STARTER_SUTRAS } from './starter-sutras.source.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../../mobile/assets/corpus/starter');
const UNITS_DIR = path.join(OUT_DIR, 'units');

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function main() {
  await mkdir(UNITS_DIR, { recursive: true });

  const files = [];
  const catalogWorks = [];

  for (const sutra of STARTER_SUTRAS) {
    const unitPayload = {
      workId: sutra.id,
      title: sutra.title,
      units: sutra.units,
    };
    const relPath = `units/${sutra.id}.json`;
    const json = JSON.stringify(unitPayload);
    const bytes = Buffer.byteLength(json, 'utf8');
    const hash = sha256(json);
    await writeFile(path.join(OUT_DIR, relPath), json, 'utf8');

    const hasZhuyin = sutra.units.some((u) => u.zhuyin?.length > 0);

    files.push({
      workId: sutra.id,
      path: relPath,
      bytes,
      sha256: hash,
    });

    catalogWorks.push({
      id: sutra.id,
      title: sutra.title,
      shortTitle: sutra.shortTitle,
      source: sutra.source,
      unitCount: sutra.units.length,
      hasZhuyin,
      pack: 'starter',
    });
  }

  const catalog = { works: catalogWorks };
  const catalogJson = JSON.stringify(catalog);
  await writeFile(path.join(OUT_DIR, 'catalog.json'), catalogJson, 'utf8');

  const manifest = {
    packId: 'starter',
    version: '2026-starter-1',
    label: '精選入門包',
    kind: 'starter',
    catalogPath: 'catalog.json',
    files,
    totalBytes: files.reduce((n, f) => n + f.bytes, 0),
  };
  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log(
    `Built starter pack: ${catalogWorks.length} works, ${manifest.totalBytes} bytes → ${OUT_DIR}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
