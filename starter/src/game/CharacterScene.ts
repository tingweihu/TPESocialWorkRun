import Phaser from 'phaser';
import { ROLES, UI_FONT } from './roles';
import { getRun } from '../systems/RunState';
import { compactPanel, menuButton, responsiveLayout } from '../systems/ResponsiveLayout';

export class CharacterScene extends Phaser.Scene {
  private current = 0;
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private abilityText!: Phaser.GameObjects.Text;
  private introText!: Phaser.GameObjects.Text;
  private left!: Phaser.Input.Keyboard.Key;
  private right!: Phaser.Input.Keyboard.Key;
  private enter!: Phaser.Input.Keyboard.Key;
  private escape!: Phaser.Input.Keyboard.Key;
  private mobileCards: HTMLButtonElement[] = [];
  private mobileDescription?: HTMLElement;

  constructor() { super('Character'); }

  create(): void {
    responsiveLayout.setScreen('menu');
    const run = getRun(this.registry);
    this.current = Math.max(0, ROLES.findIndex(role => role.id === run.role));
    this.cards = [];
    this.cameras.main.setBackgroundColor('#FFF4D8');
    this.add.rectangle(240, 32, 480, 64, 0x253653);
    this.add.text(240, 16, '選擇今天出發的夥伴', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '18px', color: '#FFD45B' }).setOrigin(0.5);
    this.add.text(240, 31, run.organizationName, { fontFamily: UI_FONT, fontSize: '12px', color: '#FFF4D8', wordWrap: { width: 430, useAdvancedWrap: true }, align: 'center' }).setOrigin(0.5, 0);
    ROLES.forEach((r, i) => {
      const x = 66 + 116 * i;
      const bg = this.add.rectangle(x, 124, 95, 110, 0xFFFFFF, 0.85).setStrokeStyle(3, 0xA8B8C5).setInteractive({ useHandCursor: true });
      this.cards.push(bg);
      this.add.image(x, 110, `hero-${r.id}`).setScale(2.2).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pick(i));
      this.add.text(x, 158, r.name, { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '16px', color: '#253653' }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pick(i));
      bg.on('pointerdown', () => this.pick(i));
    });
    this.titleText = this.add.text(240, 188, '', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '16px', color: '#253653' }).setOrigin(0.5);
    this.abilityText = this.add.text(240, 208, '', { fontFamily: UI_FONT, fontSize: '12px', color: '#5B5978' }).setOrigin(0.5);
    this.introText = this.add.text(240, 226, '', { fontFamily: UI_FONT, fontSize: '11px', color: '#253653' }).setOrigin(0.5);
    this.add.text(240, 252, '出發冒險 ▶', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '14px', color: '#253653', backgroundColor: '#FFD45B', padding: { x: 10, y: 4 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.startRun());
    this.add.text(10, 252, '← → 換角色', { fontFamily: UI_FONT, fontSize: '11px', color: '#51748C' }).setOrigin(0, 0.5);
    this.add.text(470, 252, 'Esc 修改姓名', { fontFamily: UI_FONT, fontSize: '11px', color: '#51748C' }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('Organization'));
    this.left = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.right = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.enter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escape = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.left.on('down', () => this.pick((this.current + ROLES.length - 1) % ROLES.length));
    this.right.on('down', () => this.pick((this.current + 1) % ROLES.length));
    this.enter.once('down', () => this.startRun());
    this.escape.once('down', () => this.scene.start('Organization'));
    const mobile = compactPanel(this, '選擇今天出發的夥伴', 'character-menu');
    const heading = document.createElement('h1'); heading.textContent = '選擇今天出發的夥伴';
    const name = document.createElement('p'); name.textContent = run.organizationName;
    const grid = document.createElement('div'); grid.className = 'character-cards';
    this.mobileCards = ROLES.map((role, index) => {
      const button = menuButton(grid, '', () => this.pick(index)); button.dataset.role = role.id;
      button.addEventListener('focus', () => this.pick(index));
      const sprite = document.createElement('img'); sprite.alt = ''; sprite.src = (this.textures.get(`hero-${role.id}`).getSourceImage() as HTMLCanvasElement).toDataURL();
      const label = document.createElement('span'); label.textContent = `${role.name} · ${role.ability}`; button.append(sprite, label); return button;
    });
    grid.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault(); event.stopPropagation();
      this.pick((this.current + (event.key === 'ArrowLeft' ? -1 : 1) + ROLES.length) % ROLES.length);
      this.mobileCards[this.current].focus();
    });
    this.mobileDescription = document.createElement('p'); this.mobileDescription.className = 'character-description';
    mobile.append(heading, name, grid, this.mobileDescription);
    const actions = document.createElement('div'); actions.className = 'menu-actions'; mobile.append(actions);
    menuButton(actions, '出發練習', () => this.startRun()).className = 'primary';
    menuButton(actions, '修改姓名', () => this.scene.start('Organization'));
    this.renderChoice();
  }
  private pick(index: number): void { this.current = index; getRun(this.registry).role = ROLES[index].id; this.renderChoice(); }
  private startRun(): void { getRun(this.registry).role = ROLES[this.current].id; this.scene.start('Training'); }
  private renderChoice(): void {
    this.cards.forEach((c, i) => c.setStrokeStyle(i === this.current ? 4 : 2, i === this.current ? 0xF9A44C : 0xA8B8C5));
    const r = ROLES[this.current];
    this.titleText.setText(r.title);
    this.abilityText.setText(`技能：${r.ability} · J / X · 冷卻 ${r.cooldownMs / 1000} 秒`);
    this.introText.setText('「' + r.intro + '」');
    this.mobileCards.forEach((card, i) => card.setAttribute('aria-pressed', String(i === this.current)));
    if (this.mobileDescription) this.mobileDescription.textContent = `${r.title} · ${r.domain}｜${r.intro}（技能冷卻 ${r.cooldownMs / 1000} 秒）`;
  }
}
