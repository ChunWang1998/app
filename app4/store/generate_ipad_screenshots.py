#!/usr/bin/env python3
"""Generate App Store iPad 13" screenshots (2048 × 2732), same size as app3."""

import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.join(os.path.dirname(__file__), "appstore")
IPAD_DIR = os.path.join(BASE_DIR, "ipad")
os.makedirs(IPAD_DIR, exist_ok=True)

FONT_PATH = "/System/Library/Fonts/PingFang.ttc"

# App4 brand (from screenshots-source.html)
C_BG_TOP = (243, 240, 232)
C_BG_BOT = (221, 232, 227)
C_BRAND = (47, 111, 94)
C_INK = (31, 42, 36)
C_MUTED = (95, 111, 102)
C_CARD = (255, 255, 255)
C_LINE = (217, 226, 220)
C_CHIP = (231, 241, 236)
C_WHITE = (255, 255, 255)

IPAD_W = 2048
IPAD_H = 2732


def get_font(size, index=0):
    try:
        return ImageFont.truetype(FONT_PATH, size, index=index)
    except Exception:
        return ImageFont.load_default()


F_TITLE = get_font(96, index=5)
F_SUB = get_font(44, index=4)
F_BRAND = get_font(88, index=5)
F_H = get_font(52, index=5)
F_LABEL = get_font(34, index=0)
F_VALUE = get_font(48, index=5)
F_NOTE = get_font(36, index=0)
F_BTN = get_font(46, index=5)
F_CHIP = get_font(34, index=5)
F_CAP = get_font(32, index=0)
F_STATUS = get_font(30, index=5)
F_BUBBLE = get_font(40, index=0)


