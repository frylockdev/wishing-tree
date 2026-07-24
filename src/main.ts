import Phaser from 'phaser';
import './style.css';

class StubScene extends Phaser.Scene {
  create() {
    this.add
      .text(180, 320, 'Сад Выгоды', { fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 360,
  height: 640,
  backgroundColor: '#87ceeb',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [StubScene],
});
