# 男性版の顔アイコン(assets/images/faces/seal-{n}-male.webp)を生成する一度きりのスクリプト。
# `npm run dev` / `generate` からは呼ばれない。
#
# 背景: 相性診断の丸いアイコン(components/MayaGlyph.vue)は顔だけを切り出した画像を使うが、
# 女性版(assets/images/faces/seal-{n}.webp、2026-07に手作業で用意)しか無く、男性を選んでも
# 女性のアイコンが出ていた(2026-09-23報告)。全身像・上半身像は男女の出し分けが既にある
# (scripts/generateSealCutouts.py)。
#
# 切り出し方: 透明部分を除いた全身の「頭の位置」を輪郭から求め、そこを中心に正方形で切る。
#   - 顔を色で探す方法(肌色検出)は、衣装や小物を顔と誤検出して安定しなかったため採らない。
#   - 頭は「上端付近で最も横に長く連続する不透明の区間」。杖・旗・剣は細いので自然に外れる。
#   - 正方形の一辺は全身の高さの30%。女性版と同じくらいの「顔＋肩」の画角になる。
# 位置が合わないキャラクターだけ X_NUDGE で左右に寄せる(全身の高さに対する割合)。
#
# Usage: pip install pillow numpy ; python3 scripts/generateSealFacesMale.py
#
# 女性版は既存の手作業の切り出しをそのまま使う。このスクリプトは上書きしない。
import os
import re
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(ROOT, 'assets', 'images', 'male')
OUT_DIR = os.path.join(ROOT, 'assets', 'images', 'faces')

# SEALS order from utils/mayaData.ts — must stay in sync.
SEAL_NAMES = [
    '赤い竜', '白い風', '青い夜', '黄色い種', '赤い蛇',
    '白い世界の橋渡し', '青い手', '黄色い星', '赤い月', '白い犬',
    '青い猿', '黄色い人', '赤い空歩く人', '白い魔法使い', '青い鷲',
    '黄色い戦士', '赤い地球', '白い鏡', '青い嵐', '黄色い太陽',
]

ALPHA_NOISE_FLOOR = 15
SIDE_RATIO = 0.30   # 正方形の一辺 / 全身の高さ
OUT_SIZE = 320      # 出力サイズ(女性版と同じ)

# 頭の中心が輪郭からうまく取れないキャラクターの微調整(全身の高さに対する割合。正で右へ)。
X_NUDGE = {
    19: -0.03,  # 黄色い太陽 — 右手の大きな杖の飾りに引っ張られる
}


def find_source(seal_index: int) -> str:
    pattern = re.compile(rf'^\d+\s*{re.escape(SEAL_NAMES[seal_index])}\.png$')
    for fname in os.listdir(RAW_DIR):
        if pattern.match(fname):
            return os.path.join(RAW_DIR, fname)
    raise FileNotFoundError(f'No source PNG for seal {seal_index} ({SEAL_NAMES[seal_index]}) in {RAW_DIR}')


def trimmed(path: str) -> Image.Image:
    im = Image.open(path).convert('RGBA')
    arr = np.array(im)
    arr[arr[:, :, 3] < ALPHA_NOISE_FLOOR, 3] = 0
    im = Image.fromarray(arr)
    return im.crop(im.getbbox())


def head_center_x(im: Image.Image) -> float:
    alpha = np.array(im)[:, :, 3] > 40
    h, w = alpha.shape
    best = None
    for y in range(0, int(h * 0.10), max(1, int(h * 0.004))):
        idx = np.flatnonzero(alpha[y])
        if idx.size == 0:
            continue
        # 3px以上離れていたら別の区間として扱う(髪の隙間で切れないように)
        for seg in np.split(idx, np.where(np.diff(idx) > 3)[0] + 1):
            if seg.size < w * 0.05:
                continue
            if best is None or seg.size > best[0]:
                best = (seg.size, (seg[0] + seg[-1]) / 2)
    return best[1] if best else w / 2


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for seal_index in range(20):
        im = trimmed(find_source(seal_index))
        w, h = im.size
        side = round(h * SIDE_RATIO)
        cx = head_center_x(im) + X_NUDGE.get(seal_index, 0) * h
        x0 = round(cx - side / 2)
        x0 = max(0, min(x0, max(w - side, 0)))
        crop = im.crop((x0, 0, x0 + side, side))
        flat = Image.new('RGB', crop.size, (255, 255, 255))
        flat.paste(crop, (0, 0), crop)
        out_path = os.path.join(OUT_DIR, f'seal-{seal_index}-male.webp')
        flat.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS).save(out_path, 'WEBP', quality=88, method=6)
        print(f'[{seal_index:2d}] {SEAL_NAMES[seal_index]} -> {os.path.basename(out_path)}')
    print('Done.')


if __name__ == '__main__':
    main()
