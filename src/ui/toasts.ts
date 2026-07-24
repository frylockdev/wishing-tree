let container: HTMLElement | null = null;

export function initToasts(root: HTMLElement): void {
  container = document.createElement('div');
  container.id = 'toasts';
  root.appendChild(container);
}

export function toast(text: string, icon = '✨'): void {
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${text}</span>`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2200);
}
