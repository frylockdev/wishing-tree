import Phaser from 'phaser';
import { getApp } from '../app';
import { ECONOMY, WHEEL_SECTORS } from '../config/economy';

const CX = 180;
const CY = 290;
const R = 132;

export class WheelScene extends Phaser.Scene {
  private wheel!: Phaser.GameObjects.Container;
  private spinBtnBg!: Phaser.GameObjects.Rectangle;
  private spinBtnText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private spinning = false;

  constructor() {
    super('Wheel');
  }

  create() {
    const backdrop = this.add.rectangle(180, 320, 360, 640, 0x000000, 0.65).setInteractive();
    backdrop.on('pointerdown', () => {
      if (!this.spinning) this.scene.stop();
    });

    this.add
      .text(CX, 80, '🎡 Колесо удачи', { fontSize: '24px', fontStyle: 'bold', fontFamily: 'Trebuchet MS, Arial, sans-serif', color: '#ffffff' })
      .setOrigin(0.5);

    this.buildWheel();

    // Указатель
    this.add.triangle(CX, CY - R - 6, 0, 0, 24, 0, 12, 26, 0xffc700).setOrigin(0.5, 0).setDepth(5);

    // Кнопка вращения
    const btn = this.add.container(CX, 500);
    this.spinBtnBg = this.add.rectangle(0, 0, 220, 52, 0xffc700).setStrokeStyle(3, 0xffffff);
    this.spinBtnBg.setInteractive({ useHandCursor: true });
    this.spinBtnText = this.add
      .text(0, 0, '', { fontSize: '18px', fontStyle: 'bold', fontFamily: 'Trebuchet MS, Arial, sans-serif', color: '#3a2c1a' })
      .setOrigin(0.5);
    btn.add([this.spinBtnBg, this.spinBtnText]);
    this.spinBtnBg.on('pointerdown', () => this.onSpin());

    this.hintText = this.add
      .text(CX, 540, '', { fontSize: '13px', fontFamily: 'Trebuchet MS, Arial, sans-serif', color: '#ffffffcc' })
      .setOrigin(0.5);

    const closeBtn = this.add
      .text(336, 24, '✕', { fontSize: '24px', fontStyle: 'bold', fontFamily: 'Trebuchet MS, Arial, sans-serif', color: '#ffffff' })
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
      const label = this.add
        .text(Math.cos(mid) * (R - 42), Math.sin(mid) * (R - 42), sector.short, {
          fontSize: '15px',
          fontStyle: 'bold', fontFamily: 'Trebuchet MS, Arial, sans-serif',
          color: '#ffffff',
          stroke: '#00000055',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setAngle(i * seg + seg / 2 + 90);
      this.wheel.add(label);
    });

    const hub = this.add.text(0, 0, '🎯', { fontSize: '20px' }).setOrigin(0.5);
    this.wheel.add(hub);
  }

  private freeAvailable(): boolean {
    const s = getApp().store.state;
    return s.wheelFreeSpinDay < s.day;
  }

  private refreshButton() {
    const s = getApp().store.state;
    if (this.freeAvailable()) {
      this.spinBtnText.setText('Крутить бесплатно!');
      this.hintText.setText('1 бесплатное вращение в день');
      this.spinBtnBg.setAlpha(1);
    } else {
      this.spinBtnText.setText(`Крутить за ${ECONOMY.wheelExtraSpinCoins} 🪙`);
      this.hintText.setText(`У тебя ${s.coins} монет`);
      this.spinBtnBg.setAlpha(s.coins >= ECONOMY.wheelExtraSpinCoins ? 1 : 0.5);
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
    const bg = this.add.rectangle(0, 0, 260, 150, 0xffffff).setStrokeStyle(4, 0xffc700);
    const title = this.add
      .text(0, -40, sectorIndex === WHEEL_SECTORS.length - 1 ? '🎰 ДЖЕКПОТ!' : '🎉 Выигрыш!', {
        fontSize: '20px',
        fontStyle: 'bold', fontFamily: 'Trebuchet MS, Arial, sans-serif',
        color: '#3a2c1a',
      })
      .setOrigin(0.5);
    const prize = this.add
      .text(0, -5, sector.label, { fontSize: '22px', fontStyle: 'bold', fontFamily: 'Trebuchet MS, Arial, sans-serif', color: '#e30613' })
      .setOrigin(0.5);
    const ok = this.add.rectangle(0, 45, 140, 40, 0x58b53c).setInteractive({ useHandCursor: true });
    const okText = this.add
      .text(0, 45, 'Забрать', { fontSize: '16px', fontStyle: 'bold', fontFamily: 'Trebuchet MS, Arial, sans-serif', color: '#ffffff' })
      .setOrigin(0.5);
    c.add([bg, title, prize, ok, okText]);

    this.tweens.add({ targets: c, scale: 1, duration: 300, ease: 'Back.easeOut' });
    ok.on('pointerdown', () => {
      if (sector.effect.couponRewardId) getApp().ui.toast?.('Купон добавлен в «Мои награды»', '🎟️');
      c.destroy();
    });
  }
}
