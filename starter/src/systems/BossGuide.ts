import type Phaser from 'phaser';
import { BOSS_STEPS } from './Journey';

export function appendBossSteps(parent: HTMLElement): void {
  const grid = document.createElement('div'); grid.className = 'boss-steps';
  for (const step of BOSS_STEPS) {
    const card = document.createElement('article');
    const icon = document.createElement('div'); icon.className = 'guide-symbol'; icon.textContent = step.symbol; icon.setAttribute('aria-hidden', 'true');
    const heading = document.createElement('h3'); heading.textContent = step.title;
    const text = document.createElement('p'); text.textContent = step.text;
    card.append(icon, heading, text); grid.append(card);
  }
  parent.append(grid);
}

export class BossGuide {
  private overlay: HTMLElement;
  private listeners = new AbortController();
  private enabled: boolean;
  constructor(private scene: Phaser.Scene, onClose: () => void) {
    const keyboard = scene.input.keyboard!.manager; this.enabled = keyboard.enabled; keyboard.enabled = false;
    this.overlay = document.createElement('section'); this.overlay.className = 'guide-overlay'; this.overlay.setAttribute('role', 'dialog'); this.overlay.setAttribute('aria-modal', 'true'); this.overlay.setAttribute('aria-label', 'Boss 攻略');
    const panel = document.createElement('div'); panel.className = 'guide-panel';
    const title = document.createElement('h2'); title.textContent = '過載巨獸怎麼打？';
    const intro = document.createElement('p'); intro.textContent = '把工作分開，把支持接起來。你要啟動的是機關，夥伴會一起完成。';
    panel.append(title, intro); appendBossSteps(panel);
    const tip = document.createElement('p'); tip.className = 'guide-tip'; tip.textContent = '進場補滿 EN；每完成一階段回復 1 EN。看說明時遊戲暫停，H 隨時重看。';
    const close = document.createElement('button'); close.textContent = '準備好了，繼續冒險'; close.type = 'button'; close.addEventListener('click', onClose, { signal: this.listeners.signal });
    this.overlay.addEventListener('keydown', e => { if (e.key === 'Escape' || e.code === 'KeyH') { e.preventDefault(); e.stopPropagation(); onClose(); } if (e.key === 'Tab') { e.preventDefault(); close.focus(); } }, { signal: this.listeners.signal });
    panel.append(tip, close); this.overlay.append(panel); document.querySelector('#game')!.append(this.overlay);
    title.tabIndex = -1; title.focus({ preventScroll: true }); this.overlay.scrollTop = 0;
  }
  destroy(): void { this.listeners.abort(); this.overlay.remove(); this.scene.input.keyboard!.manager.enabled = this.enabled; this.scene.input.keyboard!.resetKeys(); }
}
