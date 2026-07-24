export type BrandId = 'pyaterochka' | 'perekrestok';
export type FruitId = 'apple' | 'pear';
/** 1 росток · 2 саженец · 3 молодое · 4 цветущее · 5 плодоносящее */
export type TreeStage = 1 | 2 | 3 | 4 | 5;

export interface TreeState {
  fruit: FruitId;
  growthPoints: number;
  stage: TreeStage;
  readyToHarvest: boolean;
  season: number;
}

export interface TaskDef {
  id: string;
  title: string;
  kind: 'daily' | 'weekly';
  goal: number;
  rewardDrops?: number;
  rewardFertilizer?: boolean;
  /** Задание с собственным экраном (чек) или мок-действием */
  action: 'water' | 'receipt' | 'help' | 'mock';
  actionLabel?: string;
}

export interface TaskState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  stage: TreeStage;
  progressPct: number;
  lastSeen: string;
  weeklyPoints: number;
  helpedToday: boolean;
}

export interface RewardDef {
  id: string;
  title: string;
  subtitle: string;
  costHarvest: number;
  kind: 'coupon' | 'product' | 'points' | 'partner';
  badge?: string;
}

export interface Coupon {
  id: string;
  rewardId: string;
  title: string;
  code: string;
  issuedDay: number;
  expiresDay: number;
}

export interface AlbumEntry {
  season: number;
  fruit: FruitId;
  harvestedAmount: number;
  day: number;
}

export interface WheelSector {
  label: string;
  short: string;
  weight: number;
  color: string;
  effect: { drops?: number; coins?: number; fertilizer?: boolean; couponRewardId?: string };
}

export interface GameState {
  brand: BrandId;
  onboardingDone: boolean;
  /** Виртуальное время */
  day: number;
  hour: number;
  drops: number;
  coins: number;
  harvest: number;
  /** До какого дня (не включительно) действует ×2 очков роста */
  fertilizerActiveUntilDay: number;
  tree: TreeState;
  album: AlbumEntry[];
  streak: number;
  lastLoginDay: number;
  dailyBonusClaimedDay: number;
  tasks: TaskState[];
  wheelFreeSpinDay: number;
  /** Абсолютный час (day*24+hour) последнего открытия сундука; -Infinity нельзя в JSON — храним -1000 */
  chestOpenedAtHour: number;
  receiptsToday: number;
  helpsToday: number;
  inviteClaimedDay: number;
  friends: Friend[];
  coupons: Coupon[];
}
