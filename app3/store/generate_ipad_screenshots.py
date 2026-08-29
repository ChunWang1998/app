import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = "/Users/leo_1/Documents/GitHub/superpredict/app/app3/store/appstore"
IPHONE_DIR = os.path.join(BASE_DIR, "iphone")
IPAD_DIR = os.path.join(BASE_DIR, "ipad")
os.makedirs(IPHONE_DIR, exist_ok=True)
os.makedirs(IPAD_DIR, exist_ok=True)

FONT_PATH = "/System/Library/Fonts/PingFang.ttc"

def get_font(size, index=0): # 0: Regular, 1: Thin, 2: Ultralight, 3: Light, 4: Medium, 5: Semibold
    try:
        return ImageFont.truetype(FONT_PATH, size, index=index)
    except Exception:
        return ImageFont.load_default()

C_BG_TOP = (255, 246, 232)
C_BG_BOT = (245, 232, 216)
C_BRAND = (224, 122, 61)
C_BRAND_DEEP = (184, 90, 40)
C_INK = (44, 36, 22)
C_MUTED = (122, 106, 88)
C_CARD = (255, 255, 255)
C_LINE = (240, 228, 212)
C_TAG_BG = (254, 243, 230)
C_GREEN = (47, 143, 107)
C_WHITE = (255, 255, 255)

def draw_gradient_background(draw, width, height, top_color, bot_color):
    for y in range(height):
        r = int(top_color[0] + (bot_color[0] - top_color[0]) * (y / height))
        g = int(top_color[1] + (bot_color[1] - top_color[1]) * (y / height))
        b = int(top_color[2] + (bot_color[2] - top_color[2]) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b))

# ----------------- iPad (2048 x 2732) Generator -----------------
IPAD_W = 2048
IPAD_H = 2732

ipad_f_title = get_font(100, index=5)
ipad_f_sub = get_font(52, index=4)
ipad_f_card_title = get_font(58, index=5)
ipad_f_card_body = get_font(44, index=0)
ipad_f_badge = get_font(36, index=5)
ipad_f_button = get_font(48, index=5)

def draw_ipad_frame(draw, x1, y1, x2, y2):
    # Outer device bezel
    draw.rounded_rectangle([x1 - 16, y1 - 16, x2 + 16, y2 + 16], radius=48, fill=(35, 35, 40), outline=(70, 70, 75), width=4)
    # Screen background
    draw.rounded_rectangle([x1, y1, x2, y2], radius=36, fill=C_BG_TOP)

def draw_ipad_header(draw, title, subtitle):
    bbox = draw.textbbox((0, 0), title, font=ipad_f_title)
    w = bbox[2] - bbox[0]
    draw.text(((IPAD_W - w) / 2, 140), title, font=ipad_f_title, fill=C_INK)

    bbox_sub = draw.textbbox((0, 0), subtitle, font=ipad_f_sub)
    w_sub = bbox_sub[2] - bbox_sub[0]
    draw.text(((IPAD_W - w_sub) / 2, 280), subtitle, font=ipad_f_sub, fill=C_MUTED)

