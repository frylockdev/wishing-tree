import Phaser from 'phaser';

/** Единый шрифт игры (грузится в main.ts до старта Phaser). */
export const FONT = 'Nunito, "Trebuchet MS", Arial, sans-serif';

export const UI_COLORS = {
  cream: 0xfffdf6,
  creamBorder: 0xe9dcbe,
  textBrown: '#5b4630',
  textBrownSoft: '#9b8767',
};

/**
 * Генерирует текстуру скруглённого прямоугольника (если ещё нет).
 * Белую текстуру можно тонировать через setTint под цвет темы.
 */
export function roundRectTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  r: number,
  fill: number,
  opts: { alpha?: number; stroke?: number; strokeWidth?: number } = {},
): string {
  if (scene.textures.exists(key)) return key;
  const g = scene.add.graphics();
  const sw = opts.strokeWidth ?? 0;
  g.fillStyle(fill, opts.alpha ?? 1);
  g.fillRoundedRect(sw, sw, w, h, r);
  if (sw > 0 && opts.stroke !== undefined) {
    g.lineStyle(sw, opts.stroke, 1);
    g.strokeRoundedRect(sw, sw, w, h, r);
  }
  g.generateTexture(key, w + sw * 2, h + sw * 2);
  g.destroy();
  return key;
}

export interface ChunkyButton {
  container: Phaser.GameObjects.Container;
  top: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  setColor(color: number, shadowColor: number): void;
}

/**
 * «Игрушечная» кнопка: скруглённая плашка с тёмной подложкой-объёмом.
 * Текстуры белые, цвет задаётся тонированием — можно перекрашивать на лету.
 */
export function chunkyButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  fontSize: number,
  onClick: () => void,
): ChunkyButton {
  const key = roundRectTexture(scene, `btn-${w}x${h}`, w, h, Math.min(18, h / 2 - 2), 0xffffff);
  const container = scene.add.container(x, y);
  const shadow = scene.add.image(0, 4, key);
  const top = scene.add.image(0, 0, key);
  const label = scene.add
    .text(0, 0, text, {
      fontSize: `${fontSize}px`,
      fontStyle: '800',
      fontFamily: FONT,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  container.add([shadow, top, label]);

  top.setInteractive({ useHandCursor: true });
  top.on('pointerdown', () => {
    top.y = 3;
    label.y = 3;
  });
  const release = () => {
    top.y = 0;
    label.y = 0;
  };
  top.on('pointerup', () => {
    release();
    onClick();
  });
  top.on('pointerout', release);

  return {
    container,
    top,
    shadow,
    label,
    setColor(color: number, shadowColor: number) {
      top.setTint(color);
      shadow.setTint(shadowColor);
    },
  };
}

/** Затемняет цвет на factor (0..1). */
export function darken(color: number, factor = 0.35): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(
    Math.round(c.red * (1 - factor)),
    Math.round(c.green * (1 - factor)),
    Math.round(c.blue * (1 - factor)),
  );
}
