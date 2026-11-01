# One-off, manual asset generator — NOT part of `npm run dev`/`generate`.
# 到達度診断テストの結果画面の巻物(components/TestResultSheet.vue の .testscroll)に使う 9 分割用の画像を作る。
#
# Source: assets/images/test-scroll.png(生成AIで作った巻物 1024×1536、白背景。raw なので gitignore —
#         他の assets/images/*.png と同じ扱い)。2026-11-02 にユーザーが生成したもの。
# Output: assets/images/optimized/test-scroll.webp(透過)と、CSS の border-image に渡す切り分け位置を標準出力へ。
#
# やること:
#   1. 白背景を透明にする(画像の外周から続く白だけ。紙は白より黄みが強いので巻き込まない)。輪郭は1〜2pxなじませる。
#   2. 縦を「上(巻き軸＋紙の上端) / 真ん中(紙だけ・縦に繰り返す帯) / 下(紙の下端＋巻き軸)」に組み直す。
#      真ん中の帯は、終わりと始まりがつながるように重ね合わせて、縦に何回繰り返しても継ぎ目が出ないようにする。
#      上と帯・帯と下の境目も、元画像で連続している行どうしになるようにつないでいる。
#   3. 横は左右のキャップ(金の飾り)の内側で切る(border-image の左右の幅)。間は横に伸ばしても破綻しない
#      (巻いた紙と紙の繊維だけ)。
#
# Usage: python3 scripts/makeTestScroll.py
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/images/test-scroll.png')
OUT = os.path.join(ROOT, 'assets/images/optimized/test-scroll.webp')

# 元画像での位置(1024×1536 の画素。測定値)
CROP_TOP, CROP_BOTTOM = 24, 1506     # 巻物の上端・下端(上下の白い余白を落とす)
TILE_START, TILE_END = 200, 600      # 縦に繰り返す紙の帯(紙が平らで濃淡ムラが少ない範囲)
BOTTOM_START = 1340                  # 下の部分の始まり(紙の下端の手前)
BLEND = 64                           # 帯の継ぎ目・下の部分の入りを重ね合わせる行数
SLICE_LEFT = 190                     # 左キャップの内側(キャップは x≈8〜165、巻いた紙の端の陰影が 180 付近まで)
SLICE_RIGHT = 1024 - 834             # 右キャップの内側(左右対称)
WHITE = 236                          # これ以上の明るさ(RGB の最小値)で外周につながる部分を背景とみなす


def make_alpha(rgb: np.ndarray) -> np.ndarray:
    near_white = rgb.min(axis=2) >= WHITE
    labels, _ = ndimage.label(near_white)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, border[border > 0])
    alpha = np.where(bg, 0.0, 1.0)
    # 輪郭のなじませ: 背景に接する 2px は「白からどれだけ離れているか」で半透明にする
    edge = ndimage.binary_dilation(bg, iterations=2) & ~bg
    whiteness = (255 - rgb.min(axis=2)) / (255 - 200)
    alpha[edge] = np.clip(whiteness[edge], 0.0, 1.0)
    return alpha


def unpremultiply_white(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    # 白の上で半透明になっていた色から白を抜く(輪郭に白いフチが残らないように)
    a = np.maximum(alpha[..., None], 1e-3)
    out = (rgb - 255.0 * (1 - a)) / a
    return np.clip(out, 0, 255)


def main():
    src = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float64)
    h, w, _ = src.shape
    assert (w, h) == (1024, 1536), f'想定外のサイズ {w}x{h}'
    alpha = make_alpha(src)
    rgb = unpremultiply_white(src, alpha)
    rgba = np.dstack([rgb, alpha * 255])

    # 上: 最後の 40 行を、帯の最終行の手前(TILE_END-40〜)へ徐々に移す。こうすると上の最終行の次に帯の先頭
    # (= 元画像の TILE_END 行目)が来てもつながる。紙の上端の陰影(元画像 y≈138〜150)にはかからない長さにしている。
    top = rgba[CROP_TOP:TILE_START].copy()
    tb = 40
    wt = (np.arange(1, tb + 1) / tb)[:, None, None]
    top[-tb:] = (1 - wt) * top[-tb:] + wt * rgba[TILE_END - tb:TILE_END]
    # 帯: 先頭 BLEND 行を「帯の直後の行」から「帯の先頭の行」へ徐々に移す。こうすると
    # 帯の最終行(TILE_END-1)の次に帯の先頭が来ても、元画像の TILE_END 行目が続くのと同じになる。
    tile = rgba[TILE_START:TILE_END].copy()
    after = rgba[TILE_END:TILE_END + BLEND]
    wgt = (np.arange(BLEND) / BLEND)[:, None, None]
    tile[:BLEND] = (1 - wgt) * after + wgt * tile[:BLEND]
    # 下: 帯の最終行の次は元画像の TILE_END 行目なので、そこから BOTTOM_START 以降へ徐々に移す
    bottom = rgba[BOTTOM_START:CROP_BOTTOM].copy()
    lead = rgba[TILE_END:TILE_END + BLEND]
    bottom[:BLEND] = (1 - wgt) * lead + wgt * bottom[:BLEND]

    out = np.concatenate([top, tile, bottom]).round().astype(np.uint8)
    Image.fromarray(out).save(OUT, 'WEBP', quality=88, method=6)
    print(f'wrote {os.path.relpath(OUT, ROOT)} {out.shape[1]}x{out.shape[0]} ({os.path.getsize(OUT) // 1024} KB)')
    print(f'border-image-slice: {len(top)} {SLICE_RIGHT} {len(bottom)} {SLICE_LEFT} fill')
    print(f'  paper: left={124} right={1024 - 898} top(src y 138)→{138 - CROP_TOP} bottom(src y 1390)→{CROP_BOTTOM - 1390} (px from each edge)')


if __name__ == '__main__':
    main()
