"""Build the TRIPPICK camping safety guide MP4 and poster.

Requires Pillow plus imageio-ffmpeg. The latter is intentionally kept outside
the repository when this script is run by Codex.
"""

from __future__ import annotations

import math
import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1280, 720
FPS = 24
DURATION = 75

FOREST = "#0B1710"
FOREST_2 = "#13251A"
PANEL = "#17291F"
IVORY = "#F6F1E6"
SOFT = "#D8D1C0"
GOLD = "#D8BE87"
BRASS = "#AD8A4C"
EMBER = "#C97155"
SAGE = "#8FB79B"

FONT_REGULAR = Path(r"C:\Windows\Fonts\malgun.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\malgunbd.ttf")

MASCOT_PATH = ROOT / "images" / "trippick-safety-bear.png"
VIDEO_PATH = ROOT / "videos" / "trippick-safety-guide.mp4"
POSTER_PATH = ROOT / "images" / "trippick-safety-guide-poster.jpg"
AUDIO_PATH = ROOT / "videos" / "trippick-safety-guide-music.wav"


SCENES = [
    {
        "start": 0,
        "end": 7,
        "tag": "TRIPPICK SAFETY GUIDE",
        "title": "곰이와 함께하는\n캠핑 안전 가이드",
        "body": "출발 전 75초만 확인하면\n첫 캠핑도 더 안전하고 즐거워요!",
        "tip": "여섯 가지 약속을 함께 확인해요",
    },
    {
        "start": 7,
        "end": 17,
        "tag": "01 · 안전한 자리 잡기",
        "title": "물가와 경사면은\n피해서 설치해요",
        "body": "평평하고 단단한 지정 구역을 고르고\n텐트 줄과 팩은 밝게 표시해요.",
        "tip": "낙석·마른 나뭇가지도 위쪽까지 확인!",
    },
    {
        "start": 17,
        "end": 27,
        "tag": "02 · 불 사용하기",
        "title": "불은 지정된 곳에서\n작게, 끝까지 지켜봐요",
        "body": "불 옆에는 물이나 소화기를 두고\n자리를 비울 땐 완전히 꺼요.",
        "tip": "바람이 강한 날에는 화로 사용 금지",
    },
    {
        "start": 27,
        "end": 37,
        "tag": "03 · 가스와 난방",
        "title": "밀폐된 텐트 안에서는\n화기를 사용하지 않아요",
        "body": "일산화탄소 경보기를 준비하고\n환기구는 언제나 열어 두세요.",
        "tip": "잠들기 전 난방기와 가스 밸브 확인",
    },
    {
        "start": 37,
        "end": 47,
        "tag": "04 · 날씨 확인하기",
        "title": "비·바람·번개 예보는\n출발 전 다시 확인해요",
        "body": "갑자기 하늘이 어두워지면 장비보다\n사람의 대피를 먼저 생각해요.",
        "tip": "계곡은 비가 오면 즉시 높은 곳으로",
    },
    {
        "start": 47,
        "end": 57,
        "tag": "05 · 자연과 이웃",
        "title": "음식과 쓰레기는\n밖에 두지 않아요",
        "body": "야생동물을 부르지 않도록 밀폐하고\n매너타임에는 목소리와 조명을 낮춰요.",
        "tip": "머문 자리는 처음보다 깨끗하게",
    },
    {
        "start": 57,
        "end": 67,
        "tag": "06 · 비상 상황",
        "title": "관리소와 대피로를\n도착하자마자 확인해요",
        "body": "사고가 나면 위치와 상황을 정확히 알리고\n위급할 때는 바로 119에 신고해요.",
        "tip": "구급함·휴대폰 배터리도 미리 점검",
    },
    {
        "start": 67,
        "end": 75,
        "tag": "READY TO CAMP",
        "title": "안전 준비 완료!",
        "body": "지정 구역 · 불씨 확인 · 환기\n날씨 · 쓰레기 · 대피로",
        "tip": "안전한 캠핑, 트립픽과 함께해요",
    },
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size)


F_TAG = font(22, True)
F_TITLE = font(52, True)
F_BODY = font(27)
F_TIP = font(21, True)
F_SMALL = font(16, True)


def rounded_image(image: Image.Image, size: tuple[int, int], radius: int) -> Image.Image:
    fitted = ImageOps.fit(image, size, Image.Resampling.LANCZOS, centering=(0.5, 0.46))
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    fitted.putalpha(mask)
    return fitted


def make_background() -> Image.Image:
    top = (11, 23, 16)
    bottom = (19, 37, 26)
    strip = Image.new("RGB", (1, HEIGHT))
    pixels = strip.load()
    for y in range(HEIGHT):
        p = y / max(1, HEIGHT - 1)
        pixels[0, y] = tuple(round(top[i] * (1 - p) + bottom[i] * p) for i in range(3))
    bg = strip.resize((WIDTH, HEIGHT))
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((770, -210, 1390, 410), fill=(173, 138, 76, 35))
    gd.ellipse((-260, 430, 460, 1010), fill=(93, 130, 103, 32))
    return Image.alpha_composite(bg.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(90)))


BASE_BG = make_background()
MASCOT_SOURCE = Image.open(MASCOT_PATH).convert("RGB")
MASCOT = rounded_image(ImageEnhance.Color(MASCOT_SOURCE).enhance(1.05), (385, 578), 32)


