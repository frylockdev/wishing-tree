"""Обработка сгенерированного ИИ-арта:
- удаление фона (шахматка/белый) флуд-филлом от краёв, чтобы не задеть белые цветы внутри кроны;
- нарезка горизонтальных листов на отдельные спрайты по колонкам непрозрачных пикселей;
- ресайз до игровых размеров и раскладка в public/assets/{py,pk}.
"""

import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('art_src')
OUT = Path('public/assets')


def remove_bg(im: Image.Image, is_bg) -> Image.Image:
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    visited = bytearray(w * h)
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_bg(px[x, y]):
                q.append((x, y))
                visited[y * w + x] = 1
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(px[x, y]) and not visited[y * w + x]:
                q.append((x, y))
                visited[y * w + x] = 1

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx] and is_bg(px[nx, ny]):
                visited[ny * w + nx] = 1
                q.append((nx, ny))

    # Смягчение краёв: полупрозрачная кромка в 1 пиксель
    alpha = im.split()[3]
    inner = alpha.point(lambda a: 255 if a == 255 else 0).filter(ImageFilter.MinFilter(3))
    edge_alpha = Image.composite(alpha, inner.point(lambda a: 150 if a == 0 else 255), inner)
    im.putalpha(Image.composite(edge_alpha, alpha, alpha.point(lambda a: 255 if a > 0 else 0)))
    return im


def is_checker(p) -> bool:
    r, g, b = p[0], p[1], p[2]
    return max(r, g, b) - min(r, g, b) <= 30 and (r + g + b) / 3 >= 140


def is_white(p) -> bool:
    return p[0] >= 228 and p[1] >= 228 and p[2] >= 228


def split_columns(im: Image.Image, min_gap: int = 12, min_width: int = 20):
    """Ищет вертикальные колонки с непрозрачными пикселями, разделённые пустыми промежутками."""
    w, h = im.size
    alpha = im.split()[3].load()
    occupied = [any(alpha[x, y] > 20 for y in range(h)) for x in range(w)]

    runs = []
    start = None
    gap = 0
    for x in range(w):
        if occupied[x]:
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                runs.append((start, x - gap))
                start = None
    if start is not None:
        runs.append((start, w - 1))
    return [(a, b) for a, b in runs if b - a >= min_width]


def crop_sprite(im: Image.Image, x0: int, x1: int) -> Image.Image:
    part = im.crop((x0, 0, x1 + 1, im.height))
    bbox = part.getchannel('A').getbbox()
    return part.crop(bbox)


def resize_h(im: Image.Image, target_h: int) -> Image.Image:
    w = round(im.width * target_h / im.height)
    return im.resize((w, target_h), Image.LANCZOS)


def split_widest(im: Image.Image, cols):
    """Если два дерева соприкасаются, делит самый широкий столбец в самом «тонком» месте."""
    h = im.height
    alpha = im.split()[3].load()
    widest = max(range(len(cols)), key=lambda i: cols[i][1] - cols[i][0])
    x0, x1 = cols[widest]
    lo = x0 + (x1 - x0) // 4
    hi = x1 - (x1 - x0) // 4
    best_x = min(range(lo, hi), key=lambda x: sum(1 for y in range(h) if alpha[x, y] > 20))
    return cols[:widest] + [(x0, best_x - 1), (best_x + 1, x1)] + cols[widest + 1 :]


def process_tree_sheet(path: Path, out_dir: Path):
    im = remove_bg(Image.open(path), is_checker)
    cols = split_columns(im)
    while len(cols) < 5:
        cols = split_widest(im, cols)
    print(f'{path.name}: found {len(cols)} columns')
    assert len(cols) == 5, f'ожидалось 5 стадий, найдено {len(cols)}'
    heights = [70, 130, 200, 260, 310]
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, (x0, x1) in enumerate(cols):
        sprite = resize_h(crop_sprite(im, x0, x1), heights[i])
        sprite.save(out_dir / f'tree-{i + 1}.png')
        print(f'  tree-{i + 1}.png {sprite.size}')