def create_ipad_screen_1():
    img = Image.new("RGB", (IPAD_W, IPAD_H))
    draw = ImageDraw.Draw(img)
    draw_gradient_background(draw, IPAD_W, IPAD_H, C_BG_TOP, C_BG_BOT)
    draw_ipad_header(draw, "探索全台鄰汪夥伴", "快速尋找附近毛孩・篩選時段與地區")

    px1, py1, px2, py2 = 140, 420, 1908, 2600
    draw_ipad_frame(draw, px1, py1, px2, py2)

    # In-app navigation bar
    draw.text((px1 + 60, py1 + 60), "鄰汪 Linwang", font=ipad_f_card_title, fill=C_BRAND)
    draw.rounded_rectangle([px2 - 280, py1 + 55, px2 - 60, py1 + 135], radius=40, fill=C_BRAND)
    draw.text((px2 - 235, py1 + 72), "台北市 ▾", font=ipad_f_badge, fill=C_WHITE)

    # Filter chips
    chips = ["全部時段", "週末早晨", "平日傍晚", "中大型犬", "活潑親狗"]
    cx = px1 + 60
    for i, chip in enumerate(chips):
        bg = C_BRAND if i == 0 else C_WHITE
        fg = C_WHITE if i == 0 else C_INK
        w = 230 if i < 3 else 240
        draw.rounded_rectangle([cx, py1 + 170, cx + w, py1 + 250], radius=30, fill=bg, outline=C_LINE, width=1)
        draw.text((cx + 35, py1 + 188), chip, font=ipad_f_badge, fill=fg)
        cx += w + 24

    # 2-Column Grid for iPad layout
    card_w = (px2 - px1 - 160) // 2
    # Card 1 (Left)
    c1_x1 = px1 + 60
    c1_x2 = c1_x1 + card_w
    c1_y1 = py1 + 300
    c1_y2 = c1_y1 + 1650
    draw.rounded_rectangle([c1_x1, c1_y1, c1_x2, c1_y2], radius=40, fill=C_CARD, outline=C_LINE, width=2)

    draw.rounded_rectangle([c1_x1 + 40, c1_y1 + 40, c1_x2 - 40, c1_y1 + 600], radius=30, fill=(255, 238, 220))
    draw.text((c1_x1 + 80, c1_y1 + 140), "🐕", font=get_font(200))
    draw.text((c1_x1 + 40, c1_y1 + 650), "Mochi ＆ 飼主 Leo", font=ipad_f_card_title, fill=C_INK)
    draw.text((c1_x1 + 40, c1_y1 + 730), "柴犬 · 12kg · 3歲公犬", font=ipad_f_card_body, fill=C_MUTED)

    draw.rounded_rectangle([c1_x1 + 40, c1_y1 + 800, c1_x1 + 280, c1_y1 + 870], radius=20, fill=(230, 245, 238))
    draw.text((c1_x1 + 60, c1_y1 + 818), "● 隨時可約", font=ipad_f_badge, fill=C_GREEN)

    draw.text((c1_x1 + 40, c1_y1 + 920), "散步地點：大安森林公園、華山大草皮", font=ipad_f_card_body, fill=C_INK)
    draw.text((c1_x1 + 40, c1_y1 + 1000), "個性特徵：愛玩拋接、親人親狗、精力充沛", font=ipad_f_card_body, fill=C_MUTED)

    draw.rounded_rectangle([c1_x1 + 40, c1_y1 + 1450, c1_x2 - 40, c1_y1 + 1580], radius=40, fill=C_BRAND)
    draw.text(((c1_x1 + c1_x2) / 2 - 180, c1_y1 + 1485), "發送 Connect 邀請", font=ipad_f_button, fill=C_WHITE)

    # Card 2 (Right)
    c2_x1 = c1_x2 + 40
    c2_x2 = c2_x1 + card_w
    c2_y1 = py1 + 300
    c2_y2 = c2_y1 + 1650
    draw.rounded_rectangle([c2_x1, c2_y1, c2_x2, c2_y2], radius=40, fill=C_CARD, outline=C_LINE, width=2)

    draw.rounded_rectangle([c2_x1 + 40, c2_y1 + 40, c2_x2 - 40, c2_y1 + 600], radius=30, fill=(232, 244, 252))
    draw.text((c2_x1 + 80, c2_y1 + 140), "🦮", font=get_font(200))
    draw.text((c2_x1 + 40, c2_y1 + 650), "Cookie ＆ 飼主 敏敏", font=ipad_f_card_title, fill=C_INK)
    draw.text((c2_x1 + 40, c2_y1 + 730), "黃金獵犬 · 28kg · 4歲母犬", font=ipad_f_card_body, fill=C_MUTED)

    draw.rounded_rectangle([c2_x1 + 40, c2_y1 + 800, c2_x1 + 280, c2_y1 + 870], radius=20, fill=(230, 245, 238))
    draw.text((c2_x1 + 60, c2_y1 + 818), "● 週末固定", font=ipad_f_badge, fill=C_GREEN)

    draw.text((c2_x1 + 40, c2_y1 + 920), "散步地點：美堤河濱公園、迎風狗公園", font=ipad_f_card_body, fill=C_INK)
    draw.text((c2_x1 + 40, c2_y1 + 1000), "個性特徵：溫和親切、喜歡游泳、會握手", font=ipad_f_card_body, fill=C_MUTED)

    draw.rounded_rectangle([c2_x1 + 40, c2_y1 + 1450, c2_x2 - 40, c2_y1 + 1580], radius=40, fill=C_BRAND)
    draw.text(((c2_x1 + c2_x2) / 2 - 180, c2_y1 + 1485), "發送 Connect 邀請", font=ipad_f_button, fill=C_WHITE)

    img.save(os.path.join(IPAD_DIR, "01-explore.png"), "PNG")

