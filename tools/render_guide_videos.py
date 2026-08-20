"""Render five original TRIPPICK guide videos from local brand assets.

The videos use only generated graphics, project-owned mascot artwork, and
Windows' local Korean speech synthesizer. No third-party video or music is
downloaded or embedded.
"""

from __future__ import annotations

import math
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
TOOLS_DIR = ROOT / "tools" / ".video-deps"
sys.path.insert(0, str(TOOLS_DIR))

try:
    import imageio_ffmpeg  # noqa: E402
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Install tools/video-requirements.txt into tools/.video-deps before rendering."
    ) from exc


WIDTH, HEIGHT, FPS = 1280, 720, 24
OUTPUT_DIR = ROOT / "videos" / "guide"
POSTER_DIR = OUTPUT_DIR / "posters"
FONT_REGULAR = Path(r"C:\Windows\Fonts\malgun.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\malgunbd.ttf")

IVORY = (246, 241, 230)
PAPER = (251, 248, 241)
FOREST = (46, 74, 58)
FOREST_DARK = (16, 31, 23)
TERRACOTTA = (193, 102, 62)
BRASS = (216, 190, 135)
INK = (28, 29, 24)


VIDEOS = [
    {
        "slug": "first-camp-essentials",
        "category": "준비물",
        "title": "첫 캠핑\n준비물 12가지",
        "subtitle": "많이 사기보다, 필요한 순서대로",
        "character": "a1-tent-spirit-card.jpg",
        "accent": TERRACOTTA,
        "background": ((26, 55, 42), (78, 104, 74)),
        "tips": [
            ("편안한 잠자리", "텐트 · 매트 · 침낭을 먼저 준비해요"),
            ("꼭 필요한 취사", "버너 · 코펠 · 물은 사용할 만큼만"),
            ("마지막 안전 점검", "랜턴 · 구급함 · 보조 배터리 확인"),
        ],
        "narration": "첫 캠핑 준비물은 많이 사는 것보다 순서가 중요해요. 먼저 텐트, 매트, 침낭으로 편안한 잠자리를 준비하세요. 다음은 버너, 코펠, 물처럼 꼭 필요한 취사 장비만 챙겨요. 마지막으로 랜턴, 구급함, 보조 배터리를 확인하면 기본 준비는 끝입니다.",
    },
    {
        "slug": "camping-manners",
        "category": "캠핑 매너",
        "title": "모두가 편안한\n캠핑 매너",
        "subtitle": "좋은 캠핑은 작은 배려에서 시작돼요",
        "character": "a2-tent-spirit-card.jpg",
        "accent": (225, 137, 79),
        "background": ((27, 43, 34), (92, 82, 58)),
        "tips": [
            ("매너타임 준비", "밤 10시 전 소리와 조명을 낮춰요"),
            ("늦은 이동 줄이기", "차량 이동과 장비 정리는 미리 끝내요"),
            ("공용 공간 배려", "개수대와 화장실은 깨끗하게 사용해요"),
        ],
        "narration": "모두가 편안한 캠핑을 위해 매너타임을 지켜요. 밤 열 시가 되기 전 대화 소리와 음악, 조명 밝기를 낮춰주세요. 늦은 시간 차량 이동과 장비 정리는 최소화합니다. 개수대와 화장실은 다음 사람이 바로 사용할 수 있도록 깨끗하게 정리해요.",
    },
    {
        "slug": "pet-camping-check",
        "category": "반려동물 동반",
        "title": "함께 떠나는\n반려동물 캠핑",
        "subtitle": "예약 전 확인부터 현장 펫티켓까지",
        "character": "b2-compass-bear-card.jpg",
        "accent": (188, 150, 72),
        "background": ((34, 62, 50), (74, 102, 71)),
        "tips": [
            ("동반 규정 확인", "가능 구역 · 추가 요금 · 제한 조건 확인"),
            ("기본 준비물", "리드줄 · 인식표 · 배변봉투를 챙겨요"),
            ("건강과 휴식", "진드기 · 더위 · 탈수를 예방해요"),
        ],
        "narration": "반려동물과 캠핑을 떠나기 전 동반 가능 구역과 추가 요금, 제한 조건을 확인하세요. 현장에서는 리드줄과 인식표를 착용하고 배변봉투를 준비합니다. 진드기 예방을 마치고, 뜨거운 바닥과 탈수를 피할 수 있는 그늘진 휴식 공간도 꼭 마련해 주세요.",
    },
    {
        "slug": "camping-style-guide",
        "category": "캠핑 유형",
        "title": "차박과 오토캠핑\n나에게 맞는 선택",
        "subtitle": "인원과 장비, 편의시설로 비교해요",
        "character": "c1-pin-squirrel-card.jpg",
        "accent": (210, 112, 70),
        "background": ((24, 48, 38), (63, 83, 65)),
        "tips": [
            ("차박", "설치가 빠르고 이동이 간편해요"),
            ("오토캠핑", "넓은 공간과 편안한 잠자리가 장점이에요"),
            ("선택 기준", "인원 · 수납 · 화장실 · 전기를 확인해요"),
        ],
        "narration": "차박은 설치가 빠르고 이동이 간편하지만 수납과 잠자리 공간이 제한적이에요. 오토캠핑은 준비 시간이 더 필요하지만 넓고 편안하게 머물 수 있습니다. 함께 가는 인원과 보유 장비, 화장실과 전기 같은 편의시설을 기준으로 나에게 맞는 방식을 선택하세요.",
    },
    {
        "slug": "rain-camping-safety",
        "category": "우천 안전",
        "title": "비 오는 날\n출발 판단법",
        "subtitle": "비의 양보다 바람과 지형을 함께 봐요",
        "character": "c2-pin-squirrel-card.jpg",
        "accent": (202, 104, 62),
        "background": ((19, 43, 37), (43, 70, 65)),
        "tips": [
            ("예보 함께 보기", "강수량과 순간 최대 풍속을 확인해요"),
            ("안전한 자리", "하천변 · 낮은 지대 · 배수 불량은 피하기"),
            ("철수 기준", "천둥 · 강풍 · 침수 징후엔 바로 철수해요"),
        ],
        "narration": "우천 캠핑은 비의 양만 보지 말고 바람과 지형을 함께 확인해야 해요. 출발 전 시간대별 강수량과 순간 최대 풍속을 살펴보세요. 하천변과 낮은 지대, 배수가 나쁜 사이트는 피합니다. 천둥이나 강풍, 침수 징후가 보이면 계획보다 안전한 철수를 먼저 선택하세요.",
    },
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size)


