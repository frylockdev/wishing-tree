import { el, closePanel } from './overlay';
import { openTasksPanel } from './tasks';
import { openRewardsPanel } from './rewards';
import { openFriendsPanel } from './friends';
import { openAlbumPanel } from './album';

const TABS = [
  { id: 'garden', icon: '🌳', label: 'Сад' },
  { id: 'tasks', icon: '📋', label: 'Задания' },
  { id: 'rewards', icon: '🎁', label: 'Награды' },
  { id: 'friends', icon: '👥', label: 'Друзья' },
  { id: 'album', icon: '📖', label: 'Альбом' },
] as const;

export function initNav(root: HTMLElement): void {
  const nav = el(`<nav id="nav"></nav>`);
  TABS.forEach((tab) => {
    const btn = el<HTMLButtonElement>(`
      <button data-tab="${tab.id}" class="${tab.id === 'garden' ? 'active' : ''}">
        <span class="nav-icon">${tab.icon}</span>
        <span class="nav-label">${tab.label}</span>
      </button>
    `);
    btn.addEventListener('click', () => {
      switch (tab.id) {
        case 'garden':
          closePanel();
          break;
        case 'tasks':
          openTasksPanel();
          break;
        case 'rewards':
          openRewardsPanel();
          break;
        case 'friends':
          openFriendsPanel();
          break;
        case 'album':
          openAlbumPanel();
          break;
      }
    });
    nav.appendChild(btn);
  });
  root.appendChild(nav);
}
