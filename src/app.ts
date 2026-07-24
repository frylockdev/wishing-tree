import type { ApiClient } from './api/ApiClient';
import { MockApiClient, loadSave } from './api/MockApiClient';
import { initialState } from './api/logic';
import { THEMES, type BrandTheme } from './config/themes';
import type { BrandId } from './config/types';
import { Store } from './state/store';

/** Колбэки HTML-оверлеев, доступные Phaser-сценам без циклических импортов */
export interface UiHooks {
  openSaplingChooser?: () => void;
  openWheel?: () => void;
  toast?: (text: string, icon?: string) => void;
}

export interface App {
  store: Store;
  api: ApiClient;
  ui: UiHooks;
  theme: BrandTheme;
}

let app: App | null = null;

export function initApp(defaultBrand: BrandId = 'pyaterochka'): App {
  const saved = loadSave();
  const store = new Store(saved ?? initialState(defaultBrand, Math.random));
  const api = new MockApiClient(store);
  app = {
    store,
    api,
    ui: {},
    get theme() {
      return THEMES[store.state.brand];
    },
  };
  return app;
}

export function getApp(): App {
  if (!app) throw new Error('App is not initialized');
  return app;
}