FONTS = {
    "brand": font(20, True),
    "category": font(22, True),
    "title": font(68, True),
    "subtitle": font(27),
    "number": font(25, True),
    "tip": font(49, True),
    "body": font(28),
    "caption": font(24, True),
    "recap": font(47, True),
    "check": font(28, True),
}


def gradient_image(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    y = np.linspace(0, 1, HEIGHT, dtype=np.float32)[:, None, None]
    top_arr = np.array(top, dtype=np.float32)[None, None, :]
    bottom_arr = np.array(bottom, dtype=np.float32)[None, None, :]
    pixels = top_arr * (1 - y) + bottom_arr * y
    pixels = np.repeat(pixels, WIDTH, axis=1).astype(np.uint8)
    return Image.fromarray(pixels, "RGB")


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def fit_character(path: Path, size: int = 420) -> Image.Image:
    source = Image.open(path).convert("RGB")
    side = min(source.size)
    left = (source.width - side) // 2
    top = (source.height - side) // 2
    source = source.crop((left, top, left + side, top + side)).resize((size, size), Image.Resampling.LANCZOS)
    card = Image.new("RGBA", (size, size), (*IVORY, 255))
    card.paste(source, (0, 0))
    card.putalpha(rounded_mask((size, size), 54))
    return card


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def content_alpha(local_time: float, phase_duration: float) -> float:
    fade = 0.48
    return min(smoothstep(local_time / fade), smoothstep((phase_duration - local_time) / fade))


def draw_progress(draw: ImageDraw.ImageDraw, progress: float, accent: tuple[int, int, int]) -> None:
    left, top, right = 72, 48, WIDTH - 72
    draw.rounded_rectangle((left, top, right, top + 6), radius=3, fill=(255, 255, 255, 45))
    draw.rounded_rectangle((left, top, left + max(8, int((right - left) * progress)), top + 6), radius=3, fill=accent)


def draw_brand(draw: ImageDraw.ImageDraw) -> None:
    draw.text((72, 75), "TRIPPICK", font=FONTS["brand"], fill=BRASS)
    draw.text((184, 78), "CAMPING CLASS", font=font(13, True), fill=(255, 255, 255, 150))


def draw_decor(frame: Image.Image, t: float, accent: tuple[int, int, int]) -> None:
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for i, radius in enumerate((190, 120, 72)):
        x = WIDTH - 130 + math.sin(t * 0.25 + i) * 18
        y = 40 + i * 155 + math.cos(t * 0.2 + i) * 14
        color = (*accent, 15 + i * 4)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=color, width=3)
    draw.arc((-110, HEIGHT - 250, 330, HEIGHT + 190), 200, 345, fill=(*BRASS, 35), width=4)
    frame.alpha_composite(overlay)