def create_ipad_screen_2():
    img = Image.new("RGB", (IPAD_W, IPAD_H))
    draw = ImageDraw.Draw(img)
    draw_gradient_background(draw, IPAD_W, IPAD_H, C_BG_TOP, C_BG_BOT)
    draw_ipad_header(draw, "汪汪聚會・結伴同行", "舉辦與報名全台狗狗見面會・加入 LINE 交流群")

    px1, py1, px2, py2 = 140, 420, 1908, 2600
    draw_ipad_frame(draw, px1, py1, px2, py2)

    draw.text((px1 + 60, py1 + 60), "汪汪聚會 Gatherings", font=ipad_f_card_title, fill=C_INK)
    draw.rounded_rectangle([px2 - 320, py1 + 55, px2 - 60, py1 + 135], radius=40, fill=C_BRAND)
    draw.text((px2 - 280, py1 + 72), "+ 創辦聚會", font=ipad_f_badge, fill=C_WHITE)

    # Gathering 1
    cy1 = py1 + 200
    draw.rounded_rectangle([px1 + 60, cy1, px2 - 60, cy1 + 880], radius=40, fill=C_CARD, outline=C_LINE, width=2)
    draw.rounded_rectangle([px1 + 100, cy1 + 50, px1 + 360, cy1 + 130], radius=20, fill=(255, 238, 220))
    draw.text((px1 + 130, cy1 + 68), "本週六 15:30", font=ipad_f_badge, fill=C_BRAND_DEEP)

    draw.text((px1 + 100, cy1 + 170), "大佳河濱公園・柴犬奔跑聚會", font=ipad_f_card_title, fill=C_INK)
    draw.text((px1 + 100, cy1 + 260), "📍 台北市中山區 · 大佳河濱迎風狗運動公園", font=ipad_f_card_body, fill=C_MUTED)
    draw.text((px1 + 100, cy1 + 340), "主辦人：大隊長 柴爸 · 已報名 8 隻狗狗", font=ipad_f_card_body, fill=C_INK)

    draw.rounded_rectangle([px1 + 100, cy1 + 440, px1 + 440, cy1 + 520], radius=24, fill=C_TAG_BG)
    draw.text((px1 + 130, cy1 + 460), "柴犬 & 中型犬友善", font=ipad_f_badge, fill=C_BRAND)

    draw.rounded_rectangle([px1 + 470, cy1 + 440, px1 + 800, cy1 + 520], radius=24, fill=(230, 245, 238))
    draw.text((px1 + 500, cy1 + 460), "附 LINE 交流群組", font=ipad_f_badge, fill=C_GREEN)

    draw.rounded_rectangle([px1 + 100, cy1 + 680, px2 - 100, cy1 + 810], radius=40, fill=C_BRAND)
    draw.text(((px1 + px2) / 2 - 120, cy1 + 715), "立即報名聚會", font=ipad_f_button, fill=C_WHITE)

    # Gathering 2
    cy2 = cy1 + 940
    draw.rounded_rectangle([px1 + 60, cy2, px2 - 60, cy2 + 880], radius=40, fill=C_CARD, outline=C_LINE, width=2)
    draw.rounded_rectangle([px1 + 100, cy2 + 50, px1 + 360, cy2 + 130], radius=20, fill=(232, 244, 252))
    draw.text((px1 + 130, cy2 + 68), "下週日 09:00", font=ipad_f_badge, fill=(30, 100, 180))

    draw.text((px1 + 100, cy2 + 170), "凹子底森林公園・晨間慢步同樂會", font=ipad_f_card_title, fill=C_INK)
    draw.text((px1 + 100, cy2 + 260), "📍 高雄市鼓山區 · 凹子底公園大草皮", font=ipad_f_card_body, fill=C_MUTED)
    draw.text((px1 + 100, cy2 + 340), "主辦人：毛毛媽 · 已報名 12 隻狗狗", font=ipad_f_card_body, fill=C_INK)

    draw.rounded_rectangle([px1 + 100, cy2 + 680, px2 - 100, cy2 + 810], radius=40, fill=C_BRAND)
    draw.text(((px1 + px2) / 2 - 120, cy2 + 715), "立即報名聚會", font=ipad_f_button, fill=C_WHITE)

    img.save(os.path.join(IPAD_DIR, "02-meetup.png"), "PNG")

