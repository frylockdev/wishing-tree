import { getApp } from '../app';
import { ECONOMY } from '../config/economy';
import type { Friend, TreeStage } from '../config/types';
import { el, openPanel } from './overlay';
import { toast } from './toasts';

const STAGE_LABEL: Record<TreeStage, string> = {
  1: 'Росток',
  2: 'Саженец',
  3: 'Молодое дерево',
  4: 'Цветущее',
  5: 'Плодоносящее',
};

const STAGE_EMOJI: Record<TreeStage, string> = {
  1: '🌱',
  2: '🌿',
  3: '🌳',
  4: '🌸',
  5: '🍎',
};

export function openFriendsPanel(): void {
  openPanel('Друзья', renderContent(), { tab: 'friends' });
}

function renderContent(): HTMLElement {
  const { store } = getApp();
  const state = store.state;
  const root = el(`<div></div>`);

  // Приглашение
  const invited = state.inviteClaimedDay >= state.day;
  const invite = el(`
    <div class="card invite-card">
      <div>
        <div class="task-title">Пригласить друга</div>
        <div class="task-meta">+${ECONOMY.inviteReward} 💧 когда друг вырастит саженец</div>
      </div>
      <button class="btn primary" ${invited ? 'disabled' : ''}>${invited ? 'Отправлено' : 'Пригласить'}</button>
    </div>
  `);
  invite.querySelector('button')!.addEventListener('click', async () => {
    const res = await getApp().api.inviteFriend();
    if (res.error) toast(res.error, '⚠️');
    else toast(`Приглашение отправлено! +${ECONOMY.inviteReward} 💧 (мок: друг уже вырос)`, '💌');
    openFriendsPanel();
  });
  root.appendChild(invite);

  // Список друзей
  const helpsLeft = ECONOMY.helpLimit - state.helpsToday;
  const list = el(`
    <div class="section">
      <div class="section-title">Помощь поливом · осталось ${helpsLeft}/${ECONOMY.helpLimit}</div>
    </div>
  `);
  state.friends.forEach((f) => list.appendChild(friendCard(f)));
  root.appendChild(list);

  // Рейтинг недели
  const sorted = [...state.friends].sort((a, b) => b.weeklyPoints - a.weeklyPoints).slice(0, 3);
  const podium = el(`
    <div class="section">
      <div class="section-title">Рейтинг недели</div>
      <div class="podium">
        ${podiumSpot(sorted[1], 2)}
        ${podiumSpot(sorted[0], 1)}
        ${podiumSpot(sorted[2], 3)}
      </div>
    </div>
  `);
  root.appendChild(podium);

  return root;
}

function podiumSpot(f: Friend | undefined, place: number): string {
  if (!f) return '';
  const medals = ['🥇', '🥈', '🥉'];
  return `
    <div class="podium-spot place-${place}">
      <div class="podium-medal">${medals[place - 1]}</div>
      <div class="podium-avatar">${f.avatar}</div>
      <div class="podium-name">${f.name}</div>
      <div class="podium-points">💧 ${f.weeklyPoints.toLocaleString('ru-RU')}</div>
      <div class="podium-base">${place}</div>
    </div>
  `;
}

function friendCard(f: Friend): HTMLElement {
  const card = el(`
    <div class="card friend-card">
      <div class="friend-avatar">${f.avatar}</div>
      <div class="friend-info">
        <div class="task-title">${f.name}</div>
        <div class="task-meta">${f.lastSeen}</div>
        <div class="bar"><div class="bar-fill" style="width:${f.progressPct}%"></div></div>
      </div>
      <div class="friend-stage">${STAGE_EMOJI[f.stage]}<div class="task-meta">${STAGE_LABEL[f.stage]}</div></div>
      <div class="friend-action"></div>
    </div>
  `);
  const slot = card.querySelector('.friend-action')!;
  if (f.helpedToday) {
    slot.appendChild(el(`<div class="chip done">✓</div>`));
  } else {
    const btn = el<HTMLButtonElement>(`<button class="btn help">💧 Помочь</button>`);
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const res = await getApp().api.helpFriend(f.id);
      if (res.error) toast(res.error, '⚠️');
      else toast(`Ты помог(ла) ${f.name}: +${ECONOMY.helpReward} 💧`, '🤝');
      openFriendsPanel();
    });
    slot.appendChild(btn);
  }
  return card;
}
