import { getApp } from '../app';
import { el } from './overlay';
import { toast } from './toasts';

let panel: HTMLElement | null = null;

export function initDevPanel(root: HTMLElement): void {
  // Открытие: клавиша ` / ~ или тройной тап по верхней кромке экрана
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '~' || e.key === 'ё' || e.key === 'Ё') toggle(root);
  });

  const hotspot = el(`<div id="dev-hotspot"></div>`);
  let taps = 0;
  let timer: ReturnType<typeof setTimeout>;
  hotspot.addEventListener('pointerdown', () => {
    taps++;
    clearTimeout(timer);
    timer = setTimeout(() => (taps = 0), 1200);
    if (taps >= 3) {
      taps = 0;
      toggle(root);
    }
  });
  root.appendChild(hotspot);
}

function toggle(root: HTMLElement): void {
  if (panel) {
    panel.remove();
    panel = null;
    return;
  }
  panel = render();
  root.appendChild(panel);
}

function render(): HTMLElement {
  const { store, api } = getApp();
  const s = store.state;

  const p = el(`
    <div id="dev-panel">
      <div class="dev-title">⚙️ Дев-панель <span class="dev-time">День ${s.day}, ${String(s.hour).padStart(2, '0')}:00</span></div>
      <div class="dev-grid">
        <button data-act="drops">+100 💧</button>
        <button data-act="harvest">+500 🍐</button>
        <button data-act="coins">+100 🪙</button>
        <button data-act="day">Новый день ☀️</button>
        <button data-act="hours">+4 часа ⏰</button>
        <button data-act="reset" class="danger">Сбросить прогресс</button>
      </div>
    </div>
  `);

  p.querySelectorAll<HTMLButtonElement>('button').forEach((btn) =>
    btn.addEventListener('click', async () => {
      switch (btn.dataset.act) {
        case 'drops':
          await api.devGrant({ drops: 100 });
          toast('+100 капель', '💧');
          break;
        case 'harvest':
          await api.devGrant({ harvest: 500 });
          toast('+500 урожая', '🍐');
          break;
        case 'coins':
          await api.devGrant({ coins: 100 });
          toast('+100 монет', '🪙');
          break;
        case 'day':
          await api.devAdvance({ days: 1 });
          toast(`Наступил день ${store.state.day}`, '☀️');
          refresh();
          break;
        case 'hours':
          await api.devAdvance({ hours: 4 });
          toast('+4 часа', '⏰');
          refresh();
          break;
        case 'reset':
          if (confirm('Точно сбросить весь прогресс?')) {
            await api.resetProgress();
            location.reload();
          }
          break;
      }
    }),
  );
  return p;
}

function refresh(): void {
  if (!panel) return;
  const parent = panel.parentElement!;
  panel.remove();
  panel = render();
  parent.appendChild(panel);
}
