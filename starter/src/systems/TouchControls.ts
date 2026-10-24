import type Phaser from 'phaser';
import type { PlayerController, TouchAction } from './PlayerController';
import { stopButtonActivation } from './ResponsiveLayout';

export class TouchControls {
  private root = document.createElement('div');
  private pointers = new Map<number, { action: TouchAction; button: HTMLButtonElement }>();
  private abort = new AbortController();
  constructor(scene: Phaser.Scene, private controller: PlayerController, training = false) {
    this.root.className = 'touch-controls'; this.root.setAttribute('aria-label', '遊戲觸控操作');
    this.root.addEventListener('keydown', stopButtonActivation, { signal: this.abort.signal });
    const move = document.createElement('div'); move.className = 'touch-move';
    const actions = document.createElement('div'); actions.className = 'touch-actions';
    const add = (group: HTMLElement, action: TouchAction, label: string, name = label): void => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.dataset.action = action; button.setAttribute('aria-label', name);
      const options = { signal: this.abort.signal };
      button.addEventListener('pointerdown', event => {
        if (event.button !== 0 || this.root.hidden || this.pointers.has(event.pointerId)) return;
        event.preventDefault();
        this.pointers.set(event.pointerId, { action, button });
        try { button.setPointerCapture(event.pointerId); } catch { /* An inactive pointer cannot be captured. */ }
        button.classList.add('held'); this.controller.setTouch(action, true);
      }, options);
      const release = (event: PointerEvent): void => this.release(event.pointerId);
      button.addEventListener('pointerup', release, options);
      button.addEventListener('pointercancel', () => this.clear(), options);
      button.addEventListener('lostpointercapture', release, options);
      button.addEventListener('contextmenu', event => event.preventDefault(), options);
      // Keyboard/assistive activation also works; a pointer click must not repeat the action.
      button.addEventListener('click', event => { if (event.detail === 0 && !this.root.hidden) { this.controller.setTouch(action, true); this.controller.setTouch(action, false); } }, options);
      group.append(button);
    };
    add(move, 'left', '◀', '向左移動'); add(move, 'right', '▶', '向右移動');
    add(actions, 'pause', training ? '略過' : '暫停', training ? '略過練習 → 選關' : '暫停'); add(actions, 'skill', '技能');
    add(actions, 'interact', '互動', '互動／交談'); add(actions, 'jump', '跳躍');
    this.root.append(move, actions); document.querySelector('.play-deck')!.append(this.root);
    this.controller.onTouchReset = () => this.clear();
    const options = { signal: this.abort.signal };
    window.addEventListener('blur', () => this.clear(), options);
    window.addEventListener('game-layout-change', () => this.clear(), options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); }, options);
    scene.events.once('shutdown', () => { this.clear(); this.abort.abort(); this.root.remove(); this.controller.onTouchReset = undefined; });
  }
  private release(id: number): void {
    const pointer = this.pointers.get(id); if (!pointer) return;
    this.pointers.delete(id);
    if (![...this.pointers.values()].some(p => p.action === pointer.action)) { this.controller.setTouch(pointer.action, false); pointer.button.classList.remove('held'); }
    if (pointer.button.hasPointerCapture(id)) pointer.button.releasePointerCapture(id);
  }
  private clear(): void {
    for (const id of [...this.pointers.keys()]) this.release(id);
    this.controller.clearTouch();
  }
  setEnabled(enabled: boolean): void { if (this.root.hidden === !enabled) return; this.clear(); this.root.hidden = !enabled; }
}
