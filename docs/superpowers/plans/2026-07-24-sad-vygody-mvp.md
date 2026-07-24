# Сад Выгоды MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Кликабельный MVP мини-игры «Сад Выгоды» (Phaser 3) с моковым API вместо бэкенда, проходимый демо-цикл «саженец → урожай → купон» за пару минут.

**Architecture:** Phaser-canvas (сад, колесо) + HTML/CSS-оверлеи для списочных экранов. Единственный источник правды — стор состояния; UI и сцены вызывают `ApiClient` (реализация `MockApiClient`: экономика in-memory + localStorage, имитация сетевой задержки), стор рассылает события подписчикам. Вся экономика — в конфиге (демо-пресет и реальный пресет из GDD). Две брендовые темы поверх одной кодовой базы.

**Tech Stack:** Vite, TypeScript, Phaser 3 (npm), Vitest (юнит-тесты экономики), без UI-фреймворков.

Спека: `docs/superpowers/specs/2026-07-24-sad-vygody-mvp-design.md`. Визуальные референсы: `documents/game_designs_references/*.png`.

---

### Task 1: Каркас проекта

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/style.css`, `.gitignore`

- [ ] Vite vanilla-ts шаблон, `npm i phaser`, `npm i -D vitest`
- [ ] `index.html`: контейнер `#app` → внутри `#phone-frame` (на десктопе рамка 360×640 по центру, на мобиле — 100dvh) → внутри `#game-root` (Phaser) и `#ui-root` (HTML-оверлеи, absolute поверх)
- [ ] `src/main.ts`: создать Phaser.Game (`Phaser.AUTO`, 360×640, `Scale.FIT` внутри `#game-root`), пустая сцена-заглушка
- [ ] Проверить `npm run dev` — чёрный канвас в рамке
- [ ] Commit: `chore: scaffold vite + ts + phaser project`

### Task 2: Типы, конфиг экономики, темы

**Files:**
- Create: `src/config/types.ts`, `src/config/economy.ts`, `src/config/themes.ts`

- [ ] `types.ts` — доменные типы:

```ts
type BrandId = 'pyaterochka' | 'perekrestok';
type FruitId = 'apple' | 'pear';
type TreeStage = 1 | 2 | 3 | 4 | 5; // росток…плодоносящее

interface TreeState { fruit: FruitId; growthPoints: number; stage: TreeStage; readyToHarvest: boolean; season: number; }
interface TaskDef { id: string; title: string; kind: 'daily' | 'weekly'; goal: number; rewardDrops?: number; rewardFertilizer?: boolean; }
interface TaskState { id: string; progress: number; claimed: boolean; }
interface Friend { id: string; name: string; avatar: string; stage: TreeStage; progressPct: number; lastSeen: string; weeklyPoints: number; helpedToday: boolean; }
interface RewardDef { id: string; title: string; costHarvest: number; kind: 'coupon' | 'product' | 'points' | 'partner'; discount?: string; }
interface Coupon { id: string; rewardId: string; title: string; code: string; barcode: string; issuedDay: number; expiresDay: number; }
interface AlbumEntry { season: number; fruit: FruitId; harvestedAmount: number; day: number; }
interface WheelSector { label: string; weight: number; effect: { drops?: number; coins?: number; fertilizer?: boolean; couponRewardId?: string }; }

interface GameState {
  brand: BrandId; onboardingDone: boolean;
  day: number; hour: number;                    // виртуальное время
  drops: number; coins: number; harvest: number;
  fertilizerActiveUntilDay: number;             // ×2 очков роста
  tree: TreeState; album: AlbumEntry[];
  streak: number; lastLoginDay: number; dailyBonusClaimedDay: number;
  tasks: TaskState[];
  wheelFreeSpinDay: number;                     // день последнего бесплатного вращения
  chestOpenedAtHour: number;                    // абс. час = day*24+hour
  receiptsToday: number; helpsToday: number;
  friends: Friend[]; coupons: Coupon[];
}
```

