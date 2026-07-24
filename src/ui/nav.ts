import { el, closePanel } from './overlay';
import { openTasksPanel } from './tasks';
import { openRewardsPanel } from './rewards';
import { openFriendsPanel } from './friends';
import { openAlbumPanel } from './album';

const TABS = [
  { id: 'garden', label: 'Сад' },
  { id: 'tasks', label: 'Задания' },
  { id: 'rewards', label: 'Награды' },
  { id: 'friends', label: 'Друзья' },
  { id: 'album', label: 'Альбом' },
] as const;

export function initNav(root: HTMLElement): void {
  const nav = el(`<nav id="nav"></nav>`);
  TABS.forEach((tab) => {
    const btn = el<HTMLButtonElement>(`
      <button data-tab="${tab.id}" class="${tab.id === 'garden' ? 'active' : ''}">
        <img class="nav-icon" src="assets/common/nav-${tab.id}.png" alt="${tab.label}">
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
