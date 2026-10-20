#!/usr/bin/env python3
"""Fail if any non-ASCII char in UI copy or keyword tables is missing from a subset weight's cmap."""
import glob, json, os, sys
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = [
    ('en', os.path.join(ROOT, 'languages', 'en.json')),
    ('zh-Hant', os.path.join(ROOT, 'languages', 'zh-Hant.json')),
    ('ja', os.path.join(ROOT, 'languages', 'ja.json')),
    ('de', os.path.join(ROOT, 'languages', 'de.json')),
    ('fr', os.path.join(ROOT, 'languages', 'fr.json')),
    ('ios-de', os.path.join(ROOT, 'languages', 'ios', 'de.json')),
    ('ios-fr', os.path.join(ROOT, 'languages', 'ios', 'fr.json')),
    ('categoryKeywords', os.path.join(ROOT, 'src', 'lib', 'categoryKeywords.json')),
    ('iconKeywords', os.path.join(ROOT, 'src', 'lib', 'iconKeywords.json')),
    ('reminderKeywords', os.path.join(ROOT, 'src', 'lib', 'reminderKeywords.json')),
]

def strings(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == '_meta':
                continue
            yield from strings(v)
    elif isinstance(o, list):
        for v in o:
            yield from strings(v)
    elif isinstance(o, str):
        yield o

bad = 0
RESERVED = 'naikaifont'
for font in sorted(glob.glob(os.path.join(ROOT, 'assets/fonts/naikai/*.ttf'))):
    tt = TTFont(font)
    cmap = set(tt.getBestCmap())
    for label, path in SOURCES:
        with open(path, encoding='utf-8') as f:
            text = ''.join(strings(json.load(f)))
        miss = sorted({c for c in text if ord(c) > 127 and ord(c) not in cmap})
        print(f'{os.path.basename(font)} {label}: {"OK" if not miss else "missing " + "".join(miss)}')
        bad += len(miss)
    for rec in tt['name'].names:
        if rec.nameID not in (1, 2, 3, 4, 6, 7, 16, 21):
            continue
        try:
            s = rec.toUnicode()
        except Exception:
            continue
        if RESERVED in s.lower():
            print(f'{os.path.basename(font)} name ID {rec.nameID} still uses reserved name: {s}')
            bad += 1
sys.exit(1 if bad else 0)
