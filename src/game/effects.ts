import Phaser from 'phaser';

/** Всплывающий текст (+10, +N капель и т.п.) */
export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#ffffff',
): void {
  const t = scene.add
    .text(x, y, text, {
      fontSize: '22px',
      fontStyle: 'bold',
      fontFamily: 'Trebuchet MS, Arial, sans-serif',
      color,
      stroke: '#00000055',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(100);
  scene.tweens.add({
    targets: t,
    y: y - 60,
    alpha: 0,
    duration: 900,
    ease: 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  });
}

/** Разлёт фруктов от дерева к точке-счётчику */
export function burstFruits(
  scene: Phaser.Scene,
  from: Phaser.Math.Vector2,
  to: Phaser.Math.Vector2,
  texture: string,
  count: number,
  onDone?: () => void,
): void {
  let landed = 0;
  for (let i = 0; i < count; i++) {
    const fruit = scene.add
      .image(from.x + Phaser.Math.Between(-60, 60), from.y + Phaser.Math.Between(-70, 20), texture)
      .setDepth(90)
      .setScale(1.2);
    const midX = fruit.x + Phaser.Math.Between(-40, 40);
    const midY = fruit.y - Phaser.Math.Between(30, 80);
    scene.tweens.chain({
      targets: fruit,
      tweens: [
        { x: midX, y: midY, scale: 1.4, duration: 250 + i * 40, ease: 'Quad.easeOut' },
        {
          x: to.x,
          y: to.y,
          scale: 0.5,
          alpha: 0.9,
          duration: 380,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            fruit.destroy();
            landed++;
            if (landed === count) onDone?.();
          },
        },
      ],
    });
  }
}

/** Кольцевая вспышка при смене стадии */
export function stageFlash(scene: Phaser.Scene, x: number, y: number, colorHex: string): void {
  const color = Phaser.Display.Color.HexStringToColor(colorHex).color;
  const ring = scene.add.circle(x, y, 20).setStrokeStyle(6, color, 0.9).setDepth(95);
  scene.tweens.add({
    targets: ring,
    radius: 130,
    alpha: 0,
    duration: 600,
    ease: 'Cubic.easeOut',
    onUpdate: () => ring.setStrokeStyle(6, color, ring.alpha * 0.9),
    onComplete: () => ring.destroy(),
  });
}
