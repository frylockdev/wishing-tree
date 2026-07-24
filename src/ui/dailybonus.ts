import { getApp } from '../app';
import { ECONOMY } from '../config/economy';
import { el, openModal } from './overlay';
import { toast } from './toasts';

export function maybeShowDailyBonus(): void {
  const { store } = getApp();
  const s = store.state;
  if (!s.onboardingDone || s.dailyBonusClaimedDay >= s.day) return;

  const streakBonus = Math.min((s.streak - 1) * ECONOMY.streakBonusPerDay, ECONOMY.streakBonusMax);
  const isFertDay = s.streak % ECONOMY.streakFertilizerDay === 0;
  const total = ECONOMY.dailyLoginDrops + streakBonus + (isFertDay ? 100 : 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const dayNum = i + 1;
    const streakPos = ((s.streak - 1) % 7) + 1;
    const cls = dayNum < streakPos ? 'past' : dayNum === streakPos ? 'today' : '';
    return `<div class="streak-day ${cls}">${dayNum === 7 ? '⚡' : '💧'}<span>${dayNum}</span></div>`;
  }).join('');

  const content = el(`
    <div class="onboarding">
      <div class="onboarding-emoji">📅</div>
      <div class="onboarding-title">День ${s.day} · серия ${s.streak}</div>
      <div class="streak-row">${days}</div>
      <div class="onboarding-text">
        Ежедневный бонус: +${ECONOMY.dailyLoginDrops} 💧
        ${streakBonus ? `<br>Бонус серии: +${streakBonus} 💧` : ''}
        ${isFertDay ? '<br>⚡ Удобрение ×2 на день + 100 💧!' : ''}
      </div>
      <button class="btn accent big">Забрать +${total} 💧</button>
    </div>
  `);
  const close = openModal(content, { dismissable: false });
  content.querySelector('button')!.addEventListener('click', async () => {
    const res = await getApp().api.claimDailyBonus();
    close();
    if (res.error) toast(res.error, '⚠️');
    else toast(`+${res.drops} капель${res.fertilizer ? ' и удобрение ×2!' : ''}`, '💧');
  });
}
