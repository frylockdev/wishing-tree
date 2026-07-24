import Phaser from 'phaser';
import { RENDER_SCALE } from './hidpi';

/** Единый шрифт игры (грузится в main.ts до старта Phaser). */
export const FONT = 'Nunito, "Trebuchet MS", Arial, sans-serif';

/**
 * Плашки и текст Phaser рисует в canvas-текстуру в логических пикселях,
 * а камера растягивает её в RENDER_SCALE раз — получается мыло. Поэтому
 * рисуем их сразу в SS× и ужимаем объект обратно через setScale.
 */
const SS = RENDER_SCALE;

export const UI_COLORS = {
  cream: 0xfffdf6,
  creamBorder: 0xe9dcbe,
  textBrown: '#5b4630',
  textBrownSoft: '#9b8767',
};

export interface RoundRectOpts {
  alpha?: number;
  stroke?: number;
  strokeWidth?: number;
}

/**
 * Генерирует текстуру скруглённого прямоугольника в SS× (если ещё нет).
 * Размеры на входе — логические. Белую текстуру можно тонировать под тему.
 */
export function roundRectTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  r: number,
  fill: number,
  opts: RoundRectOpts = {},
): string {
  if (scene.textures.exists(key)) return key;
  const g = scene.add.graphics();
  const sw = (opts.strokeWidth ?? 0) * SS;
  g.fillStyle(fill, opts.alpha ?? 1);
  g.fillRoundedRect(sw, sw, w * SS, h * SS, r * SS);
  if (sw > 0 && opts.stroke !== undefined) {
    g.lineStyle(sw, opts.stroke, 1);
    g.strokeRoundedRect(sw, sw, w * SS, h * SS, r * SS);
  }
  g.generateTexture(key, w * SS + sw * 2, h * SS + sw * 2);
  g.destroy();
  return key;
}

/** Готовая картинка-плашка логического размера w×h. */
export function roundRectImage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: number,
  opts: RoundRectOpts = {},
): Phaser.GameObjects.Image {
  const key = `rr:${w}x${h}:${r}:${fill}:${opts.alpha ?? 1}:${opts.stroke ?? '-'}:${opts.strokeWidth ?? 0}`;
  roundRectTexture(scene, key, w, h, r, fill, opts);
  return scene.add.image(x, y, key).setScale(1 / SS);
}

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

/**
 * Текст, отрисованный в SS× и ужатый обратно, — чёткий при зуме камеры.
 * Размеры в стиле задаются логические; менять масштаб объекта после этого нельзя.
 */
export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  style: TextStyle = {},
): Phaser.GameObjects.Text {
  const { fontSize, strokeThickness, padding, ...rest } = style;
  const scaled: TextStyle = {
    fontFamily: FONT,
    ...rest,
    fontSize: `${parseFloat(String(fontSize ?? 16)) * SS}px`,
  };
  if (strokeThickness) scaled.strokeThickness = strokeThickness * SS;
  if (padding) {
    const p = padding as { x?: number; y?: number };
    scaled.padding = { x: (p.x ?? 0) * SS, y: (p.y ?? 0) * SS };
  }
  return scene.add.text(x, y, content, scaled).setScale(1 / SS);
}

export interface Chip {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  /** Полная ширина плашки — чтобы выравнивать её по краю экрана. */
  width: number;
  setText(value: string): void;
}

export interface ChipOpts {
  fontSize?: number;
  color?: string;
  fill?: number;
  fillAlpha?: number;
  stroke?: number;
  padX?: number;
  padY?: number;
}

/**
 * Скруглённая подпись, подгоняющаяся под текст.
 * Фон — Graphics: векторная геометрия остаётся чёткой при любом зуме камеры,
 * в отличие от backgroundColor у Text, который к тому же всегда прямоугольный.
 */
export function chip(scene: Phaser.Scene, x: number, y: number, text: string, opts: ChipOpts = {}): Chip {
  const padX = opts.padX ?? 8;
  const padY = opts.padY ?? 4;
  const container = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const label = txt(scene, 0, 0, text, {
    fontSize: `${opts.fontSize ?? 11}px`,
    fontStyle: '800',
    color: opts.color ?? UI_COLORS.textBrown,
  }).setOrigin(0.5);
  container.add([bg, label]);

  const result: Chip = {
    container,
    label,
    width: 0,
    setText(value: string) {
      if (label.text === value) return;
      label.setText(value);
      redraw();
    },
  };

  function redraw() {
    const w = Math.round(label.displayWidth) + padX * 2;
    const h = Math.round(label.displayHeight) + padY * 2;
    result.width = w;
    bg.clear();
    bg.fillStyle(opts.fill ?? UI_COLORS.cream, opts.fillAlpha ?? 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    if (opts.stroke !== undefined) {
      bg.lineStyle(1.5, opts.stroke, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    }
  }
  redraw();

  return result;
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
  const r = Math.min(18, h / 2 - 2);
  const container = scene.add.container(x, y);
  const shadow = roundRectImage(scene, 0, 4, w, h, r, 0xffffff);
  const top = roundRectImage(scene, 0, 0, w, h, r, 0xffffff);
  const label = txt(scene, 0, 0, text, {
    fontSize: `${fontSize}px`,
    fontStyle: '800',
    color: '#ffffff',
  }).setOrigin(0.5);
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
