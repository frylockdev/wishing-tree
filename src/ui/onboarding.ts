import { getApp } from '../app';
import type { FruitId } from '../config/types';
import { el, openModal } from './overlay';
import { toast } from './toasts';

const SLIDES = [
  {
    emoji: '🌳',
    title: 'Добро пожаловать в Сад Выгоды!',
    text: 'Вырасти своё фруктовое дерево рядом с любимым магазином — а магазин поделится с тобой выгодой.',
  },
  {
    emoji: '💧',
    title: 'Поливай каждый день',
    text: 'Капли воды — за вход в игру, задания, чеки и помощь друзьям. Каждый полив приближает урожай.',
  },
  {
    emoji: '🎁',
    title: 'Меняй урожай на награды',
    text: 'Собранные фрукты обменивай на реальные купоны, продукты и баллы лояльности.',
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
      <div class="onboarding-emoji">${slide.emoji}</div>
      <div class="onboarding-title">${slide.title}</div>
      <div class="onboarding-text">${slide.text}</div>
      <div class="onboarding-dots">${SLIDES.map((_, i) => `<i class="${i === index ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn primary big">${isLast ? 'Выбрать саженец' : 'Дальше'}</button>
    </div>
  `);
  const close = openModal(content, { dismissable: false });
  content.querySelector('button')!.addEventListener('click', () => {
    close();
    if (isLast) openSaplingChooser(true, onDone);
    else showSlide(index + 1, onDone);
  });
}

/** Выбор саженца: в онбординге и после сбора урожая */
export function openSaplingChooser(isOnboarding = false, onDone?: () => void): void {
  const { api } = getApp();
  const content = el(`
    <div class="onboarding">
      <div class="onboarding-title">${isOnboarding ? 'Выбери свой первый саженец' : 'Новый сезон — новый саженец!'}</div>
      <div class="sapling-row">
        <button class="sapling-card" data-fruit="apple">
          <div class="sapling-emoji">🍎</div>
          <div class="task-title">Яблоня</div>
        </button>
        <button class="sapling-card" data-fruit="pear">
          <div class="sapling-emoji">🍐</div>
          <div class="task-title">Груша</div>
        </button>
      </div>
    </div>
  `);
  const close = openModal(content, { dismissable: false });
  content.querySelectorAll<HTMLButtonElement>('.sapling-card').forEach((btn) =>
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await api.selectSapling(btn.dataset.fruit as FruitId);
      if (isOnboarding) await api.completeOnboarding();
      close();
      toast(isOnboarding ? 'Саженец посажен — полей его!' : 'Новый сезон начался!', '🌱');
      onDone?.();
    }),
  );
}
