const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.expo', 'dist', 'ios', 'android',
  'coverage', '__tests__', 'languages', 'assets',
]);
const SRC_EXT = /\.(js|jsx|ts|tsx)$/;
const KEY_EXT = /\.(p8|p12|pem)$/i;

function isCjkCodePoint(cp) {
  return (
    (cp >= 0x3000 && cp <= 0x303f)
    || (cp >= 0x3400 && cp <= 0x4dbf)
    || (cp >= 0x4e00 && cp <= 0x9fff)
    || (cp >= 0xff00 && cp <= 0xffef)
  );
}

/** Strip // and /* comments, keeping string/template contents and line numbers. */
function stripJsComments(src) {
  let out = '';
  let i = 0;
  let state = 'code';
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (state === 'code') {
      if (c === '/' && n === '/') {
        state = 'line';
        out += '  ';
        i += 2;
        continue;
      }
      if (c === '/' && n === '*') {
        state = 'block';
        out += '  ';
        i += 2;
        continue;
      }
      if (c === "'") { state = 'sq'; out += c; i += 1; continue; }
      if (c === '"') { state = 'dq'; out += c; i += 1; continue; }
      if (c === '`') { state = 'tq'; out += c; i += 1; continue; }
      out += c;
      i += 1;
      continue;
    }
    if (state === 'line') {
      if (c === '\n') {
        state = 'code';
        out += c;
      } else {
        out += ' ';
      }
      i += 1;
      continue;
    }
    if (state === 'block') {
      if (c === '*' && n === '/') {
        state = 'code';
        out += '  ';
        i += 2;
        continue;
      }
      out += c === '\n' ? '\n' : ' ';
      i += 1;
      continue;
    }
    if (state === 'sq' || state === 'dq') {
      if (c === '\\') {
        out += c + (n || '');
        i += 2;
        continue;
      }
      out += c;
      if ((state === 'sq' && c === "'") || (state === 'dq' && c === '"')) state = 'code';
      i += 1;
      continue;
    }
    if (state === 'tq') {
      if (c === '\\') {
        out += c + (n || '');
        i += 2;
        continue;
      }
      if (c === '`') state = 'code';
      out += c;
      i += 1;
    }
  }
  return out;
}

function findCjkHits(src) {
  const hits = [];
  const body = stripJsComments(src);
  body.split('\n').forEach((line, i) => {
    for (const ch of line) {
      if (isCjkCodePoint(ch.codePointAt(0))) {
        hits.push({ line: i + 1, kind: 'char', snippet: line.trim() });
        return;
      }
    }
    const re = /\\u\{?([0-9a-fA-F]{4,6})\}?/g;
    let m;
    while ((m = re.exec(line))) {
      const cp = parseInt(m[1], 16);
      if (isCjkCodePoint(cp)) {
        hits.push({ line: i + 1, kind: 'escape', snippet: line.trim() });
        break;
      }
    }
  });
  return hits;
}

function walkAppSource(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkAppSource(p, acc);
    else if (SRC_EXT.test(ent.name)) acc.push(p);
  }
  return acc;
}

function keyPaths(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    if (k === '_meta') continue;
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...keyPaths(v, next));
    else out.push(next);
  }
  return out;
}

describe('i18n: no hardcoded CJK in app source', () => {
  it('strips comments before scanning', () => {
    expect(findCjkHits('const a = 1; // 中文\n')).toEqual([]);
    expect(findCjkHits('/* 中文 */\nconst a = 1;\n')).toEqual([]);
    expect(findCjkHits('const a = "中文";\n').length).toBe(1);
  });

  it('flags full-width punctuation, Ext-A, and \\u CJK escapes', () => {
    expect(findCjkHits('const x = "＋";\n')[0].kind).toBe('char');
    expect(findCjkHits(`const x = "${String.fromCodePoint(0x3400)}";\n`)[0].kind).toBe('char');
    expect(findCjkHits('const x = "\\u4e00";\n')[0].kind).toBe('escape');
    expect(findCjkHits('const x = "\\u{3001}";\n')[0].kind).toBe('escape');
    expect(findCjkHits('const x = "\\u2009";\n')).toEqual([]);
  });

  it('fails if app source contains CJK (src, plugins, scripts, root)', () => {
    const files = walkAppSource(ROOT);
    expect(files.some((p) => p.endsWith(`${path.sep}index.js`))).toBe(true);
    expect(files.some((p) => p.includes(`${path.sep}plugins${path.sep}`))).toBe(true);
    expect(files.some((p) => p.includes(`${path.sep}scripts${path.sep}`))).toBe(true);
    const hits = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      for (const h of findCjkHits(fs.readFileSync(file, 'utf8'))) {
        hits.push(`${rel}:${h.line}:${h.kind}:${h.snippet}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('keeps en, zh-Hant, and ja keys in sync', () => {
    const en = require('../languages/en.json');
    const zh = require('../languages/zh-Hant.json');
    const ja = require('../languages/ja.json');
    expect(ja._meta?.status).toBe('machine-draft');
    const enKeys = keyPaths(en).sort();
    expect(keyPaths(zh).sort()).toEqual(enKeys);
    expect(keyPaths(ja).sort()).toEqual(enKeys);
  });

  it('does not embed ASC API key fields in eas.json', () => {
    const eas = require('../eas.json');
    const ios = eas.submit?.production?.ios || {};
    expect(ios.appleTeamId).toBeUndefined();
    expect(ios.ascApiKeyId).toBeUndefined();
    expect(ios.ascApiKeyIssuerId).toBeUndefined();
    expect(ios.ascApiKeyPath).toBeUndefined();
    expect(ios.ascAppId).toBeTruthy();
  });

  it('does not commit .p8 / .p12 / .pem files or private-key material', () => {
    const skip = new Set(['node_modules', '.git', '.expo', 'dist', 'ios', 'android', 'coverage']);
    const secrets = [];
    function scan(dir) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(ent.name)) continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          scan(p);
          continue;
        }
        if (KEY_EXT.test(ent.name)) {
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
