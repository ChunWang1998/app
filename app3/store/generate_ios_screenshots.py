import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = "/Users/leo_1/Documents/GitHub/superpredict/app/app3/store/appstore"
os.makedirs(OUTPUT_DIR, exist_ok=True)

WIDTH = 1284
HEIGHT = 2778

FONT_PATH = "/System/Library/Fonts/PingFang.ttc"

def get_font(size, index=0): # 0: Regular, 1: Thin, 2: Ultralight, 3: Light, 4: Medium, 5: Semibold
    try:
        return ImageFont.truetype(FONT_PATH, size, index=index)
    except Exception:
        return ImageFont.load_default()

font_title = get_font(76, index=5)
font_sub = get_font(38, index=4)
font_card_title = get_font(46, index=5)
font_card_body = get_font(34, index=0)
font_card_tag = get_font(28, index=4)
font_button = get_font(36, index=5)
font_badge = get_font(26, index=5)
font_small = get_font(24, index=0)

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

def draw_phone_frame(draw, x1, y1, x2, y2):
    # Outer device bezel
    draw.rounded_rectangle([x1 - 12, y1 - 12, x2 + 12, y2 + 12], radius=68, fill=(30, 30, 35), outline=(60, 60, 65), width=4)
    # Screen background
    draw.rounded_rectangle([x1, y1, x2, y2], radius=56, fill=C_BG_TOP)
    # Island / notch pill
    pill_w = 260
    pill_h = 50
    px = (x1 + x2 - pill_w) // 2
    py = y1 + 24
    draw.rounded_rectangle([px, py, px + pill_w, py + pill_h], radius=25, fill=(0, 0, 0))

def draw_header_text(draw, title, subtitle):
    # Centered title
    bbox = draw.textbbox((0, 0), title, font=font_title)
    w = bbox[2] - bbox[0]
    draw.text(((WIDTH - w) / 2, 160), title, font=font_title, fill=C_INK)

    # Subtitle
    bbox_sub = draw.textbbox((0, 0), subtitle, font=font_sub)
    w_sub = bbox_sub[2] - bbox_sub[0]
    draw.text(((WIDTH - w_sub) / 2, 270), subtitle, font=font_sub, fill=C_MUTED)

# --- Screen 1: Explore ---
def create_screen_1():
    img = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(img)
    draw_gradient_background(draw, WIDTH, HEIGHT, C_BG_TOP, C_BG_BOT)
    draw_header_text(draw, "探索全台鄰汪夥伴", "快速尋找附近毛孩・篩選時段與地區")

    # Phone Frame
    px1, py1, px2, py2 = 110, 420, 1174, 2650
    draw_phone_frame(draw, px1, py1, px2, py2)

    # In-app navigation bar
    draw.text((px1 + 48, py1 + 100), "鄰汪 Linwang", font=font_card_title, fill=C_BRAND)
    draw.rounded_rectangle([px2 - 200, py1 + 95, px2 - 48, py1 + 155], radius=30, fill=C_BRAND)
    draw.text((px2 - 170, py1 + 107), "台北市 ▾", font=font_small, fill=C_WHITE)

    # Filter chips
    chips = ["全部時段", "週末早晨", "平日傍晚", "中大型犬", "活潑親狗"]
    cx = px1 + 48
    for i, chip in enumerate(chips):
        bg = C_BRAND if i == 0 else C_WHITE
        fg = C_WHITE if i == 0 else C_INK
        w = 170 if i < 3 else 180
        draw.rounded_rectangle([cx, py1 + 185, cx + w, py1 + 245], radius=24, fill=bg, outline=C_LINE, width=1)
        draw.text((cx + 20, py1 + 198), chip, font=font_badge, fill=fg)
        cx += w + 16

    # Dog Card 1
    cy1 = py1 + 280
    draw.rounded_rectangle([px1 + 40, cy1, px2 - 40, cy1 + 760], radius=36, fill=C_CARD, outline=C_LINE, width=2)
    # Dog Image placeholder / illustration box
    draw.rounded_rectangle([px1 + 64, cy1 + 24, px2 - 64, cy1 + 440], radius=24, fill=(255, 238, 220))
    draw.text((px1 + 90, cy1 + 50), "🐕", font=get_font(120))
    draw.text((px1 + 280, cy1 + 130), "Mochi ＆ 飼主 Leo", font=font_card_title, fill=C_INK)
    draw.text((px1 + 280, cy1 + 200), "柴犬 · 12kg · 3歲公犬", font=font_card_body, fill=C_MUTED)
    draw.rounded_rectangle([px1 + 280, cy1 + 265, px1 + 480, cy1 + 325], radius=16, fill=(230, 245, 238))
    draw.text((px1 + 300, cy1 + 278), "● 隨時可約", font=font_badge, fill=C_GREEN)

    # Info & Tags
    draw.text((px1 + 70, cy1 + 470), "散步地點：大安森林公園、華山大草皮", font=font_card_body, fill=C_INK)
    draw.text((px1 + 70, cy1 + 525), "個性特徵：愛玩拋接、親人親狗、精力充沛", font=font_card_body, fill=C_MUTED)

    # Connect button
    draw.rounded_rectangle([px1 + 70, cy1 + 610, px2 - 70, cy1 + 710], radius=30, fill=C_BRAND)
    draw.text(((px1 + px2) / 2 - 120, cy1 + 635), "發送 Connect 邀請", font=font_button, fill=C_WHITE)

    # Dog Card 2 (partially visible)
    cy2 = cy1 + 790
    draw.rounded_rectangle([px1 + 40, cy2, px2 - 40, cy2 + 760], radius=36, fill=C_CARD, outline=C_LINE, width=2)
    draw.rounded_rectangle([px1 + 64, cy2 + 24, px2 - 64, cy2 + 440], radius=24, fill=(232, 244, 252))
    draw.text((px1 + 90, cy2 + 50), "🦮", font=get_font(120))
    draw.text((px1 + 280, cy2 + 130), "Cookie ＆ 飼主 敏敏", font=font_card_title, fill=C_INK)
    draw.text((px1 + 280, cy2 + 200), "黃金獵犬 · 28kg · 4歲母犬", font=font_card_body, fill=C_MUTED)

    img.save(os.path.join(OUTPUT_DIR, "01-explore.png"), "PNG")

