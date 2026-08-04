import { getApp } from '../app';
import { el, openPanel } from './overlay';

export function openAlbumPanel(): void {
  const { store } = getApp();
  const album = store.state.album;
  const root = el(`<div></div>`);

  if (album.length === 0) {
    root.appendChild(
      el(`<div class="empty">🌱<br>Здесь появятся выращенные деревья.<br>Вырасти первое дерево до урожая!</div>`),
    );
  } else {
    const grid = el(`<div class="album-grid"></div>`);
    album.forEach((entry) => {
      grid.appendChild(
        el(`
          <div class="album-card">
            <img class="album-art" src="assets/pk/tree-5.png" alt="">
            <div class="task-title">Сезон ${entry.season}</div>
            <div class="task-meta">Урожай: ${entry.harvestedAmount.toLocaleString('ru-RU')}</div>
            <div class="task-meta">День ${entry.day}</div>
          </div>
        `),
      );
    });
    root.appendChild(grid);
  }
  openPanel('Альбом сада', root, { tab: 'album' });
}
