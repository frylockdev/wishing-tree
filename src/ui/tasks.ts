import { getApp } from '../app';
import { DAILY_TASKS, WEEKLY_TASKS } from '../config/economy';
import type { TaskDef } from '../config/types';
import { closePanel, el, openModal, openPanel } from './overlay';
import { openFriendsPanel } from './friends';
import { toast } from './toasts';

export function openTasksPanel(): void {
  openPanel('Задания', renderContent(), { tab: 'tasks' });
}

function renderContent(): HTMLElement {
  const root = el(`<div></div>`);
  root.appendChild(section('Ежедневные', DAILY_TASKS));
  root.appendChild(section('Еженедельные', WEEKLY_TASKS));
  return root;
}

function rerender(): void {
  openTasksPanel();
}

function section(title: string, defs: TaskDef[]): HTMLElement {
  const s = el(`<div class="section"><div class="section-title">${title}</div></div>`);
  defs.forEach((def) => s.appendChild(taskCard(def)));
  return s;
}

function taskCard(def: TaskDef): HTMLElement {
  const { store } = getApp();
  const ts = store.state.tasks.find((t) => t.id === def.id)!;
  const done = ts.progress >= def.goal;
  const pct = Math.round((ts.progress / def.goal) * 100);
  const reward = def.rewardFertilizer ? '⚡ ×2' : `+${def.rewardDrops} 💧`;

  const card = el(`
    <div class="card task-card ${ts.claimed ? 'claimed' : ''}">
      <div class="task-info">
        <div class="task-title">${def.title}</div>
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="task-meta">${ts.progress}/${def.goal} · ${reward}</div>
      </div>
      <div class="task-action"></div>
    </div>
  `);

  const slot = card.querySelector('.task-action')!;
  if (ts.claimed) {
    slot.appendChild(el(`<div class="chip done">✓</div>`));
  } else if (done) {
    const btn = el<HTMLButtonElement>(`<button class="btn accent">Забрать</button>`);
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const res = await getApp().api.claimTask(def.id);
      if (res.error) toast(res.error, '⚠️');
      else toast(`Награда получена: ${reward}`);
      rerender();
    });
    slot.appendChild(btn);
  } else {
    const btn = el<HTMLButtonElement>(`<button class="btn ghost">${actionLabel(def)}</button>`);
    btn.addEventListener('click', () => onAction(def, btn));
    slot.appendChild(btn);
  }
  return card;
}

function actionLabel(def: TaskDef): string {
  if (def.action === 'water') return 'К дереву';
  return def.actionLabel ?? 'Выполнить';
}

async function onAction(def: TaskDef, btn: HTMLButtonElement): Promise<void> {
  const { api } = getApp();
  switch (def.action) {
    case 'water':
      closePanel();
      break;
    case 'help':
      openFriendsPanel();
      break;
    case 'receipt':
      openReceiptModal(rerender);
      break;
    case 'mock': {
      btn.disabled = true;
      await api.progressTask(def.id);
      toast('Готово! Прогресс засчитан', '✅');
      rerender();
      break;
    }
  }
}

/** Мок-экран сканирования чека */
export function openReceiptModal(onDone?: () => void): void {
  const { api, theme } = getApp();
  const content = el(`
    <div class="receipt">
      <div class="receipt-title">Сканирование чека</div>
      <div class="receipt-paper">
        <div class="receipt-store">${theme.name}</div>
        <div class="receipt-scan-zone"><div class="receipt-laser"></div>📄</div>
        <div class="receipt-hint">Наведи камеру на QR-код чека</div>
      </div>
      <button class="btn primary big">Отсканировать (мок)</button>
      <div class="receipt-result"></div>
    </div>
  `);
  const close = openModal(content);
  const btn = content.querySelector<HTMLButtonElement>('button')!;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const res = await api.scanReceipt();
    if (res.error) {
      toast(res.error, '⚠️');
      close();
      return;
    }
    const result = content.querySelector('.receipt-result')!;
    result.innerHTML = `
      <div class="receipt-amount">Чек на ${res.amountRub.toLocaleString('ru-RU')} ₽</div>
      <div class="receipt-drops">+${res.drops} 💧</div>
    `;
    toast(`Чек принят: +${res.drops} капель`, '🧾');
    setTimeout(() => {
      close();
      onDone?.();
    }, 1600);
  });
}
