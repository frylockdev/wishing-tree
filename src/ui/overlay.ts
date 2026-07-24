/** Каркас HTML-оверлеев: одна активная панель поверх канваса */

let panelRoot: HTMLElement | null = null;
let onCloseCb: (() => void) | null = null;

export function initOverlay(root: HTMLElement): void {
  panelRoot = document.createElement('div');
  panelRoot.id = 'panel-root';
  root.appendChild(panelRoot);
}

export function el<T extends HTMLElement = HTMLElement>(html: string): T {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild as T;
}

export function closePanel(): void {
  if (!panelRoot) return;
  panelRoot.innerHTML = '';
  panelRoot.classList.remove('open');
  onCloseCb?.();
  onCloseCb = null;
  document.querySelectorAll('#nav button').forEach((b) => b.classList.remove('active'));
  document.querySelector('#nav button[data-tab="garden"]')?.classList.add('active');
}

export function openPanel(title: string, content: HTMLElement, opts?: { onClose?: () => void; tab?: string }): void {
  if (!panelRoot) return;
  closePanel();
  onCloseCb = opts?.onClose ?? null;

  const panel = el(`
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">${title}</div>
        <button class="panel-close" aria-label="Закрыть">✕</button>
      </div>
      <div class="panel-body"></div>
    </div>
  `);
  panel.querySelector('.panel-body')!.appendChild(content);
  panel.querySelector('.panel-close')!.addEventListener('click', closePanel);
  panelRoot.appendChild(panel);
  panelRoot.classList.add('open');

  if (opts?.tab) {
    document.querySelectorAll('#nav button').forEach((b) => b.classList.remove('active'));
    document.querySelector(`#nav button[data-tab="${opts.tab}"]`)?.classList.add('active');
  }
}

/** Модалка поверх всего (купон, выигрыш колеса, выбор саженца) */
export function openModal(content: HTMLElement, opts?: { dismissable?: boolean }): () => void {
  const backdrop = el(`<div class="modal-backdrop"></div>`);
  const box = el(`<div class="modal-box"></div>`);
  box.appendChild(content);
  backdrop.appendChild(box);
  document.getElementById('ui-root')!.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('show'));
  const close = () => {
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.remove(), 250);
  };
  if (opts?.dismissable !== false) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
  }
  return close;
}
