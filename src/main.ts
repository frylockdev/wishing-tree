import Phaser from 'phaser';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './style.css';
import { initApp } from './app';
import { applyThemeCss } from './config/themes';
import { BootScene } from './game/BootScene';
import { GardenScene } from './game/GardenScene';
import { WheelScene } from './game/WheelScene';
import { initToasts, toast } from './ui/toasts';
import { initOverlay } from './ui/overlay';
import { initNav } from './ui/nav';
import { openSaplingChooser, startOnboarding } from './ui/onboarding';
import { maybeShowDailyBonus } from './ui/dailybonus';
import { initDevPanel } from './ui/devpanel';

const app = initApp();
applyThemeCss(app.store.state.brand);

const uiRoot = document.getElementById('ui-root')!;
initToasts(uiRoot);
initOverlay(uiRoot);
initNav(uiRoot);
initDevPanel(uiRoot);

// Ждём шрифт до старта Phaser, чтобы canvas-тексты сразу рисовались Nunito
try {
  await Promise.race([
    Promise.all(['400', '700', '800', '900'].map((w) => document.fonts.load(`${w} 16px Nunito`))),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);
} catch {
  // без шрифта тоже работаем
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 360,
  height: 640,
  backgroundColor: '#87ceeb',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GardenScene, WheelScene],
});

app.ui.toast = toast;
app.ui.openSaplingChooser = () => openSaplingChooser(false);
app.ui.openWheel = () => {
  if (!game.scene.isActive('Wheel')) game.scene.getScene('Garden').scene.launch('Wheel');
};

game.events.once(Phaser.Core.Events.READY, () => {
  if (!app.store.state.onboardingDone) {
    startOnboarding(() => maybeShowDailyBonus());
  } else {
    maybeShowDailyBonus();
  }
});

app.store.on('day:changed', () => maybeShowDailyBonus());

// Доступ из консоли для отладки и автотестов
(window as unknown as { __app: typeof app }).__app = app;