def create_ipad_screen_3():
    img = Image.new("RGB", (IPAD_W, IPAD_H))
    draw = ImageDraw.Draw(img)
    draw_gradient_background(draw, IPAD_W, IPAD_H, C_BG_TOP, C_BG_BOT)
    draw_ipad_header(draw, "專屬毛孩檔案", "合照認證・個性習慣・多狗檔案管理")

    px1, py1, px2, py2 = 140, 420, 1908, 2600
    draw_ipad_frame(draw, px1, py1, px2, py2)

    draw.text((px1 + 60, py1 + 60), "汪汪個人檔案 Profile", font=ipad_f_card_title, fill=C_INK)

    cy1 = py1 + 160
    draw.rounded_rectangle([px1 + 60, cy1, px2 - 60, cy1 + 1850], radius=40, fill=C_CARD, outline=C_LINE, width=2)

    # Avatar box
    draw.rounded_rectangle([px1 + 100, cy1 + 60, px1 + 380, cy1 + 340], radius=40, fill=(255, 238, 220))
    draw.text((px1 + 140, cy1 + 80), "🐕", font=get_font(180))

    draw.text((px1 + 420, cy1 + 80), "Nana (波波)", font=ipad_f_card_title, fill=C_INK)
    draw.text((px1 + 420, cy1 + 170), "柯基犬 · 11kg · 2歲女生", font=ipad_f_card_body, fill=C_MUTED)
    draw.text((px1 + 420, cy1 + 250), "飼主暱稱：Alex", font=ipad_f_card_body, fill=C_BRAND_DEEP)

    draw.line([(px1 + 100, cy1 + 390), (px2 - 100, cy1 + 390)], fill=C_LINE, width=2)

    fields = [
        ("常用時段", "平日晚間 19:30 - 21:00 / 週末清晨"),
        ("出沒地點", "大安森林公園、信義廣場草坪"),
        ("所在區域", "台北市 大安區"),
        ("與其他狗相處", "熱情主動、喜歡追逐互動"),
        ("個性特質", "活潑好動、親人撒嬌、護食注意"),
        ("毛孩簡介", "波波是一隻腿短短但跑超快的柯基！\n最喜歡去公園交新朋友，歡迎約散步！")
    ]

    fy = cy1 + 440
    for label, val in fields:
        draw.text((px1 + 100, fy), label, font=ipad_f_badge, fill=C_MUTED)
        draw.text((px1 + 100, fy + 55), val, font=ipad_f_card_body, fill=C_INK)
        fy += 160 if "\n" not in val else 220

    draw.rounded_rectangle([px1 + 100, cy1 + 1650, px2 - 100, cy1 + 1780], radius=40, fill=C_BRAND)
    draw.text(((px1 + px2) / 2 - 140, cy1 + 1685), "編輯毛孩檔案", font=ipad_f_button, fill=C_WHITE)

    img.save(os.path.join(IPAD_DIR, "03-profile.png"), "PNG")

