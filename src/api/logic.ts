import { ALL_TASKS, COUPON_LIFETIME_DAYS, REWARDS, WHEEL_SECTORS } from '../config/economy';
import type { EconomyPreset } from '../config/economy';
import type {
  BrandId,
  Coupon,
  Friend,
  GameState,
  TaskDef,
  TreeStage,
  WheelSector,
} from '../config/types';
import { THEMES } from '../config/themes';

export type Rng = () => number;

const FRIEND_SEED: Array<Pick<Friend, 'name' | 'avatar'>> = [
  { name: 'Маша', avatar: '🐱' },
  { name: 'Сергей', avatar: '🐶' },
  { name: 'Катя', avatar: '🐰' },
  { name: 'Дима', avatar: '🐻' },
  { name: 'Аня', avatar: '🦝' },
];

export function makeFriends(rng: Rng): Friend[] {
  const lastSeen = ['онлайн', '2 ч назад', '1 ч назад', '5 ч назад', '1 д назад'];
  return FRIEND_SEED.map((f, i) => ({
    id: `f${i}`,
    ...f,
    stage: (Math.min(5, i + 1)) as TreeStage,
    progressPct: Math.round(5 + rng() * 90),
    lastSeen: lastSeen[i],
    weeklyPoints: Math.round(1000 + rng() * 12000),
    helpedToday: false,
  }));
}

export function initialState(brand: BrandId, rng: Rng): GameState {
  return {
    brand,
    onboardingDone: false,
    day: 1,
    hour: 9,
    drops: 60,
    coins: 0,
    harvest: 0,
    fertilizerActiveUntilDay: 0,
    tree: { fruit: THEMES[brand].fruit, growthPoints: 0, stage: 1, readyToHarvest: false, season: 1 },
    album: [],
    streak: 1,
    lastLoginDay: 1,
    dailyBonusClaimedDay: 0,
    tasks: ALL_TASKS.map((t) => ({ id: t.id, progress: 0, claimed: false })),
    wheelFreeSpinDay: 0,
    chestOpenedAtHour: -1000,
    receiptsToday: 0,
    helpsToday: 0,
    inviteClaimedDay: 0,
    friends: makeFriends(rng),
    coupons: [],
  };
}

export function stageForPoints(points: number, eco: EconomyPreset): TreeStage {
  const [s2, s3, s4, s5] = eco.stageThresholds;
  if (points >= s5) return 5;
  if (points >= s4) return 4;
  if (points >= s3) return 3;
  if (points >= s2) return 2;
  return 1;
}

export function stageProgressPct(state: GameState, eco: EconomyPreset): number {
  const pts = state.tree.growthPoints;
  const thresholds = [0, ...eco.stageThresholds, eco.harvestAt];
  const stage = state.tree.stage;
  const from = thresholds[stage - 1];
  const to = stage === 5 ? eco.harvestAt : thresholds[stage];
  if (to <= from) return 100;
  return Math.min(100, Math.round(((pts - from) / (to - from)) * 100));
}

function clampDrops(drops: number, eco: EconomyPreset): number {
  return Math.min(drops, eco.dropsCap);
}

function progressTasksOfAction(state: GameState, action: TaskDef['action'], inc = 1): void {
  for (const def of ALL_TASKS) {
    if (def.action !== action) continue;
    const ts = state.tasks.find((t) => t.id === def.id);
    if (ts && !ts.claimed) ts.progress = Math.min(def.goal, ts.progress + inc);
  }
}

function makeCoupon(rewardId: string, day: number, rng: Rng): Coupon {
  const reward = REWARDS.find((r) => r.id === rewardId)!;
  const code = Array.from({ length: 8 }, () =>
    'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(rng() * 31)],
  ).join('');
  return {
    id: `c${Date.now()}${Math.floor(rng() * 1e4)}`,
    rewardId,
    title: reward.title,
    code,
    issuedDay: day,
    expiresDay: day + COUPON_LIFETIME_DAYS,
  };
}

export interface WaterResult {
  state: GameState;
  stageUp?: TreeStage;
  harvestReady?: boolean;
  pointsGained: number;
  error?: string;
}

