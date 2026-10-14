#!/usr/bin/env python3
"""Fail if any non-ASCII char in languages/*.json is missing from a Naikai subset weight's cmap."""
import glob, json, os, sys
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def strings(o):
    if isinstance(o, dict):
        for v in o.values():
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
    for lang in ('en', 'zh-Hant', 'ja'):
        with open(os.path.join(ROOT, 'languages', f'{lang}.json'), encoding='utf-8') as f:
            text = ''.join(strings(json.load(f)))
        miss = sorted({c for c in text if ord(c) > 127 and ord(c) not in cmap})
        print(f'{os.path.basename(font)} {lang}: {"OK" if not miss else "missing " + "".join(miss)}')
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
