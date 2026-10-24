import type Phaser from 'phaser';
import { focusMenu, stopButtonActivation } from './NativeMenu';
export { stopButtonActivation } from './NativeMenu';

class ResponsiveLayout {
  private shell?: HTMLElement;
  private coarse = matchMedia('(any-pointer: coarse)');
  private narrow = matchMedia('(max-width: 900px)');
  private override?: boolean;
  private screen: 'menu' | 'play' = 'menu';
  get compact(): boolean { return this.override ?? (this.coarse.matches || this.narrow.matches); }

  install(): void {
    const stage = document.querySelector<HTMLElement>('#game')!;
    this.shell = stage.closest<HTMLElement>('.shell')!;
    if (!stage.parentElement!.classList.contains('play-deck')) {
      const deck = document.createElement('div'); deck.className = 'play-deck'; stage.replaceWith(deck); deck.append(stage);
    }
    const update = (): void => {
      document.documentElement.style.setProperty('--view-height', `${window.visualViewport?.height ?? window.innerHeight}px`);
      this.shell!.classList.toggle('touch-layout', this.compact);
      const toggle = document.querySelector('#touch-toggle');
      toggle?.setAttribute('aria-pressed', String(this.compact));
      if (toggle) toggle.textContent = this.compact ? '觸控：開' : '觸控：關';
      window.dispatchEvent(new Event('game-layout-change'));
    };
    this.coarse.addEventListener('change', update); this.narrow.addEventListener('change', update);
    window.addEventListener('resize', update); window.visualViewport?.addEventListener('resize', update);
    document.querySelector('#touch-toggle')?.addEventListener('click', () => { this.override = !this.compact; update(); });
    const fullscreen = document.querySelector<HTMLButtonElement>('#fullscreen-toggle');
    const status = document.querySelector('#display-status');
    if (fullscreen) {
      fullscreen.hidden = !document.fullscreenEnabled;
      fullscreen.addEventListener('click', async () => {
        try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
        catch { if (status) status.textContent = '目前瀏覽器無法開啟全螢幕，仍可直接遊玩。'; }
      });
      document.addEventListener('fullscreenchange', () => { fullscreen.textContent = document.fullscreenElement ? '離開全螢幕' : '全螢幕'; update(); });
    }
    update(); this.setScreen('menu');
  }
  bind(game: Phaser.Game): void {
    // Menus, soft keyboards and rotation can resize the parent without a window resize.
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (game.isBooted) game.scale.refresh(); });
    });
    observer.observe(document.querySelector('#game')!);
    game.events.once('destroy', () => { observer.disconnect(); cancelAnimationFrame(frame); });
  }
  setScreen(screen: 'menu' | 'play'): void {
    this.screen = screen;
    if (this.shell) this.shell.dataset.screen = this.screen;
  }
}
export const responsiveLayout = new ResponsiveLayout();

/** Native controls are available at every viewport size, independently of touch input. */
export function compactPanel(scene: Phaser.Scene, label: string, className = ''): HTMLElement {
  const overlay = document.createElement('section'); overlay.className = `compact-menu ${className}`;
  overlay.setAttribute('aria-label', label);
  const panel = document.createElement('div'); panel.className = 'compact-panel'; overlay.append(panel);
  overlay.addEventListener('keydown', stopButtonActivation);
  document.querySelector('#game')!.append(overlay);
  focusMenu(overlay);
  scene.events.once('shutdown', () => overlay.remove());
  return panel;
}
export function menuButton(parent: HTMLElement, label: string, action: () => void): HTMLButtonElement {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
  button.addEventListener('click', action); parent.append(button); return button;
}