def draw_check(draw: ImageDraw.ImageDraw, x: int, y: int, color: str = SAGE) -> None:
    draw.ellipse((x, y, x + 34, y + 34), fill=color)
    draw.line((x + 9, y + 18, x + 15, y + 24, x + 26, y + 10), fill=FOREST, width=4)


def draw_frame(scene: dict, t: float, scene_index: int) -> Image.Image:
    frame = BASE_BG.copy()
    draw = ImageDraw.Draw(frame, "RGBA")

    # Slow floating firefly dots give the static illustrations some life.
    for i in range(18):
        x = (83 * i + int(t * (7 + i % 3))) % WIDTH
        y = 80 + (47 * i + int(11 * math.sin(t * 0.7 + i))) % 560
        alpha = 28 + int(18 * (1 + math.sin(t * 1.2 + i)) / 2)
        draw.ellipse((x, y, x + 3, y + 3), fill=(216, 190, 135, alpha))

    # Top brand and scene progress.
    draw.text((64, 42), "TRIPPICK", font=F_TAG, fill=IVORY)
    draw.text((178, 44), "CAMPING SAFETY", font=F_SMALL, fill=GOLD)
    for i in range(len(SCENES)):
        x = 946 + i * 31
        draw.rounded_rectangle((x, 52, x + 22, 58), 3, fill=GOLD if i <= scene_index else (246, 241, 230, 45))

    # Information panel.
    draw.rounded_rectangle((54, 104, 804, 654), 30, fill=(23, 41, 31, 235), outline=(216, 190, 135, 45), width=2)
    draw.text((96, 150), scene["tag"], font=F_TAG, fill=GOLD)
    draw.multiline_text((96, 198), scene["title"], font=F_TITLE, fill=IVORY, spacing=13)
    draw.line((96, 355, 196, 355), fill=EMBER, width=5)
    draw.multiline_text((96, 390), scene["body"], font=F_BODY, fill=SOFT, spacing=12)

    draw.rounded_rectangle((88, 550, 755, 616), 18, fill=(11, 23, 16, 190))
    draw_check(draw, 108, 566)
    draw.text((158, 568), scene["tip"], font=F_TIP, fill=IVORY)

    # Mascot card bobs gently to mimic a character animation.
    bob = int(7 * math.sin(t * 2.1))
    shadow = Image.new("RGBA", (440, 620), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((18, 18, 422, 606), 36, fill=(0, 0, 0, 80))
    frame.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(16)), (816, 92 + bob))
    frame.alpha_composite(MASCOT, (843, 109 + bob))

    # Bottom timeline.
    progress = min(1.0, max(0.0, t / DURATION))
    draw.rounded_rectangle((0, HEIGHT - 7, WIDTH, HEIGHT), 0, fill=(246, 241, 230, 30))
    draw.rounded_rectangle((0, HEIGHT - 7, int(WIDTH * progress), HEIGHT), 0, fill=BRASS)
    return frame.convert("RGB")


def frame_at(t: float) -> Image.Image:
    idx = next((i for i, scene in enumerate(SCENES) if scene["start"] <= t < scene["end"]), len(SCENES) - 1)
    current = draw_frame(SCENES[idx], t, idx)
    fade = t - SCENES[idx]["start"]
    if idx > 0 and fade < 0.55:
        previous = draw_frame(SCENES[idx - 1], SCENES[idx]["start"] - 0.01, idx - 1)
        eased = (fade / 0.55) ** 0.7
        return Image.blend(previous, current, eased)
    return current


def make_music(path: Path) -> None:
    sample_rate = 44_100
    notes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 349.23]
    samples = np.zeros(DURATION * sample_rate, dtype=np.float32)
    note_len = sample_rate * 2
    for i in range(math.ceil(len(samples) / note_len)):
        start = i * note_len
        end = min(len(samples), start + note_len)
        tt = np.arange(end - start) / sample_rate
        base = notes[i % len(notes)]
        envelope = np.minimum(1, tt * 3) * np.minimum(1, (2 - tt) * 2)
        tone = (
            np.sin(2 * math.pi * base * tt)
            + 0.45 * np.sin(2 * math.pi * base * 1.5 * tt)
            + 0.22 * np.sin(2 * math.pi * base * 2 * tt)
        )
        samples[start:end] += 0.055 * envelope * tone
    fade = np.linspace(0, 1, sample_rate * 2)
    samples[: len(fade)] *= fade
    samples[-len(fade) :] *= fade[::-1]
    pcm = np.int16(np.clip(samples, -1, 1) * 32767)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm.tobytes())


def build_video() -> None:
    VIDEO_PATH.parent.mkdir(parents=True, exist_ok=True)
    POSTER_PATH.parent.mkdir(parents=True, exist_ok=True)
    make_music(AUDIO_PATH)

    poster = frame_at(2.4)
    poster.save(POSTER_PATH, quality=90, optimize=True, progressive=True)

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg,
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-pix_fmt", "rgb24",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-r", str(FPS),
        "-i", "pipe:0",
        "-i", str(AUDIO_PATH),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "96k",
        "-movflags", "+faststart",
        "-shortest",
        str(VIDEO_PATH),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    for frame_number in range(DURATION * FPS):
        process.stdin.write(np.asarray(frame_at(frame_number / FPS), dtype=np.uint8).tobytes())
    process.stdin.close()
    return_code = process.wait()
    if return_code:
        raise SystemExit(f"ffmpeg failed with exit code {return_code}")
    AUDIO_PATH.unlink(missing_ok=True)
    print(f"Created {VIDEO_PATH}")
    print(f"Created {POSTER_PATH}")


if __name__ == "__main__":
    build_video()
