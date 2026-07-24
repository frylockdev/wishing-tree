import Phaser from 'phaser';
import { getApp } from '../app';
import { ECONOMY, WHEEL_SECTORS } from '../config/economy';
import { applyCameraHiDPI } from './hidpi';
import { UI_COLORS, chunkyButton, roundRectImage, txt, type ChunkyButton } from './uikit';

const CX = 180;
const CY = 290;
const R = 132;

export class WheelScene extends Phaser.Scene {
  private wheel!: Phaser.GameObjects.Container;
  private spinBtn!: ChunkyButton;
  private hintText!: Phaser.GameObjects.Text;
  private spinning = false;

  constructor() {
    super('Wheel');
  }

  create() {
    applyCameraHiDPI(this);

    const backdrop = this.add.rectangle(180, 320, 360, 640, 0x000000, 0.65).setInteractive();
    backdrop.on('pointerdown', () => {
      if (!this.spinning) this.scene.stop();
    });

    txt(this, CX, 80, '🎡 Колесо удачи', {
      fontSize: '24px',
      fontStyle: '900',
      color: '#ffffff',
      stroke: '#00000044',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.buildWheel();

    // Указатель
    this.add.triangle(CX, CY - R - 6, 0, 0, 24, 0, 12, 26, 0xffc700).setOrigin(0.5, 0).setDepth(5);

    // Кнопка вращения
    this.spinBtn = chunkyButton(this, CX, 500, 224, 54, '', 18, () => this.onSpin());
    this.spinBtn.setColor(0xffc700, 0xc79a00);
    this.spinBtn.label.setColor('#3a2c1a');

    this.hintText = txt(this, CX, 540, '', {
      fontSize: '13px',
      fontStyle: '700',
      color: '#ffffffcc',
    }).setOrigin(0.5);

    const closeBtn = txt(this, 336, 24, '✕', { fontSize: '24px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      if (!this.spinning) this.scene.stop();
    });

    this.refreshButton();
  }

  private buildWheel() {
    this.wheel = this.add.container(CX, CY);
    const seg = 360 / WHEEL_SECTORS.length;
    const g = this.add.graphics();

    WHEEL_SECTORS.forEach((sector, i) => {
      const start = Phaser.Math.DegToRad(i * seg);
      const end = Phaser.Math.DegToRad((i + 1) * seg);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(sector.color).color, 1);
      g.slice(0, 0, R, start, end);
      g.fillPath();
      g.lineStyle(3, 0xffffff, 0.9);
      g.slice(0, 0, R, start, end);
      g.strokePath();
    });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(0, 0, 22);
    this.wheel.add(g);

    WHEEL_SECTORS.forEach((sector, i) => {
      const mid = Phaser.Math.DegToRad(i * seg + seg / 2);
      const label = txt(this, Math.cos(mid) * (R - 42), Math.sin(mid) * (R - 42), sector.short, {
        fontSize: '15px',
        fontStyle: '800',
        color: '#ffffff',
        stroke: '#00000055',
        strokeThickness: 3,
      })
        .setOrigin(0.5)
        .setAngle(i * seg + seg / 2 + 90);
      this.wheel.add(label);
    });

    const hub = txt(this, 0, 0, '🎯', { fontSize: '20px' }).setOrigin(0.5);
    this.wheel.add(hub);
  }

  private freeAvailable(): boolean {
    const s = getApp().store.state;
    return s.wheelFreeSpinDay < s.day;
  }

  private refreshButton() {
    const s = getApp().store.state;
    if (this.freeAvailable()) {
      this.spinBtn.label.setText('Крутить бесплатно!');
      this.hintText.setText('1 бесплатное вращение в день');
      this.spinBtn.container.setAlpha(1);
    } else {
      this.spinBtn.label.setText(`Крутить за ${ECONOMY.wheelExtraSpinCoins} 🪙`);
      this.hintText.setText(`У тебя ${s.coins} монет`);
      this.spinBtn.container.setAlpha(s.coins >= ECONOMY.wheelExtraSpinCoins ? 1 : 0.5);
    }
  }

  private async onSpin() {
    if (this.spinning) return;
    const { api, ui } = getApp();
    const paid = !this.freeAvailable();

    this.spinning = true;
    const res = await api.spinWheel(paid);
    if (res.error) {
      ui.toast?.(res.error, '⚠️');
      this.spinning = false;
      return;
    }

    const seg = 360 / WHEEL_SECTORS.length;
    const center = res.sectorIndex * seg + seg / 2;
    // Сектор должен остановиться под указателем (наверху, -90°)
    const target = -(90 + center) - 360 * 4;

    this.tweens.add({
      targets: this.wheel,
      angle: { from: this.wheel.angle % 360, to: target },
      duration: 3400,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.spinning = false;
        this.showPrize(res.sectorIndex);
        this.refreshButton();
      },
    });
  }

  private showPrize(sectorIndex: number) {
    const sector = WHEEL_SECTORS[sectorIndex];
    const c = this.add.container(CX, CY).setDepth(20).setScale(0);
    const bg = roundRectImage(this, 0, 0, 264, 156, 22, UI_COLORS.cream, {
      stroke: 0xffc700,
      strokeWidth: 4,
    });
    const title = txt(this, 0, -42, sectorIndex === WHEEL_SECTORS.length - 1 ? '🎰 ДЖЕКПОТ!' : '🎉 Выигрыш!', {
      fontSize: '20px',
      fontStyle: '900',
      color: UI_COLORS.textBrown,
    }).setOrigin(0.5);
    const prize = txt(this, 0, -8, sector.label, {
      fontSize: '22px',
      fontStyle: '800',
      color: '#e30613',
    }).setOrigin(0.5);
    c.add([bg, title, prize]);

    const ok = chunkyButton(this, 0, 45, 144, 42, 'Забрать', 16, () => {
      if (sector.effect.couponRewardId) getApp().ui.toast?.('Купон добавлен в «Мои награды»', '🎟️');
      c.destroy();
    });
    ok.setColor(0x58b53c, 0x3d7f29);
    c.add(ok.container);

    this.tweens.add({ targets: c, scale: 1, duration: 300, ease: 'Back.easeOut' });
  }
}