# --- Screen 2: Meetups ---
def create_screen_2():
    img = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(img)
    draw_gradient_background(draw, WIDTH, HEIGHT, C_BG_TOP, C_BG_BOT)
    draw_header_text(draw, "汪汪聚會・結伴同行", "舉辦與報名全台狗狗見面會・加入 LINE 交流群")

    px1, py1, px2, py2 = 110, 420, 1174, 2650
    draw_phone_frame(draw, px1, py1, px2, py2)

    # Nav
    draw.text((px1 + 48, py1 + 100), "汪汪聚會 Gatherings", font=font_card_title, fill=C_INK)
    draw.rounded_rectangle([px2 - 240, py1 + 95, px2 - 48, py1 + 155], radius=30, fill=C_BRAND)
    draw.text((px2 - 210, py1 + 107), "+ 創辦聚會", font=font_badge, fill=C_WHITE)

    # Gathering Card 1
    cy1 = py1 + 200
    draw.rounded_rectangle([px1 + 40, cy1, px2 - 40, cy1 + 680], radius=36, fill=C_CARD, outline=C_LINE, width=2)

    draw.rounded_rectangle([px1 + 64, cy1 + 30, px1 + 240, cy1 + 90], radius=16, fill=(255, 238, 220))
    draw.text((px1 + 84, cy1 + 43), "本週六 15:30", font=font_badge, fill=C_BRAND_DEEP)

    draw.text((px1 + 64, cy1 + 115), "大佳河濱公園・柴犬奔跑聚會", font=font_card_title, fill=C_INK)
    draw.text((px1 + 64, cy1 + 185), "📍 台北市中山區 · 大佳河濱迎風狗運動公園", font=font_card_body, fill=C_MUTED)
    draw.text((px1 + 64, cy1 + 245), "主辦人：大隊長 柴爸 · 已報名 8 隻狗狗", font=font_card_body, fill=C_INK)

    # Info pills
    draw.rounded_rectangle([px1 + 64, cy1 + 320, px1 + 300, cy1 + 380], radius=20, fill=C_TAG_BG)
    draw.text((px1 + 84, cy1 + 335), "柴犬 & 中型犬友善", font=font_badge, fill=C_BRAND)

    draw.rounded_rectangle([px1 + 320, cy1 + 320, px1 + 550, cy1 + 380], radius=20, fill=(230, 245, 238))
    draw.text((px1 + 340, cy1 + 335), "附 LINE 交流群組", font=font_badge, fill=C_GREEN)

    draw.rounded_rectangle([px1 + 64, cy1 + 530, px2 - 64, cy1 + 630], radius=30, fill=C_BRAND)
    draw.text(((px1 + px2) / 2 - 80, cy1 + 555), "立即報名聚會", font=font_button, fill=C_WHITE)

    # Gathering Card 2
    cy2 = cy1 + 720
    draw.rounded_rectangle([px1 + 40, cy2, px2 - 40, cy2 + 680], radius=36, fill=C_CARD, outline=C_LINE, width=2)
    draw.rounded_rectangle([px1 + 64, cy2 + 30, px1 + 240, cy2 + 90], radius=16, fill=(232, 244, 252))
    draw.text((px1 + 84, cy2 + 43), "下週日 09:00", font=font_badge, fill=(30, 100, 180))

    draw.text((px1 + 64, cy2 + 115), "凹子底森林公園・晨間慢步同樂會", font=font_card_title, fill=C_INK)
    draw.text((px1 + 64, cy2 + 185), "📍 高雄市鼓山區 · 凹子底公園大草皮", font=font_card_body, fill=C_MUTED)
    draw.text((px1 + 64, cy2 + 245), "主辦人：毛毛媽 · 已報名 12 隻狗狗", font=font_card_body, fill=C_INK)

    draw.rounded_rectangle([px1 + 64, cy2 + 530, px2 - 64, cy2 + 630], radius=30, fill=C_BRAND)
    draw.text(((px1 + px2) / 2 - 80, cy2 + 555), "立即報名聚會", font=font_button, fill=C_WHITE)

    img.save(os.path.join(OUTPUT_DIR, "02-meetup.png"), "PNG")

