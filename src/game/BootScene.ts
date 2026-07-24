import Phaser from 'phaser';
import { THEMES, type BrandTheme } from '../config/themes';

/**
 * Грузит арт из public/assets; если файла нет —
 * рисует процедурный плейсхолдер, чтобы игра работала до подключения ИИ-арта.
 * Фон сада грузится отдельно в HTML (#garden-bg) для чёткого HiDPI.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Фон больше не грузим в Phaser — он в HTML (#garden-bg) для чёткого HiDPI
    for (let s = 1; s <= 5; s++) {
      this.load.image(`tree-apple-${s}`, `assets/py/tree-${s}.png`);
      this.load.image(`tree-pear-${s}`, `assets/pk/tree-${s}.png`);
    }
    this.load.image('fruit-apple', 'assets/py/fruit.png');
    this.load.image('fruit-pear', 'assets/pk/fruit.png');
    this.load.image('chest', 'assets/common/chest.png');
    this.load.image('drop', 'assets/common/drop.png');
    this.load.image('coin', 'assets/common/coin.png');
  }

  create() {
    const missing = (key: string) => !this.textures.exists(key);

    for (const [fruit, prefix] of [['apple', 'py'], ['pear', 'pk']] as const) {
      const fruitTheme = prefix === 'py' ? THEMES.pyaterochka : THEMES.perekrestok;
      for (let s = 1; s <= 5; s++) {
        if (missing(`tree-${fruit}-${s}`)) this.makeTree(`tree-${fruit}-${s}`, s, fruitTheme);
      }
      if (missing(`fruit-${fruit}`)) this.makeFruit(`fruit-${fruit}`, fruitTheme);
    }
    if (missing('chest')) this.makeChest();
    if (missing('drop')) this.makeDrop();
    if (missing('coin')) this.makeCoin();

    this.scene.start('Garden');
  }

  private makeTree(key: string, stage: number, theme: BrandTheme) {
    const g = this.add.graphics();
    const W = 240;
    const H = 300;
    const cx = W / 2;
    const fruitColor = theme.fruit === 'apple' ? 0xe23b2e : 0xe8c93f;

    const trunkH = [30, 60, 100, 120, 130][stage - 1];
    const crownR = [0, 34, 62, 78, 86][stage - 1];
    const trunkW = [8, 12, 18, 24, 26][stage - 1];

    // Ствол
    g.fillStyle(0x8a5a33, 1);
    g.fillRoundedRect(cx - trunkW / 2, H - trunkH - 16, trunkW, trunkH, trunkW / 3);
    if (stage === 1) {
      // Росток: пара листиков
      g.fillStyle(0x5fae44, 1);
      g.fillEllipse(cx - 12, H - trunkH - 20, 26, 14);
      g.fillEllipse(cx + 12, H - trunkH - 26, 26, 14);
    } else {
      // Крона
      const cy = H - trunkH - crownR - 6;
      g.fillStyle(0x4e9a3a, 1);
      g.fillCircle(cx - crownR * 0.55, cy + crownR * 0.35, crownR * 0.62);
      g.fillCircle(cx + crownR * 0.55, cy + crownR * 0.35, crownR * 0.62);
      g.fillStyle(0x5fae44, 1);
      g.fillCircle(cx, cy, crownR);
      if (stage === 4) {
        // Цветы
        g.fillStyle(0xffffff, 1);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.fillCircle(cx + Math.cos(a) * crownR * 0.6, cy + Math.sin(a) * crownR * 0.55, 6);
        }
      }
      if (stage === 5) {
        // Плоды
        g.fillStyle(fruitColor, 1);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + 0.4;
          g.fillCircle(cx + Math.cos(a) * crownR * 0.62, cy + Math.sin(a) * crownR * 0.58, 11);
        }
      }
    }
    // Земля
    g.fillStyle(0x7a5630, 1);
    g.fillEllipse(cx, H - 10, 90 + stage * 14, 22);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  private makeFruit(key: string, theme: BrandTheme) {
    const g = this.add.graphics();
    const color = theme.fruit === 'apple' ? 0xe23b2e : 0xe8c93f;
    g.fillStyle(color, 1);
    if (theme.fruit === 'apple') {
      g.fillCircle(14, 16, 12);
    } else {
      g.fillEllipse(14, 18, 18, 22);
      g.fillCircle(14, 10, 7);
    }
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(13, 2, 3, 7);
    g.generateTexture(key, 28, 32);
    g.destroy();
  }

  private makeChest(key = 'chest') {
    const g = this.add.graphics();
    g.fillStyle(0x8a5a33, 1);
    g.fillRoundedRect(2, 12, 44, 30, 6);
    g.fillStyle(0xa9743f, 1);
    g.fillRoundedRect(2, 4, 44, 18, { tl: 10, tr: 10, bl: 2, br: 2 });
    g.fillStyle(0xffd24a, 1);
    g.fillRect(20, 16, 8, 12);
    g.generateTexture(key, 48, 46);
    g.destroy();
  }

  private makeDrop(key = 'drop') {
    const g = this.add.graphics();
    g.fillStyle(0x3fa9f5, 1);
    g.fillCircle(9, 12, 8);
    g.fillTriangle(9, 0, 3, 10, 15, 10);
    g.fillStyle(0xbfe6ff, 1);
    g.fillCircle(6, 11, 2.5);
    g.generateTexture(key, 18, 22);
    g.destroy();
  }

  private makeCoin(key = 'coin') {
    const g = this.add.graphics();
    g.fillStyle(0xd9a013, 1);
    g.fillCircle(10, 10, 10);
    g.fillStyle(0xffd24a, 1);
    g.fillCircle(10, 10, 8);
    g.generateTexture(key, 20, 20);
    g.destroy();
  }
}
