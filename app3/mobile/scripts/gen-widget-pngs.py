#!/usr/bin/env python3
"""Line-art PNG glyphs for expo-widgets (shared App Group images)."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "assets" / "widget"
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 128
STROKE = 7
COLOR = (62, 145, 128, 255)  # brand #3E9180


def canvas():
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def save(im, name):
    im.save(OUT / name, "PNG")


def brush():
    im, d = canvas()
    d.line((28, 100, 86, 42), fill=COLOR, width=STROKE)
    d.rounded_rectangle((70, 18, 104, 62), radius=8, outline=COLOR, width=STROKE)
    save(im, "icon-brush.png")


def drop():
    im, d = canvas()
    d.polygon([(64, 16), (24, 78), (36, 104), (92, 104), (104, 78)], outline=COLOR, width=STROKE)
    save(im, "icon-drop.png")


def pill():
    im, d = canvas()
    d.rounded_rectangle((22, 48, 106, 80), radius=16, outline=COLOR, width=STROKE)
    d.line((44, 44, 84, 84), fill=COLOR, width=STROKE)
    save(im, "icon-pill.png")


def leaf():
    im, d = canvas()
    d.ellipse((22, 22, 108, 108), outline=COLOR, width=STROKE)
    d.line((34, 96, 86, 40), fill=COLOR, width=STROKE)
    save(im, "icon-leaf.png")


def bed():
    im, d = canvas()
    d.line((20, 36, 20, 100), fill=COLOR, width=STROKE)
    d.line((20, 84, 110, 84), fill=COLOR, width=STROKE)
    d.line((20, 64, 110, 64), fill=COLOR, width=STROKE)
    d.line((110, 64, 110, 100), fill=COLOR, width=STROKE)
    d.arc((36, 40, 78, 64), 180, 0, fill=COLOR, width=STROKE)
    save(im, "icon-bed.png")


def scissors():
    im, d = canvas()
    d.ellipse((16, 18, 48, 50), outline=COLOR, width=STROKE)
    d.ellipse((16, 78, 48, 110), outline=COLOR, width=STROKE)
    d.line((44, 44, 108, 96), fill=COLOR, width=STROKE)
    d.line((44, 84, 108, 32), fill=COLOR, width=STROKE)
    save(im, "icon-scissors.png")


def car():
    im, d = canvas()
    d.rounded_rectangle((16, 56, 112, 92), radius=8, outline=COLOR, width=STROKE)
    d.polygon([(28, 56), (44, 34), (84, 34), (100, 56)], outline=COLOR, width=STROKE)
    d.ellipse((32, 80, 52, 100), outline=COLOR, width=STROKE)
    d.ellipse((76, 80, 96, 100), outline=COLOR, width=STROKE)
    save(im, "icon-car.png")


def eye():
    im, d = canvas()
    d.arc((12, 36, 116, 92), 200, 340, fill=COLOR, width=STROKE)
    d.arc((12, 36, 116, 92), 20, 160, fill=COLOR, width=STROKE)
    d.ellipse((50, 50, 78, 78), outline=COLOR, width=STROKE)
    save(im, "icon-eye.png")


def logo():
    # Cream tile + brand mark so the share/widget footer can use it.
    im = Image.new("RGBA", (SIZE, SIZE), (251, 247, 240, 255))
    d = ImageDraw.Draw(im)
    d.ellipse((18, 18, 110, 110), outline=COLOR, width=8)
    d.arc((44, 56, 84, 88), 20, 160, fill=COLOR, width=7)
    d.ellipse((46, 48, 58, 60), fill=COLOR)
    d.ellipse((70, 48, 82, 60), fill=COLOR)
    save(im, "logo.png")


if __name__ == "__main__":
    brush()
    drop()
    pill()
    leaf()
    bed()
    scissors()
    car()
    eye()
    logo()
    print("wrote", list(OUT.glob("*.png")))
