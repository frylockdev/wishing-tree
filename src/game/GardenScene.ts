import Phaser from 'phaser';
import { getApp } from '../app';
import { ECONOMY } from '../config/economy';
import { chestAvailable, chestRemainingHours, stageProgressPct } from '../api/logic';
import type { GameState, TreeStage } from '../config/types';
import { burstFruits, floatText, stageFlash } from './effects';
import { FONT, UI_COLORS, chunkyButton, darken, roundRectTexture, type ChunkyButton } from './uikit';

const STAGE_NAMES: Record<TreeStage, string> = {
  1: 'Росток',
  2: 'Саженец',
  3: 'Молодое дерево',
  4: 'Цветущее дерево',
  5: 'Плодоносящее',
};

const TREE_X = 180;
const TREE_Y = 452;

export class GardenScene extends Phaser.Scene {
  private tree!: Phaser.GameObjects.Image;
  private dropsText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private harvestText!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Graphics;
  private progressPct!: Phaser.GameObjects.Text;
  private actionCost!: Phaser.GameObjects.Container;
  private actionBtn!: ChunkyButton;
  private chestTimer!: Phaser.GameObjects.Text;
  private chestIcon!: Phaser.GameObjects.Image;
  private wheelBadge!: Phaser.GameObjects.Container;
  private fertBadge!: Phaser.GameObjects.Text;
  private busy = false;

  constructor() {
    super('Garden');
  }