def add_character(frame: Image.Image, character: Image.Image, t: float, phase: int) -> None:
    scale = 0.92 + 0.035 * math.sin(t * 0.9 + phase)
    size = int(character.width * scale)
    card = character.resize((size, size), Image.Resampling.LANCZOS)
    shadow = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    x = WIDTH - size - 82
    y = 128 + int(math.sin(t * 1.25) * 7)
    shadow_draw.rounded_rectangle((x + 10, y + 16, x + size + 10, y + size + 16), radius=55, fill=(4, 12, 8, 65))
    frame.alpha_composite(shadow)
    frame.alpha_composite(card, (x, y))


def draw_caption(frame: Image.Image, text: str, accent: tuple[int, int, int]) -> None:
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    box = draw.textbbox((0, 0), text, font=FONTS["caption"])
    width = box[2] - box[0] + 62
    x = (WIDTH - width) // 2
    y = HEIGHT - 78
    draw.rounded_rectangle((x, y, x + width, y + 46), radius=23, fill=(13, 27, 19, 210), outline=(*accent, 160), width=2)
    draw.text((x + 31, y + 9), text, font=FONTS["caption"], fill=IVORY)
    frame.alpha_composite(overlay)


def render_frame(config: dict, character: Image.Image, base: Image.Image, t: float, duration: float) -> Image.Image:
    frame = base.convert("RGBA")
    draw_decor(frame, t, config["accent"])
    draw = ImageDraw.Draw(frame, "RGBA")
    draw_progress(draw, min(1.0, t / duration), config["accent"])
    draw_brand(draw)

    phase_edges = [0.0, 0.17, 0.38, 0.59, 0.80, 1.0]
    phase = min(4, next((i for i in range(5) if t / duration < phase_edges[i + 1]), 4))
    phase_start = phase_edges[phase] * duration
    phase_duration = (phase_edges[phase + 1] - phase_edges[phase]) * duration
    alpha = int(255 * content_alpha(t - phase_start, phase_duration))

    content = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(content, "RGBA")
    accent = (*config["accent"], alpha)
    white = (255, 255, 255, alpha)
    muted = (235, 236, 226, int(alpha * 0.78))

    if phase == 0:
        cdraw.rounded_rectangle((72, 130, 240, 170), radius=20, fill=(*config["accent"], int(alpha * 0.95)))
        category_width = cdraw.textbbox((0, 0), config["category"], font=FONTS["category"])[2]
        cdraw.text((156 - category_width / 2, 137), config["category"], font=FONTS["category"], fill=(255, 255, 255, alpha))
        cdraw.multiline_text((72, 205), config["title"], font=FONTS["title"], fill=white, spacing=8)
        cdraw.text((76, 395), config["subtitle"], font=FONTS["subtitle"], fill=muted)
        cdraw.rounded_rectangle((74, 460, 650, 522), radius=12, fill=(10, 23, 16, int(alpha * 0.58)), outline=(*BRASS, int(alpha * 0.45)), width=2)
        cdraw.text((101, 476), "소리 없이도 이해되는 핵심 가이드", font=font(23, True), fill=(246, 241, 230, alpha))
        caption = config["subtitle"]
    elif phase in (1, 2, 3):
        title, body = config["tips"][phase - 1]
        number = f"0{phase}"
        cdraw.rounded_rectangle((72, 142, 140, 210), radius=20, fill=accent)
        number_box = cdraw.textbbox((0, 0), number, font=FONTS["number"])
        cdraw.text((106 - (number_box[2] - number_box[0]) / 2, 158), number, font=FONTS["number"], fill=(255, 255, 255, alpha))
        cdraw.text((72, 242), title, font=FONTS["tip"], fill=white)
        cdraw.rounded_rectangle((72, 328, 715, 430), radius=18, fill=(7, 20, 13, int(alpha * 0.58)), outline=(*BRASS, int(alpha * 0.28)), width=2)
        cdraw.text((102, 363), body, font=FONTS["body"], fill=muted)
        cdraw.line((74, 474, 620, 474), fill=(*config["accent"], int(alpha * 0.8)), width=4)
        cdraw.text((74, 492), "한 번 더 확인하면 더 안전해요", font=font(23), fill=(255, 255, 255, int(alpha * 0.68)))
        caption = body
    else:
        cdraw.text((72, 142), "출발 전 10초 체크", font=FONTS["recap"], fill=white)
        cdraw.text((74, 205), "세 가지만 기억하세요", font=FONTS["subtitle"], fill=muted)
        for idx, (title, _) in enumerate(config["tips"]):
            y = 282 + idx * 82
            cdraw.rounded_rectangle((72, y, 660, y + 60), radius=14, fill=(8, 21, 14, int(alpha * 0.55)), outline=(*BRASS, int(alpha * 0.28)), width=2)
            cdraw.ellipse((92, y + 16, 120, y + 44), fill=accent)
            cdraw.text((98, y + 15), "✓", font=font(20, True), fill=(255, 255, 255, alpha))
            cdraw.text((140, y + 13), title, font=FONTS["check"], fill=white)
        caption = "확인하고, 안전하게 출발해요"

    frame.alpha_composite(content)
    add_character(frame, character, t, phase)
    draw_caption(frame, caption, config["accent"])
    return frame.convert("RGB")