- [ ] `economy.ts` — два пресета (активен демо):

```ts
interface EconomyPreset {
  waterCost: number;              // 10 капель
  growthPerWater: number;         // 10 очков
  stageThresholds: number[];      // очки для стадий 2..5
  harvestAt: number;              // очки готовности урожая
  harvestAmount: [number, number];
  stageRewards: { stage: TreeStage; coins?: number; couponRewardId?: string }[];
  dailyLoginDrops: number; streakBonusPerDay: number; streakBonusMax: number; streakFertilizerDay: number;
  dropsCap: number;               // 500
  helpReward: number; helpLimit: number;
  receiptDropsPer10Rub: number; receiptDropsMax: number; receiptLimit: number;
  chestIntervalHours: number; chestDrops: [number, number];
  wheelExtraSpinCoins: number;
}
export const DEMO: EconomyPreset  // цикл ~18 поливов: пороги [30,70,120,180], harvestAt 180
export const REAL: EconomyPreset  // из GDD: пороги [50,200,500,1000], harvestAt 1500
export const ECONOMY = DEMO;
export const WHEEL_SECTORS: WheelSector[]  // капли 10/25/50, монеты 50, удобрение, купон −3%, джекпот −15% (0.5%)
export const REWARDS: RewardDef[]          // каталог из GDD, демо-цены ~ниже (урожай 800–1200 за цикл)
export const DAILY_TASKS: TaskDef[]; export const WEEKLY_TASKS: TaskDef[];
```

- [ ] `themes.ts`:

```ts
interface BrandTheme {
  id: BrandId; name: string; fruit: FruitId; fruitName: string; treeName: string;
  colors: { primary: string; primaryDark: string; accent: string; bg: string };
  assetPrefix: string;  // 'py' | 'pk' — префикс ключей текстур
}
export const THEMES: Record<BrandId, BrandTheme>;
```

- [ ] Commit: `feat: domain types, economy config (demo+real presets), brand themes`

### Task 3: Стор, шина событий, MockApiClient (+ тесты)

**Files:**
- Create: `src/state/store.ts`, `src/api/ApiClient.ts`, `src/api/MockApiClient.ts`, `src/api/logic.ts`, `tests/logic.test.ts`

- [ ] `store.ts`: класс `Store` — держит `GameState`, `get state()`, `set(next)`, `on(event, cb)` / `emit`; события: `state:changed`, `tree:stage`, `tree:harvest-ready`, `reward:coupon`, `day:changed`
- [ ] `ApiClient.ts` — интерфейс:

```ts
interface ApiClient {
  getState(): Promise<GameState>;
  selectSapling(fruit: FruitId): Promise<GameState>;
  completeOnboarding(): Promise<GameState>;
  water(): Promise<{ state: GameState; stageUp?: TreeStage; harvestReady?: boolean }>;
  harvest(): Promise<{ state: GameState; amount: number }>;
  claimDailyBonus(): Promise<{ state: GameState; drops: number; streak: number; fertilizer: boolean }>;
  claimTask(taskId: string): Promise<GameState>;
  progressTask(taskId: string, inc?: number): Promise<GameState>;   // «Открой каталог» и т.п. — мок
  spinWheel(paid: boolean): Promise<{ state: GameState; sectorIndex: number }>;
  exchangeReward(rewardId: string): Promise<{ state: GameState; coupon?: Coupon }>;
  helpFriend(friendId: string): Promise<GameState>;
  scanReceipt(): Promise<{ state: GameState; amountRub: number; drops: number }>;
  openChest(): Promise<{ state: GameState; drops: number }>;
  setBrand(brand: BrandId): Promise<GameState>;
  devGrant(patch: { drops?: number; harvest?: number; coins?: number }): Promise<GameState>;
  devAdvance(opts: { days?: number; hours?: number }): Promise<GameState>;
  resetProgress(): Promise<GameState>;
}
```

