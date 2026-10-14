#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function collectStrings() {
  const root = path.join(__dirname, '..');
  const langs = [
    'languages/en.json',
    'languages/zh-Hant.json',
    'languages/ja.json',
    'languages/ios/en.json',
    'languages/ios/zh-Hant.json',
    'languages/ios/ja.json',
    'src/lib/categoryKeywords.json',
    'src/lib/iconKeywords.json',
    'src/lib/reminderKeywords.json',
  ];
  const texts = [];
  for (const rel of langs) {
    const p = path.join(root, rel);
    const obj = readJson(p);
    function walk(o, key) {
      if (key === '_meta') return;
      if (typeof o === 'string') texts.push(o);
      else if (o && typeof o === 'object') {
        for (const [k, v] of Object.entries(o)) walk(v, k);
      }
    }
    walk(obj);
  }
  // Also scan source for hardcoded CJK strings
  const srcDir = path.join(root, 'src');
  function scanDir(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) scanDir(p);
      else if (/\.(js|jsx|ts|tsx)$/.test(ent.name)) {
        const s = fs.readFileSync(p, 'utf8');
        const re = /(['"`])([\s\S]*?)\1/gm;
        let m;
        while ((m = re.exec(s))) {
          if (hasCjkGlyph(m[2])) texts.push(m[2]);
        }
      }
    }
  }
  scanDir(srcDir);
  return texts;
}

function hasCjkGlyph(s) {
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x4e00 && cp <= 0x9fff) return true;
  }
  return false;
}

function loadCharSet() {
  const p = path.join(__dirname, '..', 'assets', 'fonts', 'subset-chars.txt');
  const txt = fs.readFileSync(p, 'utf8');
  const set = new Set(Array.from(txt));
  return set;
}

function findMissingGlyphs() {
  const set = loadCharSet();
  const strings = collectStrings();
  const missing = [];
  for (const s of strings) {
    for (const ch of Array.from(s)) {
      if (/\s/.test(ch)) continue;
      if (!set.has(ch)) {
        missing.push({ char: ch, code: ch.codePointAt(0).toString(16), sample: s.slice(0, 40) });
      }
    }
  }
  return missing;
}

if (require.main === module) {
  const missing = findMissingGlyphs();
  if (missing.length) {
    console.error('Missing glyphs in subset:', missing.slice(0, 20));
    process.exit(1);
  } else {
    console.log('Font subset covers all static UI strings');
  }
} else {
  module.exports = { findMissingGlyphs };
}
