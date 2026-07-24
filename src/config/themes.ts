import type { BrandId, FruitId } from './types';

export interface BrandTheme {
  id: BrandId;
  name: string;
  fruit: FruitId;
  fruitName: string;
  fruitEmoji: string;
  treeName: string;
  mascot: string;
  colors: {
    primary: string;
    primaryDark: string;
    accent: string;
    sky: string;
  };
  assetPrefix: string;
}

export const THEMES: Record<BrandId, BrandTheme> = {
  pyaterochka: {
    id: 'pyaterochka',
    name: 'Пятёрочка',
    fruit: 'apple',
    fruitName: 'яблоки',
    fruitEmoji: '🍎',
    treeName: 'Яблоня',
    mascot: 'Ёжик-садовник',
    colors: {
      primary: '#e30613',
      primaryDark: '#a50410',
      accent: '#ffc700',
      sky: '#8fd3f0',
    },
    assetPrefix: 'py',
  },
  perekrestok: {
    id: 'perekrestok',
    name: 'Перекрёсток',
    fruit: 'pear',
    fruitName: 'груши',
    fruitEmoji: '🍐',
    treeName: 'Груша',
    mascot: 'Фруктовые друзья',
    colors: {
      primary: '#009b3a',
      primaryDark: '#00702a',
      accent: '#ffd23f',
      sky: '#9fe0f7',
    },
    assetPrefix: 'pk',
  },
};

export function applyThemeCss(brand: BrandId): void {
  const t = THEMES[brand];
  const root = document.documentElement;
  root.style.setProperty('--primary', t.colors.primary);
  root.style.setProperty('--primary-dark', t.colors.primaryDark);
  root.style.setProperty('--accent', t.colors.accent);
  const bg = document.getElementById('garden-bg') as HTMLImageElement | null;
  if (bg) bg.src = `assets/${t.assetPrefix}/bg.png`;
}
