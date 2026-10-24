import Phaser from 'phaser';
import { createRun, getRun } from '../systems/RunState';
import { PlayerController } from '../systems/PlayerController';
import { audioBus } from '../systems/AudioBus';
import { ROLES, UI_FONT } from './roles';
import { drawTaipeiTitle } from '../art/taipei';
import { TouchControls } from '../systems/TouchControls';
import { responsiveLayout } from '../systems/ResponsiveLayout';

const LESSONS = [
  ['先散個步吧', '按方向鍵，或 ← →／A D，走到星星附近。'],
  ['把小星星接住', '按住「跳躍」或 Space／Z，碰到上方的星星。'],
  ['練習從上方落下', '跳到右邊紙山上方，落下踩中它。碰到側面也不扣血。'],
  ['跟夥伴打聲招呼', '走到阿光旁，按「互動」或 E／Enter。'],
  ['試試你的拿手本領', '按「技能」或 J／X，看看角色的拿手本領。'],
] as const;

export class TrainingScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private controller!: PlayerController;
  private lesson = 0;
  private elapsed = 0;
  private instruction!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Text;
  private star!: Phaser.Physics.Arcade.Image;
  private dummy!: Phaser.Physics.Arcade.Image;
  private finishButton!: HTMLButtonElement;
  private mobileHint!: HTMLElement;
  constructor() { super('Training'); }
  create(): void {
    responsiveLayout.setScreen('play');
    const previous = getRun(this.registry); const practice = createRun(previous.organizationName, previous.role); practice.mode = 'practice'; this.registry.set('runState', practice);
    this.lesson = 0; this.elapsed = 0; audioBus.setMusic('city'); audioBus.setPaused(false);
    this.cameras.main.setBackgroundColor('#85D6F7'); drawTaipeiTitle(this);
    this.add.rectangle(240, 237, 480, 16, 0x73D6AA);
    const ground = this.physics.add.staticGroup();
    for (let x = 32; x <= 480; x += 64) ground.create(x, 257, 'ground');
    const role = getRun(this.registry).role;
    this.player = this.physics.add.sprite(64, 214, `hero-${role}`).setDepth(5).setSize(14, 26).setOffset(3, 2).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground); this.controller = new PlayerController(this.player, this.input.keyboard!);
    new TouchControls(this, this.controller, true);
    const blur = (): void => { this.controller.reset(); this.player.setVelocity(0, 0); this.physics.pause(); audioBus.setPaused(true); };
    const focus = (): void => { this.controller.reset(); this.physics.resume(); audioBus.setPaused(false); };
    const visibility = (): void => { if (document.hidden) blur(); else focus(); };
    window.addEventListener('blur', blur); window.addEventListener('focus', focus); document.addEventListener('visibilitychange', visibility);
    this.events.once('shutdown', () => { window.removeEventListener('blur', blur); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', visibility); });
    this.star = this.physics.add.staticImage(200, 169, 'star').setDepth(4);
    this.dummy = this.physics.add.staticImage(310, 234, 'paper-slime').setDepth(4);
    this.add.image(424, 244, 'npc-team-mate').setOrigin(.5, 1).setDepth(4);
    this.add.text(424, 202, '阿光 · E', { fontFamily: UI_FONT, fontSize: '12px', color: '#253653', backgroundColor: '#FFF4D8' }).setOrigin(.5);
    this.add.rectangle(240, 63, 458, 64, 0xFFF4D8, .96).setStrokeStyle(2, 0x73D6AA).setDepth(8);
    this.instruction = this.add.text(24, 39, '', { fontFamily: UI_FONT, fontSize: '13px', color: '#253653', lineSpacing: 6, wordWrap: { width: 428, useAdvancedWrap: true } }).setDepth(9);
    this.progress = this.add.text(12, 9, '', { fontFamily: UI_FONT, fontSize: '12px', color: '#253653' }).setDepth(9);
    this.mobileHint = document.createElement('p'); this.mobileHint.className = 'training-mobile-hint'; this.mobileHint.setAttribute('aria-live', 'polite');
    document.querySelector('#game')!.after(this.mobileHint);
    this.physics.add.overlap(this.player, this.star, () => { if (this.lesson !== 1) return; this.star.disableBody(true, true); audioBus.play('star'); this.advance(); });
    this.physics.add.overlap(this.player, this.dummy, () => {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const target = this.dummy.body as Phaser.Physics.Arcade.StaticBody;
      if (this.lesson === 2 && body.velocity.y > 0 && body.prev.y + body.height <= target.top + 5) { this.dummy.disableBody(true, true); this.player.setVelocityY(-180); audioBus.play('support'); this.advance(); }
    });
    const toolbar = document.createElement('div'); toolbar.className = 'training-toolbar';
    this.finishButton = document.createElement('button'); this.finishButton.textContent = '略過練習 → 選關'; this.finishButton.type = 'button';
    this.finishButton.addEventListener('click', () => this.scene.start('Journey', {}));
    toolbar.append(this.finishButton); document.querySelector('#game')!.append(toolbar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { toolbar.remove(); this.mobileHint.remove(); this.input.keyboard!.resetKeys(); });
    this.renderLesson();
  }
  private advance(): void { this.lesson++; this.renderLesson(); }
  private renderLesson(): void {
    this.progress.setText(`口袋練習場 · ${Math.min(this.lesson, 5)} / 5`);
    if (this.lesson < LESSONS.length) this.instruction.setText(`${LESSONS[this.lesson][0]}\n${LESSONS[this.lesson][1]}`);
    else {
      const role = ROLES.find(r => r.id === getRun(this.registry).role)!;
      this.instruction.setText(`練習完成！${role.ability}，準備好陪你出發。\n${role.intro}`);
      this.finishButton.textContent = '練習完成 → 前往關卡地圖';
      const touchFinish = document.querySelector<HTMLButtonElement>('[data-action="pause"]');
      if (touchFinish) { touchFinish.textContent = '選關'; touchFinish.setAttribute('aria-label', '練習完成 → 前往關卡地圖'); }
    }
    const touchLessons = ['走到星星附近。', '按住跳躍，接住小星星。', '跳到紙山上方，落下踩中它。', '到阿光旁，點互動。', '點技能，試試拿手本領。'];
    this.mobileHint.textContent = this.lesson < 5 ? `${this.lesson + 1} / 5 · ${touchLessons[this.lesson]}` : '練習完成！點選關出發。';
  }
  update(_time: number, delta: number): void {
    if (!this.controller || document.hidden) return;
    this.elapsed += Math.min(delta, 50); this.controller.update(this.elapsed);
    if (this.controller.pausePressed()) { this.scene.start('Journey', {}); return; }
    if (this.lesson === 0 && this.player.x > 145) this.advance();
    if (this.controller.storyInput().confirm && this.lesson === 3 && Math.abs(this.player.x - 424) < 44) { audioBus.play('button'); this.advance(); }
    if (this.controller.skillPressed() && this.lesson === 4) {
      const halo = this.add.circle(this.player.x, this.player.y, 24, 0xFFD45B, .35).setDepth(6);
      this.tweens.add({ targets: halo, scale: 1.7, alpha: 0, duration: 450, onComplete: () => halo.destroy() }); audioBus.play('support'); this.advance();
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body; const role = getRun(this.registry).role;
    if (!body.blocked.down) { this.player.anims.stop(); this.player.setTexture(`hero-${role}-jump`); }
    else this.player.play(`${Math.abs(body.velocity.x) > 0 ? 'run' : 'idle'}-${role}`, true);
  }
}
