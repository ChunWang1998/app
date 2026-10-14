const fs = require('fs');
const path = require('path');

const CJK = /[\u4e00-\u9fff]/;
const SRC = path.join(__dirname, '../src');
const ROOT = path.join(__dirname, '..');

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx|ts|tsx)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function keyPaths(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...keyPaths(v, p));
    else out.push(p);
  }
  return out;
}

describe('i18n: no hardcoded CJK in src', () => {
  it('fails if src contains CJK characters', () => {
    const hits = [];
    for (const file of walk(SRC)) {
      const rel = path.relative(ROOT, file);
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (CJK.test(line)) hits.push(`${rel}:${i + 1}:${line.trim()}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('keeps en and zh-Hant keys in sync', () => {
    const en = require('../languages/en.json');
    const zh = require('../languages/zh-Hant.json');
    expect(keyPaths(en).sort()).toEqual(keyPaths(zh).sort());
  });

  it('does not commit ASC .p8 key material', () => {
    const skip = new Set(['node_modules', '.git', '.expo', 'dist']);
    const secrets = [];
    function scan(dir) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(ent.name)) continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          scan(p);
          continue;
        }
        if (/\.p8$/i.test(ent.name) || /AuthKey_.*\.p8$/i.test(ent.name)) {
          secrets.push(path.relative(ROOT, p));
          continue;
        }
        if (!/\.(js|json|md|txt|plist|xml|ts|tsx)$/i.test(ent.name)) continue;
        const s = fs.readFileSync(p, 'utf8');
        if (/BEGIN (RSA |EC )?PRIVATE KEY/.test(s)) secrets.push(path.relative(ROOT, p));
      }
    }
    scan(ROOT);
    expect(secrets).toEqual([]);
  });
});