export function applyWater(prev: GameState, eco: EconomyPreset, rng: Rng): WaterResult {
  if (prev.tree.readyToHarvest) return { state: prev, pointsGained: 0, error: 'Сначала собери урожай!' };
  if (prev.drops < eco.waterCost) return { state: prev, pointsGained: 0, error: 'Не хватает капель' };

  const state = structuredClone(prev);
  state.drops -= eco.waterCost;
  const mult = state.day < state.fertilizerActiveUntilDay ? 2 : 1;
  const gained = eco.growthPerWater * mult;
  state.tree.growthPoints += gained;

  const newStage = stageForPoints(state.tree.growthPoints, eco);
  let stageUp: TreeStage | undefined;
  if (newStage > state.tree.stage) {
    stageUp = newStage;
    state.tree.stage = newStage;
    for (let s = prev.tree.stage + 1; s <= newStage; s++) {
      const reward = eco.stageRewards[s as TreeStage];
      if (reward?.coins) state.coins += reward.coins;
      if (reward?.couponRewardId) state.coupons.push(makeCoupon(reward.couponRewardId, state.day, rng));
    }
  }

  let harvestReady: boolean | undefined;
  if (state.tree.growthPoints >= eco.harvestAt) {
    state.tree.readyToHarvest = true;
    harvestReady = true;
  }

  progressTasksOfAction(state, 'water');
  return { state, stageUp, harvestReady, pointsGained: gained };
}

export function applyHarvest(prev: GameState, eco: EconomyPreset, rng: Rng): { state: GameState; amount: number; error?: string } {
  if (!prev.tree.readyToHarvest) return { state: prev, amount: 0, error: 'Урожай ещё не созрел' };
  const state = structuredClone(prev);
  const [min, max] = eco.harvestAmount;
  const amount = Math.round(min + rng() * (max - min));
  state.harvest += amount;
  state.album.push({ season: state.tree.season, fruit: state.tree.fruit, harvestedAmount: amount, day: state.day });
  state.tree = {
    fruit: state.tree.fruit,
    growthPoints: 0,
    stage: 1,
    readyToHarvest: false,
    season: state.tree.season + 1,
  };
  return { state, amount };
}

export function applyNewDay(prev: GameState, days = 1): GameState {
  const state = structuredClone(prev);
  for (let i = 0; i < days; i++) {
    state.day += 1;
    if (state.lastLoginDay === state.day - 1) state.streak += 1;
    else if (state.lastLoginDay < state.day - 1) state.streak = 1;
    state.lastLoginDay = state.day;
    state.receiptsToday = 0;
    state.helpsToday = 0;
    for (const def of ALL_TASKS) {
      if (def.kind !== 'daily') continue;
      const ts = state.tasks.find((t) => t.id === def.id);
      if (ts) {
        ts.progress = 0;
        ts.claimed = false;
      }
    }
    state.friends = state.friends.map((f) => ({ ...f, helpedToday: false }));
  }
  state.hour = 9;
  return state;
}

export function applyDailyBonus(
  prev: GameState,
  eco: EconomyPreset,
): { state: GameState; drops: number; fertilizer: boolean; error?: string } {
  if (prev.dailyBonusClaimedDay >= prev.day) return { state: prev, drops: 0, fertilizer: false, error: 'Бонус уже получен' };
  const state = structuredClone(prev);
  const streakBonus = Math.min((state.streak - 1) * eco.streakBonusPerDay, eco.streakBonusMax);
  let drops = eco.dailyLoginDrops + streakBonus;
  let fertilizer = false;
  if (state.streak > 0 && state.streak % eco.streakFertilizerDay === 0) {
    fertilizer = true;
    drops += 100;
    state.fertilizerActiveUntilDay = state.day + 1;
  }
  state.drops = clampDrops(state.drops + drops, eco);
  state.dailyBonusClaimedDay = state.day;
  return { state, drops, fertilizer };
}

export function applyClaimTask(prev: GameState, eco: EconomyPreset, taskId: string): { state: GameState; error?: string } {
  const def = ALL_TASKS.find((t) => t.id === taskId);
  const ts = prev.tasks.find((t) => t.id === taskId);
  if (!def || !ts) return { state: prev, error: 'Задание не найдено' };
  if (ts.claimed) return { state: prev, error: 'Награда уже получена' };
  if (ts.progress < def.goal) return { state: prev, error: 'Задание ещё не выполнено' };
  const state = structuredClone(prev);
  const sts = state.tasks.find((t) => t.id === taskId)!;
  sts.claimed = true;
  if (def.rewardDrops) state.drops = clampDrops(state.drops + def.rewardDrops, eco);
  if (def.rewardFertilizer) state.fertilizerActiveUntilDay = Math.max(state.fertilizerActiveUntilDay, state.day + 1);
  return { state };
}

export function applyProgressTask(prev: GameState, taskId: string, inc = 1): GameState {
  const def = ALL_TASKS.find((t) => t.id === taskId);
  if (!def) return prev;
  const state = structuredClone(prev);
  const ts = state.tasks.find((t) => t.id === taskId);
  if (ts && !ts.claimed) ts.progress = Math.min(def.goal, ts.progress + inc);
  return state;
}

export function rollWheel(rng: Rng): number {
  const total = WHEEL_SECTORS.reduce((sum, s) => sum + s.weight, 0);
  let roll = rng() * total;
  for (let i = 0; i < WHEEL_SECTORS.length; i++) {
    roll -= WHEEL_SECTORS[i].weight;
    if (roll <= 0) return i;
  }
  return WHEEL_SECTORS.length - 1;
}