# --- Screen 3: Dog Profile ---
def create_screen_3():
    img = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(img)
    draw_gradient_background(draw, WIDTH, HEIGHT, C_BG_TOP, C_BG_BOT)
    draw_header_text(draw, "專屬毛孩檔案", "合照認證・個性習慣・多狗檔案管理")

    px1, py1, px2, py2 = 110, 420, 1174, 2650
    draw_phone_frame(draw, px1, py1, px2, py2)

    # Nav
    draw.text((px1 + 48, py1 + 100), "汪汪個人檔案 Profile", font=font_card_title, fill=C_INK)

    # Profile Card
    cy1 = py1 + 180
    draw.rounded_rectangle([px1 + 40, cy1, px2 - 40, cy1 + 1200], radius=36, fill=C_CARD, outline=C_LINE, width=2)

    # Avatar box
    draw.rounded_rectangle([px1 + 64, cy1 + 30, px1 + 264, cy1 + 230], radius=30, fill=(255, 238, 220))
    draw.text((px1 + 95, cy1 + 50), "🐕", font=get_font(120))

    draw.text((px1 + 290, cy1 + 50), "Nana (波波)", font=font_card_title, fill=C_INK)
    draw.text((px1 + 290, cy1 + 115), "柯基犬 · 11kg · 2歲女生", font=font_card_body, fill=C_MUTED)
    draw.text((px1 + 290, cy1 + 170), "飼主暱稱：Alex", font=font_card_body, fill=C_BRAND_DEEP)

    # Divider
    draw.line([(px1 + 64, cy1 + 260), (px2 - 64, cy1 + 260)], fill=C_LINE, width=2)

    fields = [
        ("常用時段", "平日晚間 19:30 - 21:00 / 週末清晨"),
        ("出沒地點", "大安森林公園、信義廣場草坪"),
        ("所在區域", "台北市 大安區"),
        ("與其他狗相處", "熱情主動、喜歡追逐互動"),
        ("個性特質", "活潑好動、親人撒嬌、護食注意"),
        ("毛孩簡介", "波波是一隻腿短短但跑超快的柯基！\n最喜歡去公園交新朋友，歡迎約散步！")
    ]

    fy = cy1 + 290
    for label, val in fields:
        draw.text((px1 + 64, fy), label, font=font_badge, fill=C_MUTED)
        draw.text((px1 + 64, fy + 38), val, font=font_card_body, fill=C_INK)
        fy += 105 if "\n" not in val else 145

    # Edit button
    draw.rounded_rectangle([px1 + 64, cy1 + 1040, px2 - 64, cy1 + 1140], radius=30, fill=C_BRAND)
    draw.text(((px1 + px2) / 2 - 100, cy1 + 1065), "編輯毛孩檔案", font=font_button, fill=C_WHITE)

    img.save(os.path.join(OUTPUT_DIR, "03-profile.png"), "PNG")