def create_ipad_screen_4():
    img = Image.new("RGB", (IPAD_W, IPAD_H))
    draw = ImageDraw.Draw(img)
    draw_gradient_background(draw, IPAD_W, IPAD_H, C_BG_TOP, C_BG_BOT)
    draw_ipad_header(draw, "安全 Connect 與聊天", "雙方確認後開啟交流・約伴散步超放心")

    px1, py1, px2, py2 = 140, 420, 1908, 2600
    draw_ipad_frame(draw, px1, py1, px2, py2)

    draw.text((px1 + 60, py1 + 60), "Connect & 訊息", font=ipad_f_card_title, fill=C_INK)

    cy1 = py1 + 160
    draw.rounded_rectangle([px1 + 60, cy1, px2 - 60, cy1 + 340], radius=40, fill=C_CARD, outline=C_LINE, width=2)
    draw.text((px1 + 100, cy1 + 40), "來自 柴寶爸 的 Connect 邀請", font=ipad_f_card_title, fill=C_INK)
    draw.text((px1 + 100, cy1 + 120), "哈囉！我們也在大安森林公園，狗狗想認識！", font=ipad_f_card_body, fill=C_MUTED)

    draw.rounded_rectangle([px1 + 100, cy1 + 200, px1 + 400, cy1 + 290], radius=30, fill=C_BRAND)
    draw.text((px1 + 200, cy1 + 222), "接受", font=ipad_f_badge, fill=C_WHITE)

    draw.rounded_rectangle([px1 + 430, cy1 + 200, px1 + 730, cy1 + 290], radius=30, fill=(244, 237, 227))
    draw.text((px1 + 530, cy1 + 222), "略過", font=ipad_f_badge, fill=C_INK)

    cy2 = cy1 + 400
    draw.rounded_rectangle([px1 + 60, cy2, px2 - 60, cy2 + 1450], radius=40, fill=C_CARD, outline=C_LINE, width=2)
    draw.text((px1 + 100, cy2 + 50), "與 哈士奇 Lucky 主人 對話中", font=ipad_f_card_title, fill=C_INK)
    draw.text((px1 + 100, cy2 + 130), "最多 20 句安全交流 · 雙方確認後戶外見面", font=ipad_f_card_body, fill=C_MUTED)
    draw.line([(px1 + 100, cy2 + 190), (px2 - 100, cy2 + 190)], fill=C_LINE, width=2)

    # Bubbles
    draw.rounded_rectangle([px1 + 100, cy2 + 250, px1 + 950, cy2 + 400], radius=30, fill=(245, 245, 248))
    draw.text((px1 + 140, cy2 + 290), "你好！請問你們今天傍晚會去\n迎風狗運動公園嗎？", font=ipad_f_card_body, fill=C_INK)

    draw.rounded_rectangle([px2 - 1000, cy2 + 460, px2 - 100, cy2 + 610], radius=30, fill=C_BRAND)
    draw.text((px2 - 950, cy2 + 500), "會的！我們預計 17:00 到，\nLucky 會帶飛盤去玩！", font=ipad_f_card_body, fill=C_WHITE)

    draw.rounded_rectangle([px1 + 100, cy2 + 670, px1 + 900, cy2 + 790], radius=30, fill=(245, 245, 248))
    draw.text((px1 + 140, cy2 + 710), "太棒了！那我們在草坪區見！", font=ipad_f_card_body, fill=C_INK)

    draw.rounded_rectangle([px1 + 100, cy2 + 1240, px2 - 100, cy2 + 1380], radius=30, fill=(255, 245, 235), outline=C_BRAND, width=1)
    draw.text((px1 + 140, cy2 + 1285), "🛡️ 檢舉與封鎖保護 · 打造安全友善寵物社群", font=ipad_f_badge, fill=C_BRAND_DEEP)

    img.save(os.path.join(IPAD_DIR, "04-connect-chat.png"), "PNG")

# Also copy/ensure iPhone images into iphone/ folder
def organize_iphone_images():
    for name in ["01-explore.png", "02-meetup.png", "03-profile.png", "04-connect-chat.png"]:
        src = os.path.join(BASE_DIR, name)
        dst = os.path.join(IPHONE_DIR, name)
        if os.path.exists(src):
            img = Image.open(src)
            img.save(dst)

if __name__ == "__main__":
    create_ipad_screen_1()
    create_ipad_screen_2()
    create_ipad_screen_3()
    create_ipad_screen_4()
    organize_iphone_images()
    print("iPad & iPhone screenshots generated successfully!")
