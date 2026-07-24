import { describe, expect, it } from 'vitest';
import {
  applyClaimTask,
  applyDailyBonus,
  applyExchange,
  applyHarvest,
  applyHelpFriend,
  applyNewDay,
  applyOpenChest,
  applyScanReceipt,
  applyWater,
  chestAvailable,
  initialState,
  rollWheel,
  stageForPoints,
} from '../src/api/logic';
import { DEMO } from '../src/config/economy';
import type { GameState } from '../src/config/types';

const rng = () => 0.5;

function freshState(): GameState {
  const s = initialState('pyaterochka', rng);
  s.onboardingDone = true;
  return s;
}

describe('полив', () => {
  it('списывает капли и добавляет очки роста', () => {
    const s = freshState();
    const res = applyWater(s, DEMO, rng);
    expect(res.error).toBeUndefined();
    expect(res.state.drops).toBe(s.drops - DEMO.waterCost);
    expect(res.state.tree.growthPoints).toBe(DEMO.growthPerWater);
  });

  it('не даёт полить без капель', () => {
    const s = freshState();
    s.drops = 5;
    const res = applyWater(s, DEMO, rng);
    expect(res.error).toBeTruthy();
    expect(res.state.drops).toBe(5);
  });

  it('удобрение удваивает очки', () => {
    const s = freshState();
    s.fertilizerActiveUntilDay = s.day + 1;
    const res = applyWater(s, DEMO, rng);
    expect(res.state.tree.growthPoints).toBe(DEMO.growthPerWater * 2);
  });

  it('переход стадии даёт награду монетами', () => {
    const s = freshState();
    s.tree.growthPoints = DEMO.stageThresholds[0] - DEMO.growthPerWater;
    const res = applyWater(s, DEMO, rng);
    expect(res.stageUp).toBe(2);
    expect(res.state.coins).toBe(s.coins + (DEMO.stageRewards[2]?.coins ?? 0));
  });

  it('стадия 4 выдаёт купон −5%', () => {
    const s = freshState();
    s.tree.growthPoints = DEMO.stageThresholds[2] - DEMO.growthPerWater;
    s.tree.stage = 3;
    const res = applyWater(s, DEMO, rng);
    expect(res.stageUp).toBe(4);
    expect(res.state.coupons.some((c) => c.rewardId === 'coupon5')).toBe(true);
  });

  it('при достижении harvestAt дерево готово к сбору и дальше не поливается', () => {
    const s = freshState();
    s.tree.growthPoints = DEMO.harvestAt - DEMO.growthPerWater;
    s.tree.stage = 5;
    const res = applyWater(s, DEMO, rng);
    expect(res.harvestReady).toBe(true);
    const res2 = applyWater(res.state, DEMO, rng);
    expect(res2.error).toBeTruthy();
  });
});

describe('стадии', () => {
  it('пороги демо-пресета', () => {
    expect(stageForPoints(0, DEMO)).toBe(1);
    expect(stageForPoints(30, DEMO)).toBe(2);
    expect(stageForPoints(70, DEMO)).toBe(3);
    expect(stageForPoints(120, DEMO)).toBe(4);
    expect(stageForPoints(180, DEMO)).toBe(5);
  });
});

describe('урожай', () => {
  it('даёт урожай в диапазоне и переводит дерево в новый сезон', () => {
    const s = freshState();
    s.tree.readyToHarvest = true;
    s.tree.stage = 5;
    const res = applyHarvest(s, DEMO, rng);
    expect(res.amount).toBeGreaterThanOrEqual(DEMO.harvestAmount[0]);
    expect(res.amount).toBeLessThanOrEqual(DEMO.harvestAmount[1]);
    expect(res.state.tree.season).toBe(2);
    expect(res.state.tree.stage).toBe(1);
    expect(res.state.album).toHaveLength(1);
  });

  it('нельзя собрать несозревшее', () => {
    const res = applyHarvest(freshState(), DEMO, rng);
    expect(res.error).toBeTruthy();
  });
});

describe('виртуальные сутки и стрик', () => {
  it('заход на следующий день наращивает стрик', () => {
    const s = freshState();
    const next = applyNewDay(s);
    expect(next.day).toBe(s.day + 1);
    expect(next.streak).toBe(s.streak + 1);
  });

  it('пропуск дня сбрасывает стрик', () => {
    const s = freshState();
    s.lastLoginDay = s.day - 2; // пропустил день
    const next = applyNewDay(s);
    expect(next.streak).toBe(1);
  });

  it('новый день сбрасывает daily-задания и лимиты', () => {
    const s = freshState();
    s.tasks.find((t) => t.id === 'd_water3')!.progress = 3;
    s.receiptsToday = 2;
    s.helpsToday = 10;
    const next = applyNewDay(s);
    expect(next.tasks.find((t) => t.id === 'd_water3')!.progress).toBe(0);
    expect(next.receiptsToday).toBe(0);
    expect(next.helpsToday).toBe(0);
  });

  it('weekly-задания не сбрасываются новым днём', () => {
    const s = freshState();
    s.tasks.find((t) => t.id === 'w_water25')!.progress = 10;
    const next = applyNewDay(s);
    expect(next.tasks.find((t) => t.id === 'w_water25')!.progress).toBe(10);
  });
});