# --- Screen 4: Connect & Chat ---
def create_screen_4():
    img = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(img)
    draw_gradient_background(draw, WIDTH, HEIGHT, C_BG_TOP, C_BG_BOT)
    draw_header_text(draw, "安全 Connect 與聊天", "雙方確認後開啟交流・約伴散步超放心")

    px1, py1, px2, py2 = 110, 420, 1174, 2650
    draw_phone_frame(draw, px1, py1, px2, py2)

    # Nav
    draw.text((px1 + 48, py1 + 100), "Connect & 訊息", font=font_card_title, fill=C_INK)

    # Incoming request card
    cy1 = py1 + 180
    draw.rounded_rectangle([px1 + 40, cy1, px2 - 40, cy1 + 240], radius=30, fill=C_CARD, outline=C_LINE, width=2)
    draw.text((px1 + 64, cy1 + 30), "來自 柴寶爸 的 Connect 邀請", font=font_card_title, fill=C_INK)
    draw.text((px1 + 64, cy1 + 90), "哈囉！我們也在大安森林公園，狗狗想認識！", font=font_card_body, fill=C_MUTED)

    # Accept / Decline
    draw.rounded_rectangle([px1 + 64, cy1 + 145, px1 + 280, cy1 + 210], radius=20, fill=C_BRAND)
    draw.text((px1 + 120, cy1 + 160), "接受", font=font_badge, fill=C_WHITE)

    draw.rounded_rectangle([px1 + 300, cy1 + 145, px1 + 510, cy1 + 210], radius=20, fill=(244, 237, 227))
    draw.text((px1 + 360, cy1 + 160), "略過", font=font_badge, fill=C_INK)

    # Chat dialog box
    cy2 = cy1 + 280
    draw.rounded_rectangle([px1 + 40, cy2, px2 - 40, cy2 + 1050], radius=36, fill=C_CARD, outline=C_LINE, width=2)
    draw.text((px1 + 64, cy2 + 30), "與 哈士奇 Lucky 主人 對話中", font=font_card_title, fill=C_INK)
    draw.text((px1 + 64, cy2 + 85), "最多 20 句安全交流 · 雙方確認後戶外見面", font=font_small, fill=C_MUTED)
    draw.line([(px1 + 64, cy2 + 125), (px2 - 64, cy2 + 125)], fill=C_LINE, width=1)

    # Chat Bubbles
    # Left
    draw.rounded_rectangle([px1 + 64, cy2 + 160, px1 + 640, cy2 + 270], radius=24, fill=(245, 245, 248))
    draw.text((px1 + 90, cy2 + 190), "你好！請問你們今天傍晚會去\n迎風狗運動公園嗎？", font=font_card_body, fill=C_INK)

    # Right
    draw.rounded_rectangle([px2 - 680, cy2 + 300, px2 - 64, cy2 + 410], radius=24, fill=C_BRAND)
    draw.text((px2 - 650, cy2 + 330), "會的！我們預計 17:00 到，\nLucky 會帶飛盤去玩！", font=font_card_body, fill=C_WHITE)

    # Left
    draw.rounded_rectangle([px1 + 64, cy2 + 440, px1 + 620, cy2 + 530], radius=24, fill=(245, 245, 248))
    draw.text((px1 + 90, cy2 + 465), "太棒了！那我們在草坪區見！", font=font_card_body, fill=C_INK)

    # Bottom Safety & Action info
    draw.rounded_rectangle([px1 + 64, cy2 + 880, px2 - 64, cy2 + 990], radius=24, fill=(255, 245, 235), outline=C_BRAND, width=1)
    draw.text((px1 + 90, cy2 + 915), "🛡️ 檢舉與封鎖保護 · 打造安全友善寵物社群", font=font_badge, fill=C_BRAND_DEEP)

    img.save(os.path.join(OUTPUT_DIR, "04-connect-chat.png"), "PNG")

# --- App Store 1024x1024 Icon ---
def create_app_icon():
    img = Image.new("RGB", (1024, 1024), C_BG_TOP)
    draw = ImageDraw.Draw(img)

    # Load existing logo if available to paste in center, or draw
    logo_src = "/Users/leo_1/Documents/GitHub/superpredict/app/app3/mobile/assets/logo.png"
    if os.path.exists(logo_src):
        try:
            logo_img = Image.open(logo_src).convert("RGBA")
            logo_img = logo_img.resize((820, 820), Image.Resampling.LANCZOS)
            img.paste(logo_img, (102, 102), logo_img)
        except Exception:
            pass
    else:
        draw.text((300, 300), "🐕", font=get_font(400))

    img.save(os.path.join(OUTPUT_DIR, "icon-1024.png"), "PNG")

if __name__ == "__main__":
    create_screen_1()
    create_screen_2()
    create_screen_3()
    create_screen_4()
    create_app_icon()
    print("Successfully generated all App Store screenshots and icons in:", OUTPUT_DIR)
