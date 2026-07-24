import { getApp } from '../app';
import { REWARDS } from '../config/economy';
import { fruitIconHtml } from '../config/themes';
import type { Coupon, RewardDef } from '../config/types';
import { el, openModal, openPanel } from './overlay';
import { toast } from './toasts';

const KIND_ICON: Record<RewardDef['kind'], string> = {
  coupon: '🎟️',
  product: '🧺',
  points: '⭐',
  partner: '☕',
};

let activeTab: 'available' | 'history' = 'available';

export function openRewardsPanel(): void {
  openPanel('Мои награды', renderContent(), { tab: 'rewards' });
}

function renderContent(): HTMLElement {
  const { store, theme } = getApp();
  const state = store.state;
  const root = el(`
    <div>
      <div class="rewards-balance">
        <span>${fruitIconHtml(theme)} ${state.harvest.toLocaleString('ru-RU')}</span>
        <span class="task-meta">собрано ${theme.fruitName}</span>
      </div>
      <div class="tabs">
        <button class="tab ${activeTab === 'available' ? 'active' : ''}" data-tab="available">Доступные</button>
        <button class="tab ${activeTab === 'history' ? 'active' : ''}" data-tab="history">Полученные (${state.coupons.length})</button>
      </div>
      <div class="tab-content"></div>
    </div>
  `);

  root.querySelectorAll('.tab').forEach((b) =>
    b.addEventListener('click', () => {
      activeTab = (b as HTMLElement).dataset.tab as typeof activeTab;
      openRewardsPanel();
    }),
  );

  const content = root.querySelector('.tab-content')!;
  if (activeTab === 'available') {
    REWARDS.forEach((r) => content.appendChild(rewardCard(r)));
  } else if (state.coupons.length === 0) {
    content.appendChild(el(`<div class="empty">Пока нет наград.<br>Обменяй урожай на купоны!</div>`));
  } else {
    [...state.coupons].reverse().forEach((c) => content.appendChild(couponRow(c)));
  }
  return root;
}

function rewardCard(r: RewardDef): HTMLElement {
  const { store, theme } = getApp();
  const affordable = store.state.harvest >= r.costHarvest;
  const card = el(`
    <div class="card reward-card">
      <div class="reward-icon">${r.badge ? `<span class="reward-badge">${r.badge}</span>` : KIND_ICON[r.kind]}</div>
      <div class="task-info">
        <div class="task-title">${r.title}</div>
        <div class="task-meta">${r.subtitle}</div>
        <div class="reward-price">${fruitIconHtml(theme)} ${r.costHarvest.toLocaleString('ru-RU')}</div>
      </div>
      <button class="btn ${affordable ? 'primary' : 'ghost'}" ${affordable ? '' : 'disabled'}>Забрать</button>
    </div>
  `);
  card.querySelector('button')!.addEventListener('click', async () => {
    const res = await getApp().api.exchangeReward(r.id);
    if (res.error) {
      toast(res.error, '⚠️');
      return;
    }
    toast('Награда получена!', '🎉');
    if (res.coupon) openCouponModal(res.coupon);
    openRewardsPanel();
  });
  return card;
}

function couponRow(c: Coupon): HTMLElement {
  const { store } = getApp();
  const expired = store.state.day > c.expiresDay;
  const row = el(`
    <div class="card coupon-row ${expired ? 'claimed' : ''}">
      <div class="reward-icon">🎟️</div>
      <div class="task-info">
        <div class="task-title">${c.title}</div>
        <div class="task-meta">Код ${c.code} · ${expired ? 'истёк' : `до дня ${c.expiresDay}`}</div>
      </div>
      <button class="btn ghost">Показать</button>
    </div>
  `);
  row.querySelector('button')!.addEventListener('click', () => openCouponModal(c));
  return row;
}

export function openCouponModal(c: Coupon): void {
  const { theme, store } = getApp();
  const bars = Array.from({ length: 32 }, () => `<i style="width:${1 + Math.floor(Math.random() * 3)}px"></i>`).join('');
  const content = el(`
    <div class="coupon">
      <div class="coupon-brand" style="background:${theme.colors.primary}">${theme.name}</div>
      <div class="coupon-title">${c.title}</div>
      <div class="coupon-code">${c.code}</div>
      <div class="coupon-barcode">${bars}</div>
      <div class="coupon-expiry">Действует до дня ${c.expiresDay} (сегодня день ${store.state.day})</div>
      <div class="coupon-note">Покажи кассиру или введи код в приложении</div>
      <button class="btn primary big">Понятно</button>
    </div>
  `);
  const close = openModal(content);
  content.querySelector('button')!.addEventListener('click', close);
}