- [ ] `logic.ts` — чистые функции экономики (без Promise/задержек): `applyWater`, `applyHarvest`, `applyNewDay` (стрик/сброс daily/лимиты), `rollWheel(rng)`, `applyExchange`, `chestAvailable` и т.д. Работают `(state, economy) => result`
- [ ] `MockApiClient.ts`: держит `Store`, оборачивает `logic.ts` в `delay(150–400 мс)`, пишет в localStorage (`sad-vygody-save-v1`) после каждой мутации, генерит фейковых друзей при инициализации
- [ ] `tests/logic.test.ts` (Vitest): полив списывает капли и растит очки; переходы стадий и награды за стадии; удобрение ×2; урожай в диапазоне и переход сезона; стрик растёт при заходе на следующий день и сбрасывается при пропуске; сброс daily-заданий; лимиты (помощь 10/день, чеки 2/день, потолок 500 капель); обмен списывает урожай и выдаёт купон со сроком
- [ ] `npx vitest run` — зелёные
- [ ] Commit: `feat: state store, mock api client with economy logic and tests`

### Task 4: BootScene + GardenScene (ядро игры)

**Files:**
- Create: `src/game/BootScene.ts`, `src/game/GardenScene.ts`, `src/game/effects.ts`
- Modify: `src/main.ts`

- [ ] `BootScene`: грузит атлас/картинки активной темы (пока — процедурные плейсхолдеры через `Graphics.generateTexture`: фон-градиент, 5 силуэтов дерева, фрукт, капля, монета), затем `scene.start('Garden')`
- [ ] `GardenScene` по мокапу 1: фон, дерево по центру (текстура по стадии), HUD сверху (капли/монеты/урожай — контейнеры с иконкой и текстом), прогресс-бар роста с процентом, большая кнопка «Полить» (лейка) внизу, кнопка сундука с таймером слева, корзина «Собрать» появляется при `readyToHarvest`
- [ ] Полив: тап → `api.water()` → частицы капель над деревом, tween-«пульс» дерева, всплывающий `+10` очков; при `stageUp` — вспышка, смена текстуры с scale-tween, тост награды за стадию
- [ ] Сбор: `api.harvest()` → 8–12 спрайтов фруктов разлетаются в счётчик урожая (tween по кривой), тост «+N урожая», окно выбора нового саженца
- [ ] Подписка на `state:changed` — обновление HUD; кнопки дизейблятся, когда не хватает капель / идёт запрос
- [ ] Commit: `feat: garden scene with watering, growth stages, harvest`

### Task 5: HTML-оверлеи и навигация

**Files:**
- Create: `src/ui/overlay.ts` (каркас: открыть/закрыть панель, шаблоны), `src/ui/nav.ts` (нижняя навигация), `src/ui/onboarding.ts`, `src/ui/tasks.ts`, `src/ui/rewards.ts`, `src/ui/friends.ts`, `src/ui/album.ts`, `src/ui/toasts.ts`
- Modify: `src/style.css`, `src/main.ts`

- [ ] Нижняя навигация (по мокапам): Сад · Задания · Награды · Друзья · Альбом; активная вкладка подсвечена цветом темы
- [ ] Онбординг (первый запуск): 3 шага-подсказки + выбор саженца (яблоня/груша карточками) → `selectSapling` → `completeOnboarding`
- [ ] Задания: списки daily/weekly, прогресс-бары, кнопка «Выполнить» (мок-переход: сразу двигает прогресс через `progressTask`), «Забрать» при выполнении; карточка «Сканируй чек» открывает мок-экран чека (случайная сумма 300–2500 ₽, анимация начисления капель)
- [ ] Награды (мокап 3): баланс урожая, карточки каталога с ценой и «Забрать», модалка купона (код, CSS-«штрихкод», срок «до дня N»), вкладка «Полученные» — история купонов
- [ ] Друзья (мокап 4): баннер «Пригласить друга +50 капель» (мок — сразу начисляет 1 раз в день), список друзей со стадией/прогрессом и «Помочь полить» (лимит 10/день), подиум «Рейтинг недели» топ-3
- [ ] Альбом: сетка собранных деревьев (сезон, фрукт, размер урожая), пусто-состояние «Вырасти первое дерево»
- [ ] Тосты (`toasts.ts`) — единый механизм всплывашек `+N капель` и наград
- [ ] Ежедневный бонус: при входе в новый день — попап стрика (день N серии, +капли, день 7 — удобрение)
- [ ] Commit: `feat: html overlays — onboarding, tasks, rewards, friends, album, daily bonus`

