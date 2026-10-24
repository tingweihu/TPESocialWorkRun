import Phaser from 'phaser';
import { UI_FONT } from './roles';
import { drawTaipeiTitle } from '../art/taipei';
import { audioBus } from '../systems/AudioBus';
import { compactPanel, menuButton, responsiveLayout } from '../systems/ResponsiveLayout';

export class TitleScene extends Phaser.Scene {
  private enterKey!: Phaser.Input.Keyboard.Key;
  constructor() { super('Title'); }

  create(): void {
    responsiveLayout.setScreen('menu');
    const mobile = compactPanel(this, '開始冒險', 'title-menu');
    const title = document.createElement('h1'); title.textContent = '社工勇者：城市裡的光';
    const subtitle = document.createElement('p'); subtitle.textContent = '把一點勇氣放進口袋，和夥伴一起點亮臺北。';
    const mark = document.createElement('div'); mark.className = 'title-star'; mark.textContent = '✦'; mark.setAttribute('aria-hidden', 'true');
    mobile.append(mark, title, subtitle);
    menuButton(mobile, '開始冒險', () => this.scene.start('Organization')).className = 'primary';
    const tip = document.createElement('p'); tip.className = 'menu-tip'; tip.textContent = '先練習，再選一站出發。直拿、橫放都能玩。'; mobile.append(tip);
    audioBus.setMusic('city'); audioBus.setPaused(false);
    this.cameras.main.setBackgroundColor('#85D6F7');
    const sky = this.add.graphics();
    sky.fillStyle(0xFFF4D8, 1); sky.fillCircle(390, 62, 26);
    sky.fillStyle(0x6FBACD, 1); sky.fillRect(0, 185, 480, 85);
    for (let i = 0; i < 17; i++) {
      const x = i * 33;
      const h = 25 + (i * 17) % 55;
      sky.fillStyle(i % 3 ? 0x5878A0 : 0x466688, 1);
      sky.fillRect(x, 188 - h, 28, h + 5);
      sky.fillStyle(0xFFD45B, 0.9);
      for (let y = 0; y < h - 5; y += 12) sky.fillRect(x + 5, 188 - h + y + 8, 4, 4);
    }
    const cloud1 = this.add.ellipse(80, 48, 78, 20, 0xFFF4D8).setAlpha(0.9);
    drawTaipeiTitle(this);
    const cloud2 = this.add.ellipse(305, 36, 60, 14, 0xFFF4D8).setAlpha(0.9);
    this.tweens.add({ targets: cloud1, x: 130, duration: 8000, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: cloud2, x: 275, duration: 7000, yoyo: true, repeat: -1 });
    this.add.rectangle(240, 118, 363, 117, 0x253653, 0.85).setStrokeStyle(3, 0xFFF4D8);
    this.add.text(240, 75, 'TPESocialWorkRun', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '26px', color: '#FFD45B' }).setOrigin(0.5);
    this.add.text(240, 112, '社工勇者：城市裡的光', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '20px', color: '#FFF4D8' }).setOrigin(0.5);
    this.add.text(240, 137, '問題會長出怪物，夥伴會點亮城市。', { fontFamily: UI_FONT, fontSize: '11px', color: '#c7f8eb' }).setOrigin(0.5);
    const button = this.add.rectangle(240, 173, 142, 34, 0xFFD45B).setStrokeStyle(2, 0x253653).setInteractive({ useHandCursor: true });
    this.add.text(240, 172, '▶ 開始冒險', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '17px', color: '#253653' }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('Organization'));
    button.on('pointerdown', () => this.scene.start('Organization'));
    this.tweens.add({ targets: button, alpha: 0.75, duration: 800, yoyo: true, repeat: -1 });
    this.add.text(240, 204, '口袋裡裝一點光，和夥伴慢慢走。', { fontFamily: UI_FONT, fontSize: '12px', color: '#253653', backgroundColor:'#FFF4D8' }).setOrigin(0.5);
    this.add.text(240, 220, '先練習，再選一站出發 · Enter 開始', { fontFamily:UI_FONT,fontSize:'11px',color:'#253653',backgroundColor:'#FFF4D8' }).setOrigin(.5);
    for (let i = 0; i < 4; i++) this.add.sprite(132 + 70 * i, 257, `hero-${['family','protect','outreach','mental'][i]}`).play(`run-${['family','protect','outreach','mental'][i]}`).setScale(1.25).setOrigin(0.5, 1);
    this.cameras.main.fadeIn(350, 37, 54, 83);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.enterKey.once('down', () => this.scene.start('Organization'));
  }

}
