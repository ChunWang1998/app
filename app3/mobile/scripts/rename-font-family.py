#!/usr/bin/env python3
"""Rewrite TTF name-table family to BeenAgesRounded so the subset is not NaikaiFont."""
import glob
import os
import sys
from fontTools.ttLib import TTFont

FAMILY = 'BeenAgesRounded'
# User-facing name IDs must not use the reserved name. ID 13 (license) stays.
NAME_IDS = (1, 3, 4, 6, 7, 16, 21)


def weight_of(path):
    name = os.path.basename(path)
    for w in ('SemiBold', 'Bold', 'Regular'):
        if w.lower() in name.lower():
            return w
    return 'Regular'


def set_name(font, name_id, text):
    table = font['name']
    table.names = [
        rec for rec in table.names
        if not (rec.nameID == name_id and rec.platformID in (1, 3))
    ]
    table.setName(text, name_id, 3, 1, 0x409)


def rewrite(path):
    font = TTFont(path)
    weight = weight_of(path)
    ps = f'{FAMILY}-{weight}'
    full = f'{FAMILY} {weight}'
    set_name(font, 1, FAMILY)
    set_name(font, 2, weight)
    set_name(font, 3, f'{FAMILY}:{weight}')
    set_name(font, 4, full)
    set_name(font, 6, ps)
    set_name(font, 7, FAMILY)
    font.save(path)
    font.close()
    print(f'renamed {os.path.basename(path)} -> {full}')


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    fonts = sorted(glob.glob(os.path.join(root, 'assets/fonts/naikai/*.ttf')))
    if not fonts:
        print('no TTF files', file=sys.stderr)
        return 1
    for p in fonts:
        rewrite(p)
    return 0


if __name__ == '__main__':
    sys.exit(main())
