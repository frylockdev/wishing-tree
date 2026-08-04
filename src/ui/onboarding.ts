import { getApp } from '../app';
import type { FruitId } from '../config/types';
import { el, openModal } from './overlay';
import { toast } from './toasts';

const SLIDES = [
  {
    art: '<img class="onboarding-logo" src="assets/pk/logo.png" alt="Перекрёсток">',
    title: 'Сад Выгоды от Перекрёстка',
    text: 'Вырасти свою грушу рядом с Перекрёстком — а магазин поделится с тобой выгодой.',
  },
  {
    art: '<img class="onboarding-art" src="assets/common/drop.png" alt="">',
    title: 'Поливай каждый день',
    text: 'Капли воды — за вход в игру, задания, чеки и помощь друзьям. Каждый полив приближает урожай.',
  },
  {
    art: '<img class="onboarding-art" src="assets/common/chest.png" alt="">',
    title: 'Меняй урожай на награды',
    text: 'Собранные груши обменивай на купоны Перекрёстка, продукты и баллы лояльности.',
  },
];

export function startOnboarding(onDone: () => void): void {
  showSlide(0, onDone);
}

function showSlide(index: number, onDone: () => void): void {
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const content = el(`
    <div class="onboarding">
      <div class="onboarding-emoji">${slide.art}</div>
      <div class="onboarding-title">${slide.title}</div>
      <div class="onboarding-text">${slide.text}</div>
      <div class="onboarding-dots">${SLIDES.map((_, i) => `<i class="${i === index ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn primary big">${isLast ? 'Посадить саженец' : 'Дальше'}</button>
    </div>
  `);
  const close = openModal(content, { dismissable: false });
  content.querySelector('button')!.addEventListener('click', () => {
    close();
    if (isLast) openSaplingChooser(true, onDone);
    else showSlide(index + 1, onDone);
  });
}

/**
 * Посадка саженца: в онбординге и после сбора урожая.
 * Бренд один (Перекрёсток), поэтому дерево тоже одно — грушевое,
 * и экран стал подтверждением посадки вместо выбора из двух.
 */
export function openSaplingChooser(isOnboarding = false, onDone?: () => void): void {
  const { api, theme } = getApp();
  const content = el(`
    <div class="onboarding">
      <div class="onboarding-title">${isOnboarding ? 'Посади свой первый саженец' : 'Новый сезон — новый саженец!'}</div>
      <div class="sapling-row single">
        <div class="sapling-card static">
          <img class="sapling-art" src="assets/${theme.assetPrefix}/tree-5.png" alt="">
          <div class="task-title">${theme.treeName}</div>
          <div class="task-meta">Дерево «${theme.name}»</div>
        </div>
      </div>
      <button class="btn primary big" data-fruit="${theme.fruit}">Посадить</button>
    </div>
  `);
  const close = openModal(content, { dismissable: false });
  const btn = content.querySelector<HTMLButtonElement>('button[data-fruit]')!;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    await api.selectSapling(btn.dataset.fruit as FruitId);
    if (isOnboarding) await api.completeOnboarding();
    close();
    toast(isOnboarding ? 'Саженец посажен — полей его!' : 'Новый сезон начался!', '🌱');
    onDone?.();
  });
}