export function applyWheelResult(
  prev: GameState,
  eco: EconomyPreset,
  sector: WheelSector,
  paid: boolean,
  rng: Rng,
): { state: GameState; error?: string } {
  if (paid && prev.coins < eco.wheelExtraSpinCoins) return { state: prev, error: 'Не хватает монет' };
  if (!paid && prev.wheelFreeSpinDay >= prev.day) return { state: prev, error: 'Бесплатное вращение уже было' };
  const state = structuredClone(prev);
  if (paid) state.coins -= eco.wheelExtraSpinCoins;
  else state.wheelFreeSpinDay = state.day;
  if (sector.effect.drops) state.drops = clampDrops(state.drops + sector.effect.drops, eco);
  if (sector.effect.coins) state.coins += sector.effect.coins;
  if (sector.effect.fertilizer) state.fertilizerActiveUntilDay = Math.max(state.fertilizerActiveUntilDay, state.day + 1);
  if (sector.effect.couponRewardId) state.coupons.push(makeCoupon(sector.effect.couponRewardId, state.day, rng));
  return { state };
}

export function applyExchange(
  prev: GameState,
  rewardId: string,
  rng: Rng,
): { state: GameState; coupon?: Coupon; error?: string } {
  const reward = REWARDS.find((r) => r.id === rewardId);
  if (!reward) return { state: prev, error: 'Награда не найдена' };
  if (prev.harvest < reward.costHarvest) return { state: prev, error: 'Не хватает урожая' };
  const state = structuredClone(prev);
  state.harvest -= reward.costHarvest;
  const coupon = makeCoupon(rewardId, state.day, rng);
  state.coupons.push(coupon);
  return { state, coupon };
}

export function applyHelpFriend(prev: GameState, eco: EconomyPreset, friendId: string): { state: GameState; error?: string } {
  if (prev.helpsToday >= eco.helpLimit) return { state: prev, error: 'Лимит помощи на сегодня' };
  const friend = prev.friends.find((f) => f.id === friendId);
  if (!friend) return { state: prev, error: 'Друг не найден' };
  if (friend.helpedToday) return { state: prev, error: 'Сегодня уже помогал' };
  const state = structuredClone(prev);
  const f = state.friends.find((fr) => fr.id === friendId)!;
  f.helpedToday = true;
  f.progressPct = Math.min(100, f.progressPct + 5);
  f.weeklyPoints += 10;
  state.helpsToday += 1;
  state.drops = clampDrops(state.drops + eco.helpReward, eco);
  progressTasksOfAction(state, 'help');
  return { state };
}

export function applyScanReceipt(
  prev: GameState,
  eco: EconomyPreset,
  rng: Rng,
): { state: GameState; amountRub: number; drops: number; error?: string } {
  if (prev.receiptsToday >= eco.receiptLimit) return { state: prev, amountRub: 0, drops: 0, error: 'Лимит чеков на сегодня' };
  const state = structuredClone(prev);
  const amountRub = Math.round(300 + rng() * 2200);
  const drops = Math.min(Math.floor(amountRub / 10) * eco.receiptDropsPer10Rub, eco.receiptDropsMax);
  state.receiptsToday += 1;
  state.drops = clampDrops(state.drops + drops, eco);
  progressTasksOfAction(state, 'receipt');
  return { state, amountRub, drops };
}

export function absHour(state: GameState): number {
  return state.day * 24 + state.hour;
}

export function chestAvailable(state: GameState, eco: EconomyPreset): boolean {
  return absHour(state) - state.chestOpenedAtHour >= eco.chestIntervalHours;
}

export function chestRemainingHours(state: GameState, eco: EconomyPreset): number {
  return Math.max(0, eco.chestIntervalHours - (absHour(state) - state.chestOpenedAtHour));
}

export function applyOpenChest(prev: GameState, eco: EconomyPreset, rng: Rng): { state: GameState; drops: number; error?: string } {
  if (!chestAvailable(prev, eco)) return { state: prev, drops: 0, error: 'Сундук ещё не готов' };
  const state = structuredClone(prev);
  const [min, max] = eco.chestDrops;
  const drops = Math.round(min + rng() * (max - min));
  state.drops = clampDrops(state.drops + drops, eco);
  state.chestOpenedAtHour = absHour(state);
  return { state, drops };
}

export function applyInvite(prev: GameState, eco: EconomyPreset): { state: GameState; error?: string } {
  if (prev.inviteClaimedDay >= prev.day) return { state: prev, error: 'Приглашение уже отправлено сегодня' };
  const state = structuredClone(prev);
  state.inviteClaimedDay = state.day;
  state.drops = clampDrops(state.drops + eco.inviteReward, eco);
  return { state };
}
