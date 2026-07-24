import type { BrandId, Coupon, FruitId, GameState, TreeStage } from '../config/types';

/**
 * Контракт будущего REST API. MVP использует MockApiClient;
 * при появлении бэкенда меняется только реализация.
 */
export interface ApiClient {
  getState(): Promise<GameState>;
  selectSapling(fruit: FruitId): Promise<GameState>;
  completeOnboarding(): Promise<GameState>;
  water(): Promise<{ state: GameState; stageUp?: TreeStage; harvestReady?: boolean; pointsGained: number; error?: string }>;
  harvest(): Promise<{ state: GameState; amount: number; error?: string }>;
  claimDailyBonus(): Promise<{ state: GameState; drops: number; fertilizer: boolean; error?: string }>;
  claimTask(taskId: string): Promise<{ state: GameState; error?: string }>;
  progressTask(taskId: string, inc?: number): Promise<GameState>;
  spinWheel(paid: boolean): Promise<{ state: GameState; sectorIndex: number; error?: string }>;
  exchangeReward(rewardId: string): Promise<{ state: GameState; coupon?: Coupon; error?: string }>;
  helpFriend(friendId: string): Promise<{ state: GameState; error?: string }>;
  inviteFriend(): Promise<{ state: GameState; error?: string }>;
  scanReceipt(): Promise<{ state: GameState; amountRub: number; drops: number; error?: string }>;
  openChest(): Promise<{ state: GameState; drops: number; error?: string }>;
  setBrand(brand: BrandId): Promise<GameState>;
  devGrant(patch: { drops?: number; harvest?: number; coins?: number }): Promise<GameState>;
  devAdvance(opts: { days?: number; hours?: number }): Promise<GameState>;
  resetProgress(): Promise<GameState>;
}
