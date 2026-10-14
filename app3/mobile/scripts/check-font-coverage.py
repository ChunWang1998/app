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
for font in sorted(glob.glob(os.path.join(ROOT, 'assets/fonts/naikai/*.ttf'))):
    cmap = set(TTFont(font).getBestCmap())
    for lang in ('en', 'zh-Hant', 'ja'):
        with open(os.path.join(ROOT, 'languages', f'{lang}.json'), encoding='utf-8') as f:
            text = ''.join(strings(json.load(f)))
        miss = sorted({c for c in text if ord(c) > 127 and ord(c) not in cmap})
        print(f'{os.path.basename(font)} {lang}: {"OK" if not miss else "missing " + "".join(miss)}')
        bad += len(miss)
sys.exit(1 if bad else 0)
