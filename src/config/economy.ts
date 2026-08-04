import type { RewardDef, TaskDef, TreeStage, WheelSector } from './types';

export interface EconomyPreset {
  waterCost: number;
  growthPerWater: number;
  /** Очки для перехода на стадии 2..5 */
  stageThresholds: [number, number, number, number];
  /** Очки готовности урожая (после стадии 5) */
  harvestAt: number;
  harvestAmount: [number, number];
  stageRewards: Partial<Record<TreeStage, { coins?: number; couponRewardId?: string }>>;
  dailyLoginDrops: number;
  streakBonusPerDay: number;
  streakBonusMax: number;
  streakFertilizerDay: number;
  dropsCap: number;
  helpReward: number;
  helpLimit: number;
  inviteReward: number;
  receiptDropsPer10Rub: number;
  receiptDropsMax: number;
  receiptLimit: number;
  chestIntervalHours: number;
  chestDrops: [number, number];
  wheelExtraSpinCoins: number;
}

/** Демо-пресет: полный цикл дерева ~18 поливов, проходится за пару минут */
export const DEMO: EconomyPreset = {
  waterCost: 10,
  growthPerWater: 10,
  stageThresholds: [30, 70, 120, 180],
  harvestAt: 180,
  harvestAmount: [800, 1200],
  stageRewards: {
    2: { coins: 50 },
    3: { coins: 100 },
    4: { couponRewardId: 'coupon5' },
  },
  dailyLoginDrops: 20,
  streakBonusPerDay: 5,
  streakBonusMax: 50,
  streakFertilizerDay: 7,
  dropsCap: 500,
  helpReward: 5,
  helpLimit: 10,
  inviteReward: 50,
  receiptDropsPer10Rub: 1,
  receiptDropsMax: 100,
  receiptLimit: 2,
  chestIntervalHours: 4,
  chestDrops: [10, 30],
  wheelExtraSpinCoins: 50,
};

/** Реальные цифры из GDD v1.0 (раздел 3.1, 4.1) — включаются заменой ECONOMY */
export const REAL: EconomyPreset = {
  ...DEMO,
  stageThresholds: [50, 200, 500, 1000],
  harvestAt: 1500,
};

export const ECONOMY: EconomyPreset = DEMO;

export const WHEEL_SECTORS: WheelSector[] = [
  // Палитра Перекрёстка: капли — синие (вода везде в игре синяя), монеты — фирменное
  // золото, всё призовое — в зелёных, джекпот в самом тёмном брендовом зелёном.
  { label: '+10 капель', short: '+10', weight: 30, color: '#7fd4f5', effect: { drops: 10 } },
  { label: '+25 капель', short: '+25', weight: 22, color: '#3fb0e8', effect: { drops: 25 } },
  { label: '+50 капель', short: '+50', weight: 10, color: '#1878b8', effect: { drops: 50 } },
  { label: '+50 монет', short: '50', weight: 20, color: '#ffd23f', effect: { coins: 50 } },
  { label: 'Удобрение ×2', short: '×2', weight: 7, color: '#a5d94f', effect: { fertilizer: true } },
  { label: 'Купон −3%', short: '−3%', weight: 10.5, color: '#4caf6a', effect: { couponRewardId: 'coupon3' } },
  { label: 'ДЖЕКПОТ −15%', short: '−15%', weight: 0.5, color: '#00702a', effect: { couponRewardId: 'coupon15' } },
];

export const REWARDS: RewardDef[] = [
  { id: 'coupon3', title: 'Купон −3%', subtitle: 'На покупку от 300 ₽ · 7 дней', costHarvest: 400, kind: 'coupon', badge: '−3%' },
  { id: 'coupon5', title: 'Купон −5%', subtitle: 'На покупку от 500 ₽ · 7 дней', costHarvest: 800, kind: 'coupon', badge: '−5%' },
  { id: 'coupon10', title: 'Купон −10%', subtitle: 'На покупку от 1000 ₽ · 7 дней', costHarvest: 2000, kind: 'coupon', badge: '−10%' },
  { id: 'coupon15', title: 'Купон −15%', subtitle: 'Джекпот колеса удачи · 7 дней', costHarvest: 3500, kind: 'coupon', badge: '−15%' },
  { id: 'product', title: 'Бесплатный продукт', subtitle: 'Товар СТМ на выбор в магазине', costHarvest: 1200, kind: 'product' },
  { id: 'points500', title: '500 баллов лояльности', subtitle: 'Начислим на вашу карту', costHarvest: 1500, kind: 'points' },
  { id: 'partner', title: 'Купон партнёра', subtitle: 'Кофе или доставка — на выбор', costHarvest: 1000, kind: 'partner' },
];

export const DAILY_TASKS: TaskDef[] = [
  { id: 'd_water3', title: 'Полей дерево 3 раза', kind: 'daily', goal: 3, rewardDrops: 15, action: 'water' },
  { id: 'd_catalog', title: 'Открой каталог акций', kind: 'daily', goal: 1, rewardDrops: 10, action: 'mock', actionLabel: 'Открыть' },
  { id: 'd_list', title: 'Добавь товар в список покупок', kind: 'daily', goal: 1, rewardDrops: 10, action: 'mock', actionLabel: 'Добавить' },
  { id: 'd_receipt', title: 'Отсканируй чек покупки', kind: 'daily', goal: 1, rewardDrops: 20, action: 'receipt', actionLabel: 'Сканировать' },
  { id: 'd_help', title: 'Помоги другу с поливом', kind: 'daily', goal: 1, rewardDrops: 10, action: 'help', actionLabel: 'К друзьям' },
];

export const WEEKLY_TASKS: TaskDef[] = [
  { id: 'w_water25', title: 'Полей дерево 25 раз', kind: 'weekly', goal: 25, rewardFertilizer: true, action: 'water' },
  { id: 'w_receipts3', title: 'Отсканируй 3 чека', kind: 'weekly', goal: 3, rewardDrops: 60, action: 'receipt', actionLabel: 'Сканировать' },
  { id: 'w_help5', title: 'Помоги друзьям 5 раз', kind: 'weekly', goal: 5, rewardDrops: 40, action: 'help', actionLabel: 'К друзьям' },
];

export const ALL_TASKS: TaskDef[] = [...DAILY_TASKS, ...WEEKLY_TASKS];

export const COUPON_LIFETIME_DAYS = 7;
