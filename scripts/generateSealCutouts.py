# One-off, manual asset generator — NOT part of `npm run dev`/`generate`, and not re-run
# automatically. Produces the transparent character cutouts consumed by MayaPortrait.vue
# (full-body) and the KINの関係性 relation cards in result.vue (upper-body "bust" crop).
#
# Source: the 20 full-resolution originals in assets/images/*.png (raw, gitignored), named
# `{sealIndex+1}{japanese name}.png` per utils/mayaData.ts's SEALS order (1-indexed). Output:
# assets/images/optimized/seal-{sealIndex}-cutout.webp (full-body, alpha-cropped) and
# assets/images/optimized/seal-{sealIndex}-bust.webp (top ~42% of the cropped content height),
# for sealIndex 0..19 — no "raw" counterpart, same precedent as assets/images/faces/.
#
# Usage: pip install rembg pillow ; python3 scripts/generateSealCutouts.py
#
# Uses the 'isnet-anime' rembg model (not the default 'u2net') — u2net's segmentation
# regularly fails on ornate held objects (staffs/scepters/swords) in this anime-illustration
# style, clipping off the top of the object entirely; isnet-anime, trained for anime art,
# preserves them correctly and also produces cleaner soft alpha edges around hair (u2net left
# faint whitish halo artifacts around flyaway hair strands on multiple characters).
import os
import re
from rembg import remove, new_session
from PIL import Image
import numpy as np

REMBG_SESSION = new_session('isnet-anime')

# isnet-anime scatters near-invisible alpha noise (values of a handful, not 0) all the way to
# the canvas edges on most outputs — invisible to the eye but enough that getbbox() (which
# treats any alpha>0 as content) returns the full, un-cropped canvas instead of the actual
# character bounds. Zeroing out anything below this floor right after remove() fixes bbox/crop
# for every character, not just ones where it's visually obvious (see seal-8/赤い月, whose
# character is narrow relative to its frame, so the inflated bbox was large enough to visibly
# shrink its rendered size sitewide).
ALPHA_NOISE_FLOOR = 15


def clean_alpha_noise(im: Image.Image, floor: int = ALPHA_NOISE_FLOOR) -> Image.Image:
    arr = np.array(im)
    arr[arr[:, :, 3] < floor, 3] = 0
    return Image.fromarray(arr, 'RGBA')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(ROOT, 'assets', 'images')
OUT_DIR = os.path.join(ROOT, 'assets', 'images', 'optimized')

# SEALS order from utils/mayaData.ts — must stay in sync.
SEAL_NAMES = [
    '赤い竜', '白い風', '青い夜', '黄色い種', '赤い蛇',
    '白い世界の橋渡し', '青い手', '黄色い星', '赤い月', '白い犬',
    '青い猿', '黄色い人', '赤い空歩く人', '白い魔法使い', '青い鷲',
    '黄色い戦士', '赤い地球', '白い鏡', '青い嵐', '黄色い太陽',
]

BUST_HEIGHT_RATIO = 0.42
PAD = 6


def find_source(seal_index: int) -> str:
    # The raw filenames' leading number is NOT sealIndex+1 — it's grouped by color family
    # (1-5 red, 6-10 white, 11-15 blue, 16-20 yellow), a different order than SEALS. Match by
    # the Japanese name only (with an optional stray space before it, see "17 黄色い星.png").
    name = SEAL_NAMES[seal_index]
    pattern = re.compile(rf'^\d+\s*{re.escape(name)}\.png$')
    for fname in os.listdir(RAW_DIR):
        if pattern.match(fname):
            return os.path.join(RAW_DIR, fname)
    raise FileNotFoundError(f'No source PNG found for seal {seal_index} ({name})')


def alpha_crop(im: Image.Image, pad: int = PAD) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(l - pad, 0)
    t = max(t - pad, 0)
    r = min(r + pad, im.width)
    b = min(b + pad, im.height)
    return im.crop((l, t, r, b))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for seal_index in range(20):
        name = SEAL_NAMES[seal_index]
        src_path = find_source(seal_index)
        print(f'[{seal_index:2d}] {name} <- {os.path.basename(src_path)}')

        src_bytes = open(src_path, 'rb').read()
        transparent = Image.open(__import__('io').BytesIO(remove(src_bytes, session=REMBG_SESSION))).convert('RGBA')
        transparent = clean_alpha_noise(transparent)

        full = alpha_crop(transparent)
        full_path = os.path.join(OUT_DIR, f'seal-{seal_index}-cutout.webp')
        full.save(full_path, 'WEBP', quality=88, method=6)

        bust_bottom = int(full.height * BUST_HEIGHT_RATIO)
        bust_slice = full.crop((0, 0, full.width, bust_bottom))
        bust = alpha_crop(bust_slice, pad=4)
        bust_path = os.path.join(OUT_DIR, f'seal-{seal_index}-bust.webp')
        bust.save(bust_path, 'WEBP', quality=88, method=6)

        print(f'      -> {os.path.basename(full_path)} ({full.size}), {os.path.basename(bust_path)} ({bust.size})')

    print('Done.')


if __name__ == '__main__':
    main()