def process_fruits(path: Path):
    im = remove_bg(Image.open(path), is_white)
    cols = split_columns(im, min_gap=30, min_width=60)
    print(f'{path.name}: found {len(cols)} columns')
    assert len(cols) == 2, f'ожидалось 2 фрукта, найдено {len(cols)}'
    for prefix, (x0, x1) in zip(['py', 'pk'], cols):
        sprite = resize_h(crop_sprite(im, x0, x1), 32)
        (OUT / prefix).mkdir(parents=True, exist_ok=True)
        sprite.save(OUT / prefix / 'fruit.png')
        print(f'  {prefix}/fruit.png {sprite.size}')


def crop_to_aspect(im: Image.Image, aspect: float) -> Image.Image:
    """Центральный кроп под нужное соотношение сторон (ширина/высота)."""
    w, h = im.size
    current = w / h
    if abs(current - aspect) < 0.001:
        return im
    if current > aspect:
        # слишком широкий — обрезаем по бокам
        new_w = max(1, int(round(h * aspect)))
        left = (w - new_w) // 2
        return im.crop((left, 0, left + new_w, h))
    # слишком высокий — обрезаем сверху/снизу, чуть смещаем вниз (грядка важнее неба)
    new_h = max(1, int(round(w / aspect)))
    top = max(0, int((h - new_h) * 0.35))
    if top + new_h > h:
        top = h - new_h
    return im.crop((0, top, w, top + new_h))


def process_bg(path: Path, prefix: str):
    """Кроп в 9:16 (игровой вьюпорт) и ресайз до 1080×1920 (3×) для HiDPI."""
    (OUT / prefix).mkdir(parents=True, exist_ok=True)
    im = crop_to_aspect(Image.open(path).convert('RGB'), 9 / 16)
    im = im.resize((1080, 1920), Image.LANCZOS)
    im.save(OUT / prefix / 'bg.png', optimize=True)
    print(f'{prefix}/bg.png {im.size} ok')


def process_common(path: Path):
    """Лист из трёх иконок: сундук, капля, монета."""
    im = remove_bg(Image.open(path), is_white)
    cols = split_columns(im, min_gap=30, min_width=60)
    print(f'{path.name}: found {len(cols)} columns')
    assert len(cols) == 3, f'ожидалось 3 иконки, найдено {len(cols)}'
    (OUT / 'common').mkdir(parents=True, exist_ok=True)
    for (name, target_h), (x0, x1) in zip([('chest', 46), ('drop', 22), ('coin', 20)], cols):
        sprite = resize_h(crop_sprite(im, x0, x1), target_h)
        sprite.save(OUT / 'common' / f'{name}.png')
        print(f'  common/{name}.png {sprite.size}')


def process_nav(path: Path):
    """Лист из пяти иконок нижней навигации."""
    im = remove_bg(Image.open(path), is_white)
    cols = split_columns(im, min_gap=12, min_width=40)
    # Составные иконки (две фигурки «друзей») могут распасться на колонки —
    # сливаем ближайшие, пока не останется ровно 5
    while len(cols) > 5:
        gaps = [cols[i + 1][0] - cols[i][1] for i in range(len(cols) - 1)]
        i = gaps.index(min(gaps))
        cols = cols[:i] + [(cols[i][0], cols[i + 1][1])] + cols[i + 2 :]
    print(f'{path.name}: found {len(cols)} columns')
    assert len(cols) == 5, f'ожидалось 5 иконок, найдено {len(cols)}'
    (OUT / 'common').mkdir(parents=True, exist_ok=True)
    for name, (x0, x1) in zip(['garden', 'tasks', 'rewards', 'friends', 'album'], cols):
        sprite = resize_h(crop_sprite(im, x0, x1), 48)
        sprite.save(OUT / 'common' / f'nav-{name}.png')
        print(f'  common/nav-{name}.png {sprite.size}')


if __name__ == '__main__':
    process_bg(SRC / 'py-bg.png', 'py')
    process_bg(SRC / 'pk-bg.png', 'pk')
    process_tree_sheet(SRC / 'apple-tree-sheet.png', OUT / 'py')
    process_tree_sheet(SRC / 'pear-tree-sheet.png', OUT / 'pk')
    process_fruits(SRC / 'fruit-icons.png')
    if (SRC / 'common-icons.png').exists():
        process_common(SRC / 'common-icons.png')
    if (SRC / 'nav-icons.png').exists():
        process_nav(SRC / 'nav-icons.png')
    print('done')