### Task 6: Колесо удачи

**Files:**
- Create: `src/game/WheelScene.ts`
- Modify: `src/ui/nav.ts` (кнопка на главном экране), `src/game/GardenScene.ts`

- [ ] Кнопка колеса на экране сада (как в мокапе 1, бейдж «1» если есть бесплатное вращение)
- [ ] `WheelScene` запускается поверх (`scene.launch`) с затемнением: колесо из секторов (Graphics-пирог + подписи), стрелка; `api.spinWheel()` возвращает `sectorIndex` — колесо крутится tween'ом 3–4 оборота с `Cubic.easeOut` и останавливается на секторе; попап выигрыша
- [ ] Повторное вращение за 50 монет; бесплатное — 1 раз в «день»
- [ ] Commit: `feat: wheel of fortune scene with spin animation`

### Task 7: Дев-панель и виртуальное время

**Files:**
- Create: `src/ui/devpanel.ts`
- Modify: `src/ui/overlay.ts`, `src/main.ts`

- [ ] Открытие: клавиша `` ` ``/`~` или тройной тап по логотипу-заголовку
- [ ] Кнопки: `+100 капель`, `+500 урожая`, `+100 монет`, «Новый день» (`devAdvance({days:1})` — пересчёт стрика, сброс daily, доступность колеса/сундука), «+4 часа», переключатель скина (перезапуск Boot с другой темой), «Сбросить прогресс» (с confirm)
- [ ] Индикатор виртуального времени «День N, HH:00» в панели
- [ ] Commit: `feat: hidden dev panel with time travel and cheats`

### Task 8: ИИ-арт и брендовые темы

**Files:**
- Create: `public/assets/py/*.png`, `public/assets/pk/*.png`, `public/assets/common/*.png`
- Modify: `src/game/BootScene.ts`, `src/config/themes.ts`, `src/style.css`

- [ ] Сгенерировать в едином мягком мультяшном стиле (референс — мокапы): фон сада с магазином ×2 бренда; дерево 5 стадий × яблоня/груша (прозрачный фон); ёжик-маскот; иконки капли/монеты/урожая; лейка ×2 цвета; колесо; сундук
- [ ] Подключить в BootScene по `theme.assetPrefix`, убрать плейсхолдеры; CSS-переменные темы (`--primary`…) переключать вместе со скином
- [ ] Проверить вес: суммарно ≤ 15 МБ (цель GDD)
- [ ] Commit: `feat: AI-generated art for both brand themes`

### Task 9: Сквозная проверка

- [ ] `npx vitest run` + `npx tsc --noEmit` — зелёные
- [ ] В браузере пройти полный сценарий: онбординг → полив до стадии 5 (через дев-капли) → сбор → обмен на купон → колесо → задания с чеком → друзья → «Новый день» → стрик; на обоих скинах
- [ ] Починить найденное, финальный commit: `fix: polish after end-to-end pass`

---

## Self-review

- Покрытие спеки: все механики MVP (онбординг, полив/стадии/урожай, стрик, задания+чек, колесо, сундук, друзья, витрина+купон, альбом, виртуальное время, дев-панель, 2 темы, localStorage) — по задачам 2–8. ✓
- Типы согласованы между задачами (`GameState`, `ApiClient`) — определены в Task 2–3 и используются дальше. ✓
- Вне скоупа не протекло (нет бэка, авторизации, пушей). ✓