  create() {
    const { store, theme } = getApp();
    const p = theme.assetPrefix;

    const bg = this.add.image(0, 0, `${p}-bg`).setOrigin(0);
    bg.setDisplaySize(360, 640);

    this.tree = this.add
      .image(TREE_X, TREE_Y, `tree-${store.state.tree.fruit}-${store.state.tree.stage}`)
      .setOrigin(0.5, 1);

    this.buildHud();
    this.buildProgressPanel();
    this.buildActionButton();
    this.buildChest();
    this.buildWheelButton();

    const unsub = store.on('state:changed', () => this.refresh(store.state));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsub);
    this.refresh(store.state);
  }

  // ---------- UI строительство ----------

  private pill(x: number, y: number, icon: string): { text: Phaser.GameObjects.Text } {
    const key = roundRectTexture(this, 'ui-pill', 104, 32, 16, UI_COLORS.cream, {
      alpha: 0.95,
      stroke: UI_COLORS.creamBorder,
      strokeWidth: 2,
    });
    const c = this.add.container(x, y).setDepth(50);
    const bg = this.add.image(0, 0, key).setOrigin(0, 0);
    const iconImg = this.add.image(20, 17, icon).setScale(1.1);
    const text = this.add
      .text(36, 17, '0', {
        fontSize: '15px',
        fontStyle: '800',
        fontFamily: FONT,
        color: UI_COLORS.textBrown,
      })
      .setOrigin(0, 0.5);
    c.add([bg, iconImg, text]);
    return { text };
  }

  private buildHud() {
    this.dropsText = this.pill(10, 12, 'drop').text;
    this.coinsText = this.pill(10, 52, 'coin').text;
    const { theme } = getApp();
    this.harvestText = this.pill(246, 12, `fruit-${theme.fruit}`).text;

    this.fertBadge = this.add
      .text(350, 56, '⚡ Удобрение ×2', {
        fontSize: '12px',
        fontStyle: '800',
        fontFamily: FONT,
        color: '#2a7d16',
        backgroundColor: '#e8ffddee',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1, 0)
      .setDepth(50)
      .setVisible(false);
  }

  private buildProgressPanel() {
    const y = 480;
    const key = roundRectTexture(this, 'ui-panel', 304, 56, 18, UI_COLORS.cream, {
      alpha: 0.96,
      stroke: UI_COLORS.creamBorder,
      strokeWidth: 2,
    });
    const panel = this.add.container(180, y).setDepth(50);
    const bg = this.add.image(0, 0, key);
    this.stageText = this.add
      .text(0, -13, '', { fontSize: '15px', fontStyle: '800', fontFamily: FONT, color: UI_COLORS.textBrown })
      .setOrigin(0.5);
    const barBg = this.add.graphics();
    barBg.fillStyle(0xefe6d0, 1);
    barBg.fillRoundedRect(-136, 6, 230, 12, 6);
    this.progressFill = this.add.graphics();
    this.progressPct = this.add
      .text(136, 12, '0%', { fontSize: '12px', fontStyle: '800', fontFamily: FONT, color: UI_COLORS.textBrownSoft })
      .setOrigin(1, 0.5);
    panel.add([bg, this.stageText, barBg, this.progressFill, this.progressPct]);
  }

  private drawProgress(pct: number) {
    this.progressFill.clear();
    const w = (pct / 100) * 230;
    if (w > 2) {
      this.progressFill.fillStyle(0x58b53c, 1);
      this.progressFill.fillRoundedRect(-136, 6, w, 12, 6);
      // Блик сверху — «леденцовый» объём
      this.progressFill.fillStyle(0xffffff, 0.35);
      this.progressFill.fillRoundedRect(-134, 7, Math.max(2, w - 4), 4, 2);
    }
  }

  private buildActionButton() {
    const { theme } = getApp();
    this.actionBtn = chunkyButton(this, 180, 543, 176, 56, 'Полить', 22, () => this.onAction());
    this.actionBtn.container.setDepth(50);
    const primary = Phaser.Display.Color.HexStringToColor(theme.colors.primary).color;
    this.actionBtn.setColor(primary, darken(primary));

    this.actionCost = this.add.container(96, 0);
    const costBg = this.add.circle(0, 0, 18, 0xffffff).setStrokeStyle(2, UI_COLORS.creamBorder);
    const costIcon = this.add.image(0, -6, 'drop').setScale(0.7);
    const costText = this.add
      .text(0, 7, String(ECONOMY.waterCost), { fontSize: '11px', fontStyle: '800', fontFamily: FONT, color: '#2277bb' })
      .setOrigin(0.5);
    this.actionCost.add([costBg, costIcon, costText]);
    this.actionBtn.container.add(this.actionCost);
  }

  private cornerChip(text: string): Phaser.GameObjects.Text {
    return this.add
      .text(0, 26, text, {
        fontSize: '11px',
        fontStyle: '800',
        fontFamily: FONT,
        color: UI_COLORS.textBrown,
        backgroundColor: '#fffdf6ee',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);
  }

  private buildChest() {
    const c = this.add.container(42, 543).setDepth(50);
    this.chestIcon = this.add.image(0, -8, 'chest').setInteractive({ useHandCursor: true });
    this.chestTimer = this.cornerChip('');
    c.add([this.chestIcon, this.chestTimer]);
    this.chestIcon.on('pointerdown', () => this.onChest());
  }

  private buildWheelButton() {
    const c = this.add.container(318, 543).setDepth(50);
    const circle = this.add.circle(0, -8, 26, UI_COLORS.cream, 0.97).setStrokeStyle(3, 0xffc700);
    circle.setInteractive({ useHandCursor: true });
    const emoji = this.add.text(0, -8, '🎡', { fontSize: '26px' }).setOrigin(0.5);
    const label = this.cornerChip('Колесо');

    this.wheelBadge = this.add.container(18, -26);
    const badgeBg = this.add.circle(0, 0, 9, 0xe30613).setStrokeStyle(2, 0xffffff);
    const badgeText = this.add
      .text(0, 0, '1', { fontSize: '11px', fontStyle: '800', fontFamily: FONT, color: '#ffffff' })
      .setOrigin(0.5);
    this.wheelBadge.add([badgeBg, badgeText]);

    c.add([circle, emoji, label, this.wheelBadge]);
    circle.on('pointerdown', () => getApp().ui.openWheel?.());
  }

  // ---------- Действия ----------

  private async onAction() {
    if (this.busy) return;
    const { api, store, ui } = getApp();
    this.busy = true;
    try {
      if (store.state.tree.readyToHarvest) {
        const res = await api.harvest();
        if (res.error) {
          ui.toast?.(res.error, '⚠️');
          return;
        }
        const fruitTexture = `fruit-${store.state.tree.fruit}`;
        const target = new Phaser.Math.Vector2(320, 28);
        burstFruits(
          this,
          new Phaser.Math.Vector2(TREE_X, TREE_Y - 140),
          target,
          fruitTexture,
          10,
          () => {
            ui.toast?.(`Урожай собран: +${res.amount} 🎉`);
            ui.openSaplingChooser?.();
          },
        );
      } else {
        const res = await api.water();
        if (res.error) {
          ui.toast?.(res.error, '💧');
          return;
        }
        this.waterEffects(res.pointsGained, res.stageUp, res.harvestReady);
      }
    } finally {
      this.busy = false;
    }
  }

  private waterEffects(points: number, stageUp?: TreeStage, harvestReady?: boolean) {
    const { theme, ui } = getApp();
    const crownY = TREE_Y - this.tree.displayHeight * 0.65;

    const emitter = this.add.particles(TREE_X, crownY - 40, 'drop', {
      speedX: { min: -60, max: 60 },
      speedY: { min: 60, max: 160 },
      scale: { start: 0.9, end: 0.3 },
      alpha: { start: 1, end: 0.2 },
      lifespan: 550,
      quantity: 14,
      emitting: false,
    });
    emitter.setDepth(80);
    emitter.explode(14);
    this.time.delayedCall(700, () => emitter.destroy());

    this.tweens.add({
      targets: this.tree,
      scaleX: 1.06,
      scaleY: 0.96,
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    floatText(this, TREE_X, crownY - 30, `+${points}`, '#ffffff');

    if (stageUp) {
      stageFlash(this, TREE_X, TREE_Y - 100, theme.colors.accent);
      this.tweens.add({
        targets: this.tree,
        scale: { from: 0.85, to: 1 },
        duration: 380,
        ease: 'Back.easeOut',
      });
      ui.toast?.(`Новая стадия: ${STAGE_NAMES[stageUp]}!`, '🌱');
    }
    if (harvestReady) {
      ui.toast?.('Урожай созрел — собери его!', '🧺');
    }
  }

  private async onChest() {
    const { api, store, ui } = getApp();
    if (!chestAvailable(store.state, ECONOMY)) {
      ui.toast?.('Сундук ещё не готов', '⏳');
      return;
    }
    const res = await api.openChest();
    if (res.error) {
      ui.toast?.(res.error, '⚠️');
      return;
    }
    this.tweens.add({ targets: this.chestIcon, angle: { from: -8, to: 8 }, duration: 80, yoyo: true, repeat: 3 });
    floatText(this, 42, 500, `+${res.drops}`, '#4fc3f7');
  }

  // ---------- Отрисовка состояния ----------

  private refresh(state: GameState) {
    const { theme } = getApp();

    this.dropsText.setText(String(state.drops));
    this.coinsText.setText(String(state.coins));
    this.harvestText.setText(String(state.harvest));

    const key = `tree-${state.tree.fruit}-${state.tree.stage}`;
    if (this.tree.texture.key !== key) this.tree.setTexture(key);

    const pct = state.tree.readyToHarvest ? 100 : stageProgressPct(state, ECONOMY);
    this.stageText.setText(
      state.tree.readyToHarvest ? 'Урожай созрел!' : `${STAGE_NAMES[state.tree.stage]} · сезон ${state.tree.season}`,
    );
    this.drawProgress(pct);
    this.progressPct.setText(`${pct}%`);

    if (state.tree.readyToHarvest) {
      this.actionBtn.label.setText('Собрать');
      const accent = Phaser.Display.Color.HexStringToColor(theme.colors.accent).color;
      this.actionBtn.setColor(accent, darken(accent));
      this.actionBtn.label.setColor('#3a2c1a');
      this.actionCost.setVisible(false);
    } else {
      this.actionBtn.label.setText('Полить');
      const primary = Phaser.Display.Color.HexStringToColor(theme.colors.primary).color;
      this.actionBtn.setColor(primary, darken(primary));
      this.actionBtn.label.setColor('#ffffff');
      this.actionCost.setVisible(true);
    }

    const chestReady = chestAvailable(state, ECONOMY);
    this.chestTimer.setText(chestReady ? 'Открыть!' : `через ${chestRemainingHours(state, ECONOMY)} ч`);
    this.chestIcon.setAlpha(chestReady ? 1 : 0.6);

    this.wheelBadge.setVisible(state.wheelFreeSpinDay < state.day);
    this.fertBadge.setVisible(state.day < state.fertilizerActiveUntilDay);
  }
}