def draw_gradient(draw, w, h, top, bot):
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(top[0] + (bot[0] - top[0]) * t)
        g = int(top[1] + (bot[1] - top[1]) * t)
        b = int(top[2] + (bot[2] - top[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))


def text_w(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def draw_centered(draw, text, y, font, fill):
    draw.text(((IPAD_W - text_w(draw, text, font)) / 2, y), text, font=font, fill=fill)


def draw_marketing_header(draw, title, subtitle):
    draw_centered(draw, title, 120, F_TITLE, C_INK)
    draw_centered(draw, subtitle, 250, F_SUB, C_MUTED)


def draw_device_frame(draw, x1, y1, x2, y2):
    draw.rounded_rectangle(
        [x1 - 14, y1 - 14, x2 + 14, y2 + 14],
        radius=44,
        fill=(35, 40, 38),
        outline=(70, 80, 75),
        width=4,
    )
    draw.rounded_rectangle([x1, y1, x2, y2], radius=32, fill=C_BG_TOP)


def draw_status(draw, px1, py1, px2, right_label):
    draw.text((px1 + 48, py1 + 36), "9:41", font=F_STATUS, fill=C_INK)
    tw = text_w(draw, right_label, F_STATUS)
    draw.text((px2 - 48 - tw, py1 + 36), right_label, font=F_STATUS, fill=C_INK)


def draw_btn(draw, x1, y1, x2, y2, label, primary=True):
    if primary:
        draw.rounded_rectangle([x1, y1, x2, y2], radius=28, fill=C_BRAND)
        fill = C_WHITE
    else:
        draw.rounded_rectangle([x1, y1, x2, y2], radius=28, fill=C_CARD, outline=C_LINE, width=2)
        fill = C_INK
    tw = text_w(draw, label, F_BTN)
    draw.text(((x1 + x2 - tw) / 2, y1 + (y2 - y1 - 52) / 2), label, font=F_BTN, fill=fill)


def draw_chip(draw, x, y, label, selected=False):
    pad_x, pad_y = 28, 16
    tw = text_w(draw, label, F_CHIP)
    w, h = tw + pad_x * 2, 34 + pad_y * 2
    bg = C_BRAND if selected else C_CHIP
    fg = C_WHITE if selected else C_BRAND
    draw.rounded_rectangle([x, y, x + w, y + h], radius=999, fill=bg)
    draw.text((x + pad_x, y + pad_y - 2), label, font=F_CHIP, fill=fg)
    return w + 16


def create_01_home():
    img = Image.new("RGB", (IPAD_W, IPAD_H))
    draw = ImageDraw.Draw(img)
    draw_gradient(draw, IPAD_W, IPAD_H, C_BG_TOP, C_BG_BOT)
    draw_marketing_header(draw, "業問・今日配對", "雙向身份興趣撮合・站內短聊後再交換 LINE")

    px1, py1, px2, py2 = 140, 400, 1908, 2580
    draw_device_frame(draw, px1, py1, px2, py2)
    draw_status(draw, px1, py1, px2, "業問")

    # Two-column iPad layout
    left_x1, left_x2 = px1 + 56, (px1 + px2) // 2 - 20
    right_x1, right_x2 = (px1 + px2) // 2 + 20, px2 - 56
    content_y = py1 + 100

    draw.text((left_x1, content_y), "業問", font=F_BRAND, fill=C_INK)
    draw.text((left_x1, content_y + 100), "免費・每日 1 次配對", font=F_NOTE, fill=C_MUTED)

    # Profile card (left)
    cy1 = content_y + 180
    draw.rounded_rectangle([left_x1, cy1, left_x2, cy1 + 980], radius=36, fill=C_CARD, outline=C_LINE, width=2)
    fields = [
        ("我的身份（已鎖定）", "護理師", "急診兩年，想分享輪班與證照準備"),
        ("有興趣的身份", "住院醫師、藥師", None),
        ("我的 LINE", "nurse_demo", None),
    ]
    fy = cy1 + 48
    for label, value, note in fields:
        draw.text((left_x1 + 48, fy), label, font=F_LABEL, fill=C_MUTED)
        draw.text((left_x1 + 48, fy + 48), value, font=F_VALUE, fill=C_INK)
        fy += 150
        if note:
            draw.text((left_x1 + 48, fy - 40), note, font=F_NOTE, fill=C_MUTED)
            fy += 40

    # Action card (right)
    draw.rounded_rectangle([right_x1, cy1, right_x2, cy1 + 420], radius=36, fill=C_CARD, outline=C_LINE, width=2)
    draw.text((right_x1 + 48, cy1 + 56), "今日剩餘 1 / 1", font=F_H, fill=C_INK)
    draw_btn(draw, right_x1 + 48, cy1 + 160, right_x2 - 48, cy1 + 280, "今日配對", primary=True)
    draw.text((right_x1 + 48, cy1 + 320), "點一下開始今日配對", font=F_NOTE, fill=C_MUTED)

    draw_btn(draw, right_x1, cy1 + 480, right_x2, cy1 + 600, "配對紀錄", primary=False)
    draw_btn(draw, right_x1, cy1 + 640, right_x2, cy1 + 760, "解鎖 Premium", primary=False)

    draw_centered(draw, "主頁・今日配對", IPAD_H - 90, F_CAP, C_MUTED)
    img.save(os.path.join(IPAD_DIR, "ipad-13-01-home.png"), "PNG")


def create_02_onboarding():
    img = Image.new("RGB", (IPAD_W, IPAD_H))
    draw = ImageDraw.Draw(img)
    draw_gradient(draw, IPAD_W, IPAD_H, C_BG_TOP, C_BG_BOT)
    draw_marketing_header(draw, "開通・我是誰", "選自己的身份與想認識的對象，雙向才配對")

    px1, py1, px2, py2 = 140, 400, 1908, 2580
    draw_device_frame(draw, px1, py1, px2, py2)
    draw_status(draw, px1, py1, px2, "開通")

    ix = px1 + 64
    draw.text((ix, py1 + 100), "我是誰", font=F_BRAND, fill=C_INK)
    draw.text((ix, py1 + 200), "選擇 1～5 個身份，再選有興趣的對象", font=F_NOTE, fill=C_MUTED)

    # Identity chips card
    cy1 = py1 + 280
    draw.rounded_rectangle([ix, cy1, px2 - 64, cy1 + 420], radius=36, fill=C_CARD, outline=C_LINE, width=2)
    chips = [
        ("護理師 ✓", True),
        ("藥師", False),
        ("住院醫師", False),
        ("軟體工程師", False),
        ("設計師", False),
        ("會計師", False),
        ("律師", False),
        ("教師", False),
        ("行銷企劃", False),
        ("創業者", False),
    ]
    cx, cy = ix + 48, cy1 + 56
    row_h = 90
    for label, selected in chips:
        dw = draw_chip(draw, cx, cy, label, selected=selected)
        cx += dw
        if cx > px2 - 280:
            cx = ix + 48
            cy += row_h

    # Interest card
    cy2 = cy1 + 480
    draw.rounded_rectangle([ix, cy2, px2 - 64, cy2 + 280], radius=36, fill=C_CARD, outline=C_LINE, width=2)
    draw.text((ix + 48, cy2 + 48), "有興趣的身份（1～2）", font=F_LABEL, fill=C_MUTED)
    draw_chip(draw, ix + 48, cy2 + 120, "住院醫師 ✓", selected=True)
    draw_chip(draw, ix + 320, cy2 + 120, "藥師 ✓", selected=True)

    draw_btn(draw, ix, cy2 + 360, px2 - 64, cy2 + 500, "下一步：填寫 LINE", primary=True)
    draw_centered(draw, "開通・身份雙向選擇", IPAD_H - 90, F_CAP, C_MUTED)
    img.save(os.path.join(IPAD_DIR, "ipad-13-02-onboarding.png"), "PNG")


def create_03_chat():
    img = Image.new("RGB", (IPAD_W, IPAD_H))
    draw = ImageDraw.Draw(img)
    draw_gradient(draw, IPAD_W, IPAD_H, C_BG_TOP, C_BG_BOT)
    draw_marketing_header(draw, "站內短聊閘門", "合計最多 20 句・雙方同意才顯示 LINE")

    px1, py1, px2, py2 = 140, 400, 1908, 2580
    draw_device_frame(draw, px1, py1, px2, py2)
    draw_status(draw, px1, py1, px2, "聊天")

    ix = px1 + 64
    draw.text((ix, py1 + 100), "對方・住院醫師", font=get_font(64, index=5), fill=C_INK)
    draw.text((ix, py1 + 190), "站內簡聊（合計最多 20 句）・目前 4 / 20", font=F_NOTE, fill=C_MUTED)

    bubbles = [
        ("them", "你好，我也在準備專科考試，想問輪班怎麼排？"),
        ("me", "急診常上大夜，我會先顧睡眠再讀核心科。"),
        ("them", "有推薦的考古資源嗎？"),
        ("me", "可以先從近三年重點整理，再對臨床案例。"),
    ]
    by = py1 + 280
    max_w = int((px2 - px1) * 0.55)
    for kind, text in bubbles:
        # wrap roughly
        lines = []
        cur = ""
        for ch in text:
            trial = cur + ch
            if text_w(draw, trial, F_BUBBLE) > max_w - 80:
                lines.append(cur)
                cur = ch
            else:
                cur = trial
        if cur:
            lines.append(cur)
        bh = 36 + len(lines) * 52
        bw = max(text_w(draw, ln, F_BUBBLE) for ln in lines) + 72
        if kind == "them":
            x1 = ix
            fill, outline, fg = C_CARD, C_LINE, C_INK
            draw.rounded_rectangle([x1, by, x1 + bw, by + bh], radius=28, fill=fill, outline=outline, width=2)
        else:
            x1 = px2 - 64 - bw
            fill, fg = C_BRAND, C_WHITE
            draw.rounded_rectangle([x1, by, x1 + bw, by + bh], radius=28, fill=fill)
        ty = by + 24
        for ln in lines:
            draw.text((x1 + 36, ty), ln, font=F_BUBBLE, fill=fg)
            ty += 52
        by += bh + 36

    # Footer note card
    cy = by + 40
    draw.rounded_rectangle([ix, cy, px2 - 64, cy + 200], radius=36, fill=C_CARD, outline=C_LINE, width=2)
    draw.text((ix + 48, cy + 48), "滿 20 句後", font=F_LABEL, fill=C_MUTED)
    draw.text((ix + 48, cy + 100), "雙方同意才顯示 LINE", font=F_VALUE, fill=C_INK)

    draw_centered(draw, "配對後短聊・同意後才交換 LINE", IPAD_H - 90, F_CAP, C_MUTED)
    img.save(os.path.join(IPAD_DIR, "ipad-13-03-chat.png"), "PNG")


def create_04_premium():
    img = Image.new("RGB", (IPAD_W, IPAD_H))
    draw = ImageDraw.Draw(img)
    draw_gradient(draw, IPAD_W, IPAD_H, C_BG_TOP, C_BG_BOT)
    draw_marketing_header(draw, "業問 Premium", "一次性買斷・支援恢復購買")

    px1, py1, px2, py2 = 140, 400, 1908, 2580
    draw_device_frame(draw, px1, py1, px2, py2)
    draw_status(draw, px1, py1, px2, "Premium")

    # Centered paywall on iPad
    card_w = 1100
    cx1 = (IPAD_W - card_w) // 2
    cx2 = cx1 + card_w
    content_top = py1 + 120

    draw_centered(draw, "業問 Premium", content_top, get_font(72, index=5), C_INK)
    draw_centered(draw, "一次性買斷・支援恢復購買", content_top + 100, F_NOTE, C_MUTED)

    cy1 = content_top + 200
    draw.rounded_rectangle([cx1, cy1, cx2, cy1 + 420], radius=36, fill=C_CARD, outline=C_LINE, width=2)
    benefits = [
        "• 每日最多 5 次配對",
        "• 每週可修改有興趣的身份",
        "• 一次性買斷，永久解鎖",
    ]
    fy = cy1 + 70
    for b in benefits:
        draw.text((cx1 + 64, fy), b, font=F_VALUE, fill=C_INK)
        fy += 100

    draw_btn(draw, cx1, cy1 + 500, cx2, cy1 + 640, "買斷解鎖", primary=True)
    draw_btn(draw, cx1, cy1 + 700, cx2, cy1 + 840, "恢復購買", primary=False)

    draw_centered(draw, "Premium 非消耗型買斷", IPAD_H - 90, F_CAP, C_MUTED)
    img.save(os.path.join(IPAD_DIR, "ipad-13-04-premium.png"), "PNG")


if __name__ == "__main__":
    create_01_home()
    create_02_onboarding()
    create_03_chat()
    create_04_premium()
    for name in sorted(os.listdir(IPAD_DIR)):
        if name.endswith(".png"):
            path = os.path.join(IPAD_DIR, name)
            im = Image.open(path)
            print(f"{name}: {im.size[0]} × {im.size[1]}")
    print("Done →", IPAD_DIR)
