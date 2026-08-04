import { ECONOMY, WHEEL_SECTORS } from '../config/economy';
import { THEME, THEMES } from '../config/themes';
import type { BrandId, Coupon, FruitId, GameState } from '../config/types';
import type { Store } from '../state/store';
import type { ApiClient } from './ApiClient';
import {
  applyClaimTask,
  applyDailyBonus,
  applyExchange,
  applyHarvest,
  applyHelpFriend,
  applyInvite,
  applyNewDay,
  applyOpenChest,
  applyProgressTask,
  applyScanReceipt,
  applyWater,
  applyWheelResult,
  initialState,
  rollWheel,
} from './logic';

const SAVE_KEY = 'sad-vygody-save-v1';

/**
 * Приводит сейв старой двухбрендовой версии к текущей одобрендовой.
 * До ребрендинга в сейве мог лежать brand:'pyaterochka' и fruit:'apple';
 * этих ключей в THEMES/ассетах больше нет, и без миграции игра падала бы
 * на THEMES[brand].colors у всех, кто уже играл.
 */
export function migrate(state: GameState): GameState {
  if (!(state.brand in THEMES)) state.brand = THEME.id;
  if (state.tree && state.tree.fruit !== THEME.fruit) state.tree.fruit = THEME.fruit;
  if (Array.isArray(state.album)) {
    for (const entry of state.album) entry.fruit = THEME.fruit;
  }
  return state;
}

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? migrate(JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

/** Имитация сетевой задержки реального бэкенда */
function delay(): Promise<void> {
  return new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
}

export class MockApiClient implements ApiClient {
  constructor(private store: Store) {}

  private persist(): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.store.state));
  }

  private commit(next: GameState): void {
    this.store.set(next);
    this.persist();
  }

  async getState(): Promise<GameState> {
    await delay();
    return this.store.state;
  }

  async selectSapling(fruit: FruitId): Promise<GameState> {
    await delay();
    const state = structuredClone(this.store.state);
    state.tree.fruit = fruit;
    this.commit(state);
    return state;
  }

  async completeOnboarding(): Promise<GameState> {
    await delay();
    const state = structuredClone(this.store.state);
    state.onboardingDone = true;
    this.commit(state);
    return state;
  }

  async water() {
    await delay();
    const res = applyWater(this.store.state, ECONOMY, Math.random);
    if (!res.error) {
      this.commit(res.state);
      if (res.stageUp) this.store.emit('tree:stage', res.stageUp);
      if (res.harvestReady) this.store.emit('tree:harvest-ready', undefined);
    }
    return res;
  }

  async harvest() {
    await delay();
    const res = applyHarvest(this.store.state, ECONOMY, Math.random);
    if (!res.error) this.commit(res.state);
    return res;
  }

  async claimDailyBonus() {
    await delay();
    const res = applyDailyBonus(this.store.state, ECONOMY);
    if (!res.error) this.commit(res.state);
    return res;
  }

  async claimTask(taskId: string) {
    await delay();
    const res = applyClaimTask(this.store.state, ECONOMY, taskId);
    if (!res.error) this.commit(res.state);
    return res;
  }

  async progressTask(taskId: string, inc = 1): Promise<GameState> {
    await delay();
    const state = applyProgressTask(this.store.state, taskId, inc);
    this.commit(state);
    return state;
  }

  async spinWheel(paid: boolean) {
    await delay();
    const sectorIndex = rollWheel(Math.random);
    const res = applyWheelResult(this.store.state, ECONOMY, WHEEL_SECTORS[sectorIndex], paid, Math.random);
    if (!res.error) this.commit(res.state);
    return { ...res, sectorIndex };
  }

  async exchangeReward(rewardId: string): Promise<{ state: GameState; coupon?: Coupon; error?: string }> {
    await delay();
    const res = applyExchange(this.store.state, rewardId, Math.random);
    if (!res.error) this.commit(res.state);
    return res;
  }

  async helpFriend(friendId: string) {
    await delay();
    const res = applyHelpFriend(this.store.state, ECONOMY, friendId);
    if (!res.error) this.commit(res.state);
    return res;
  }

  async inviteFriend() {
    await delay();
    const res = applyInvite(this.store.state, ECONOMY);
    if (!res.error) this.commit(res.state);
    return res;
  }

  async scanReceipt() {
    await delay();
    const res = applyScanReceipt(this.store.state, ECONOMY, Math.random);
    if (!res.error) this.commit(res.state);
    return res;
  }

  async openChest() {
    await delay();
    const res = applyOpenChest(this.store.state, ECONOMY, Math.random);
    if (!res.error) this.commit(res.state);
    return res;
  }

  async setBrand(brand: BrandId): Promise<GameState> {
    const state = structuredClone(this.store.state);
    state.brand = brand;
    // Незасеянное дерево меняет фрукт вместе с брендом
    if (state.tree.growthPoints === 0) state.tree.fruit = THEMES[brand].fruit;
    this.commit(state);
    this.store.emit('brand:changed', state);
    return state;
  }

  async devGrant(patch: { drops?: number; harvest?: number; coins?: number }): Promise<GameState> {
    const state = structuredClone(this.store.state);
    if (patch.drops) state.drops = Math.min(state.drops + patch.drops, ECONOMY.dropsCap);
    if (patch.harvest) state.harvest += patch.harvest;
    if (patch.coins) state.coins += patch.coins;
    this.commit(state);
    return state;
  }

  async devAdvance(opts: { days?: number; hours?: number }): Promise<GameState> {
    let state = structuredClone(this.store.state);
    if (opts.hours) {
      let h = state.hour + opts.hours;
      while (h >= 24) {
        h -= 24;
        state = applyNewDay(state, 1);
      }
      state.hour = h;
    }
    if (opts.days) state = applyNewDay(state, opts.days);
    this.commit(state);
    this.store.emit('day:changed', state.day);
    return state;
  }

  async resetProgress(): Promise<GameState> {
    const brand = this.store.state.brand;
    localStorage.removeItem(SAVE_KEY);
    const state = initialState(brand, Math.random);
    this.commit(state);
    this.store.emit('brand:changed', state);
    return state;
  }
}