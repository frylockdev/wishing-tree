import type Phaser from 'phaser';

/** Логический размер игры (координаты сцен). */
export const DESIGN_W = 360;
export const DESIGN_H = 640;

/**
 * Буфер canvas = design × RENDER_SCALE, камера зумит его обратно в логические
 * 360×640. Спрайты в public/assets нарезаны тем же множителем (ASSET_SCALE в
 * scripts/process_art.py), поэтому пиксель текстуры ложится в пиксель буфера —
 * ни апскейла, ни пересэмплинга. Финальное сжатие до CSS-размера телефона
 * делает браузер, у него фильтрация лучше нашей.
 */
export const RENDER_SCALE = 3;

/** Камера показывает логические 360×640 на буфере большего размера. */
export function applyCameraHiDPI(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  cam.setZoom(RENDER_SCALE);
  cam.centerOn(DESIGN_W / 2, DESIGN_H / 2);
}

/** Множитель, приводящий текстуру к заданной логической высоте. */
export function scaleForHeight(scene: Phaser.Scene, key: string, logicalHeight: number): number {
  const src = scene.textures.get(key).getSourceImage();
  return src.height ? logicalHeight / src.height : 1;
}

/**
 * Задаёт картинке логическую высоту независимо от разрешения текстуры.
 * Возвращает применённый масштаб — он нужен как база для твинов.
 */
export function fitHeight(img: Phaser.GameObjects.Image, logicalHeight: number): number {
  const scale = img.frame.height ? logicalHeight / img.frame.height : 1;
  img.setScale(scale);
  return scale;
}