def prepare_voice(directory: Path, slug: str) -> tuple[Path, float]:
    raw_path = ROOT / "videos" / "guide" / "_narration-temp" / f"{slug}-raw.wav"
    padded_path = directory / f"{slug}.wav"
    if not raw_path.exists() or raw_path.stat().st_size == 0:
        raise FileNotFoundError(f"Narration source missing: {raw_path}")

    with wave.open(str(raw_path), "rb") as source:
        params = source.getparams()
        audio = source.readframes(source.getnframes())
        rate = source.getframerate()
        silence = b"\x00" * int(rate * 0.8) * params.nchannels * params.sampwidth
        tail = b"\x00" * int(rate * 0.7) * params.nchannels * params.sampwidth

    with wave.open(str(padded_path), "wb") as target:
        target.setparams(params)
        target.writeframes(silence + audio + tail)

    with wave.open(str(padded_path), "rb") as final_audio:
        duration = final_audio.getnframes() / final_audio.getframerate()
    return padded_path, duration


def render_video(config: dict, ffmpeg: str, temp_dir: Path) -> tuple[Path, float]:
    character_path = ROOT / "assets" / "brand" / "guide-crew" / config["character"]
    character = fit_character(character_path)
    base = gradient_image(*config["background"])
    audio_path, audio_duration = prepare_voice(temp_dir, config["slug"])
    duration = max(22.0, audio_duration + 0.7)
    total_frames = math.ceil(duration * FPS)
    output = OUTPUT_DIR / f"{config['slug']}.mp4"

    command = [
        ffmpeg,
        "-y",
        "-loglevel",
        "error",
        "-f",
        "rawvideo",
        "-vcodec",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{WIDTH}x{HEIGHT}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-i",
        str(audio_path),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-t",
        f"{duration:.3f}",
        str(output),
    ]

    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    assert process.stdin is not None
    try:
        for frame_index in range(total_frames):
            t = frame_index / FPS
            frame = render_frame(config, character, base, t, duration)
            process.stdin.write(frame.tobytes())
            if frame_index == int(FPS * 1.3):
                poster = frame.resize((960, 540), Image.Resampling.LANCZOS)
                poster.save(POSTER_DIR / f"{config['slug']}.jpg", quality=90, optimize=True)
    finally:
        process.stdin.close()
    error = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
    code = process.wait()
    if code:
        raise RuntimeError(f"ffmpeg failed for {config['slug']}: {error}")
    return output, duration


def main() -> None:
    if not FONT_REGULAR.exists() or not FONT_BOLD.exists():
        raise FileNotFoundError("Malgun Gothic fonts are required")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    POSTER_DIR.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    temp_dir = Path(tempfile.mkdtemp(prefix="trippick-video-"))
    try:
        print(f"Using ffmpeg: {ffmpeg}", flush=True)
        for index, config in enumerate(VIDEOS, 1):
            print(f"[{index}/5] Rendering {config['slug']}...", flush=True)
            output, duration = render_video(config, ffmpeg, temp_dir)
            print(f"[{index}/5] Done: {output.name} ({duration:.1f}s, {output.stat().st_size / 1024 / 1024:.1f}MB)", flush=True)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
