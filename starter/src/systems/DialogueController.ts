import Phaser from 'phaser';
import { UI_FONT } from '../game/roles';
import { completeEncounter, conversations, type Choice, type DialogueId } from './Encounters';
import type { RunState } from './RunState';
import { stopButtonActivation } from './ResponsiveLayout';

export class DialogueController {
  active = false;
  private panel?: Phaser.GameObjects.Container;
  private id!: DialogueId;
  private npcId = '';
  private selected = 0;
  private phase: 'choices' | 'reply' | 'complete' | 'intro' = 'intro';
  private lines: string[] = [];
  private rows: Phaser.GameObjects.Text[] = [];
  private mobile?: HTMLElement;
  private mobileChoices: HTMLButtonElement[] = [];

  constructor(private scene: Phaser.Scene, private run: RunState,
    private onModal: (active: boolean) => void,
    private onComplete: (id: DialogueId) => void) {
      scene.events.once('shutdown', () => this.mobile?.remove());
    }

  open(id: DialogueId, npcId: string): void {
    if (this.active) return;
    this.id = id; this.npcId = npcId; this.selected = 0;
    const conversation = conversations[id];
    const completed = (id === 'need' || id === 'relay') && this.run.encounters[id];
    this.phase = completed ? 'complete' : conversation.choices ? 'choices' : 'intro';
    this.lines = completed ? [conversation.completedLine!] : conversation.intro;
    this.active = true;
    this.onModal(true);
    this.render();
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.panel?.destroy(); this.panel = undefined; this.rows = [];
    this.mobile?.remove(); this.mobile = undefined; this.mobileChoices = [];
    this.onModal(false);
  }

  setPaused(paused: boolean): void { this.panel?.setVisible(!paused); if (this.mobile) this.mobile.hidden = paused; }

  handle(input: { direction: number; confirm: boolean }): void {
    if (!this.active) return;
    if (this.phase === 'choices' && input.direction) {
      this.selected = Phaser.Math.Wrap(this.selected + input.direction, 0, this.rows.length);
      this.highlight();
    }
    if (input.confirm) this.choose(this.selected);
  }

  private choose(index: number): void {
    if (!this.active) return;
    const conversation = conversations[this.id];
    if (this.phase !== 'choices') {
      if (this.phase === 'reply') {
        this.phase = 'choices'; this.selected = 0; this.lines = conversation.intro; this.render();
      } else this.close();
      return;
    }
    const choice: Choice = conversation.choices![index];
    const newlyCompleted = completeEncounter(this.run, this.id, choice.id);
    this.lines = [...choice.reply, ...(choice.hint ? [choice.hint] : []), ...(newlyCompleted ? choice.onSuccess ?? [] : [])];
    this.phase = newlyCompleted ? 'complete' : 'reply';
    if (newlyCompleted) this.onComplete(this.id);
    this.render();
  }

  private highlight(): void {
    this.rows.forEach((row, i) => row.setBackgroundColor(i === this.selected ? '#FFD45B' : '#EEE4D3').setText(`${i === this.selected ? '▶' : '　'} ${conversations[this.id].choices![i].label}`));
    this.mobileChoices.forEach((button, i) => button.setAttribute('aria-pressed', String(i === this.selected)));
  }

  private render(): void {
    this.panel?.destroy(); this.rows = [];
    const scene = this.scene;
    const children: Phaser.GameObjects.GameObject[] = [
      scene.add.rectangle(240, 175, 468, 176, 0xFFF4D8).setStrokeStyle(3, 0x253653),
      scene.add.image(30, 127, `npc-${this.npcId}`).setScale(1.5),
      scene.add.text(56, 95, conversations[this.id].speaker, { fontFamily: UI_FONT, fontSize: '14px', fontStyle: 'bold', color: '#41366D' }),
      scene.add.text(56, 117, this.lines.join('\n'), { fontFamily: UI_FONT, fontSize: '12px', color: '#253653', lineSpacing: 4, wordWrap: { width: 401, useAdvancedWrap: true } }),
    ];
    const choices = this.phase === 'choices' ? conversations[this.id].choices! : [];
    if (choices.length) {
      choices.forEach((choice, index) => {
        const row = scene.add.text(20, 162 + index * 27, choice.label, { fontFamily: UI_FONT, fontSize: '12px', color: '#253653', padding: { x: 6, y: 5 }, fixedWidth: 440 })
          .setScrollFactor(0).setInteractive({ useHandCursor: true })
          .on('pointerover', () => { this.selected = index; this.highlight(); })
          .on('pointerdown', () => this.choose(index));
        this.rows.push(row); children.push(row);
      });
      this.highlight();
    } else {
      children.push(scene.add.text(240, 224, this.phase === 'reply' ? '再想一想 · Enter' : '繼續冒險 · Enter', { fontFamily: UI_FONT, fontSize: '13px', color: '#253653', backgroundColor: '#FFD45B', padding: { x: 15, y: 6 } })
        .setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.choose(0)));
    }
    children.push(scene.add.text(240, 251, '↑ ↓ 選擇 · Enter 確認 · Esc 關閉　｜　虛構情境演出', { fontFamily: UI_FONT, fontSize: '10px', color: '#5B5978' }).setOrigin(0.5));
    // Hit tests use each child's scroll factor, even when its parent is screen-fixed.
    this.panel = scene.add.container(0, 0, children).setScrollFactor(0).setDepth(80);
    this.mobile?.remove(); this.mobileChoices = [];
    this.mobile = document.createElement('section'); this.mobile.className = 'compact-menu dialogue-overlay'; this.mobile.setAttribute('aria-label', `${conversations[this.id].speaker}的對話`);
    this.mobile.addEventListener('keydown', stopButtonActivation);
    const panel = document.createElement('div'); panel.className = 'compact-panel';
    const heading = document.createElement('h2'); heading.textContent = conversations[this.id].speaker;
    const text = document.createElement('p'); text.className = 'dialogue-lines'; text.textContent = this.lines.join('\n'); panel.append(heading, text);
    const add = (label: string, action: () => void): HTMLButtonElement => { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.addEventListener('click', action); panel.append(button); return button; };
    choices.forEach((choice, index) => { const button = add(choice.label, () => this.choose(index)); button.dataset.choice = choice.id; this.mobileChoices.push(button); });
    if (!choices.length) add(this.phase === 'reply' ? '再想一想' : '繼續冒險', () => this.choose(0)).className = 'primary';
    add('先離開對話', () => this.close()).className = 'secondary';
    this.mobile.append(panel); document.querySelector('#game')!.append(this.mobile); this.highlight();
  }
}
