"""Контактный лист из нарезанных спрайтов.

Кладём всё на травяной фон: на нём сразу заметна серая кайма, если
удаление фона отработало неаккуратно.
"""

from pathlib import Path

from PIL import Image

OUT = Path('public/assets')
BG = (126, 190, 96)
PAD = 24


def row(paths, max_h):
    ims = []
    for p in paths:
        im = Image.open(p).convert('RGBA')
        if im.height > max_h:
            im = im.resize((round(im.width * max_h / im.height), max_h), Image.LANCZOS)
        ims.append(im)
    w = sum(i.width for i in ims) + PAD * (len(ims) + 1)
    h = max(i.height for i in ims) + PAD * 2
    strip = Image.new('RGBA', (w, h), BG + (255,))
    x = PAD
    for i in ims:
        strip.alpha_composite(i, (x, h - PAD - i.height))
        x += i.width + PAD
    return strip


def main() -> None:
    rows = [
        row([OUT / 'py' / f'tree-{i}.png' for i in range(1, 6)], 300),
        row([OUT / 'pk' / f'tree-{i}.png' for i in range(1, 6)], 300),
        row(
            [OUT / 'py' / 'fruit.png', OUT / 'pk' / 'fruit.png']
            + [OUT / 'common' / f'{n}.png' for n in ('chest', 'drop', 'coin')],
            140,
        ),
        row(
            [OUT / 'common' / f'nav-{n}.png'
             for n in ('garden', 'tasks', 'rewards', 'friends', 'album')],
            72,
        ),
    ]
    w = max(r.width for r in rows)
    sheet = Image.new('RGBA', (w, sum(r.height for r in rows)), BG + (255,))
    y = 0
    for r in rows:
        sheet.alpha_composite(r, (0, y))
        y += r.height
    sheet.convert('RGB').save('art_preview.png')
    print(f'art_preview.png {sheet.size}')


if __name__ == '__main__':
    main()