describe('ежедневный бонус', () => {
  it('выдаёт базу + бонус за стрик, второй раз в день — ошибка', () => {
    const s = freshState();
    s.streak = 3;
    const res = applyDailyBonus(s, DEMO);
    expect(res.drops).toBe(DEMO.dailyLoginDrops + 2 * DEMO.streakBonusPerDay);
    const res2 = applyDailyBonus(res.state, DEMO);
    expect(res2.error).toBeTruthy();
  });

  it('на 7-й день серии даёт удобрение и +100 капель', () => {
    const s = freshState();
    s.streak = 7;
    const res = applyDailyBonus(s, DEMO);
    expect(res.fertilizer).toBe(true);
    expect(res.state.fertilizerActiveUntilDay).toBe(s.day + 1);
  });

  it('капли не превышают потолок', () => {
    const s = freshState();
    s.drops = DEMO.dropsCap - 5;
    const res = applyDailyBonus(s, DEMO);
    expect(res.state.drops).toBe(DEMO.dropsCap);
  });
});

describe('задания', () => {
  it('полив двигает прогресс водных заданий, награду можно забрать один раз', () => {
    let s = freshState();
    for (let i = 0; i < 3; i++) s = applyWater(s, DEMO, rng).state;
    expect(s.tasks.find((t) => t.id === 'd_water3')!.progress).toBe(3);
    const claim = applyClaimTask(s, DEMO, 'd_water3');
    expect(claim.error).toBeUndefined();
    const again = applyClaimTask(claim.state, DEMO, 'd_water3');
    expect(again.error).toBeTruthy();
  });

  it('нельзя забрать награду до выполнения', () => {
    const res = applyClaimTask(freshState(), DEMO, 'd_water3');
    expect(res.error).toBeTruthy();
  });
});

describe('друзья', () => {
  it('помощь даёт капли и уважает лимит и повторную помощь', () => {
    const s = freshState();
    const res = applyHelpFriend(s, DEMO, 'f0');
    expect(res.error).toBeUndefined();
    expect(res.state.drops).toBe(s.drops + DEMO.helpReward);
    const again = applyHelpFriend(res.state, DEMO, 'f0');
    expect(again.error).toBeTruthy();

    const limited = { ...res.state, helpsToday: DEMO.helpLimit };
    expect(applyHelpFriend(limited, DEMO, 'f1').error).toBeTruthy();
  });
});

describe('чеки', () => {
  it('начисляет капли по сумме и уважает дневной лимит', () => {
    const s = freshState();
    const res = applyScanReceipt(s, DEMO, rng);
    expect(res.error).toBeUndefined();
    expect(res.drops).toBe(Math.min(Math.floor(res.amountRub / 10), DEMO.receiptDropsMax));
    const res2 = applyScanReceipt(res.state, DEMO, rng);
    expect(res2.error).toBeUndefined();
    const res3 = applyScanReceipt(res2.state, DEMO, rng);
    expect(res3.error).toBeTruthy();
  });
});

describe('сундук', () => {
  it('доступен сразу, после открытия уходит на кулдаун 4 часа', () => {
    const s = freshState();
    expect(chestAvailable(s, DEMO)).toBe(true);
    const res = applyOpenChest(s, DEMO, rng);
    expect(res.drops).toBeGreaterThanOrEqual(DEMO.chestDrops[0]);
    expect(chestAvailable(res.state, DEMO)).toBe(false);
    const later = { ...res.state, hour: res.state.hour + DEMO.chestIntervalHours };
    expect(chestAvailable(later, DEMO)).toBe(true);
  });
});

describe('колесо', () => {
  it('rollWheel всегда возвращает валидный индекс', () => {
    for (let i = 0; i < 200; i++) {
      const idx = rollWheel(Math.random);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(7);
    }
  });
});

describe('обмен наград', () => {
  it('списывает урожай и выдаёт купон со сроком', () => {
    const s = freshState();
    s.harvest = 1000;
    const res = applyExchange(s, 'coupon5', rng);
    expect(res.error).toBeUndefined();
    expect(res.state.harvest).toBe(200);
    expect(res.coupon!.expiresDay).toBe(s.day + 7);
    expect(res.coupon!.code).toHaveLength(8);
  });

  it('не хватает урожая — ошибка', () => {
    const res = applyExchange(freshState(), 'coupon10', rng);
    expect(res.error).toBeTruthy();
  });
});
