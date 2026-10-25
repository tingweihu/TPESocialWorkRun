import Phaser from 'phaser';
import level from '../../../data/level01.json';
import script from '../../../data/dialogues.zh-TW.json';
import { UI_FONT } from '../game/roles';
import { readyForBoss } from './Encounters';
import type { RunState } from './RunState';
import { audioBus } from './AudioBus';
import { coreWindow, paperWave, phaseTarget } from './BossRules';
import { stageById } from './Journey';

export class BossController {
  active = false;
  private sprite: Phaser.GameObjects.Image;
  private hazards: Phaser.Physics.Arcade.Group;
  private stamps: Phaser.Physics.Arcade.Image[];
  private switches: Phaser.GameObjects.Image[];
  private core: Phaser.Physics.Arcade.Image;
  private walls: Phaser.GameObjects.Rectangle[];
  private hud: Phaser.GameObjects.Text;
  private warning: Phaser.GameObjects.Text;
  private phaseStart = 0;
  private introUntil = 0;
  private lastWave = -1;
  private lastCoreWindow = -1;
  private stampIds = new Set<number>();
  private switchIds = new Set<number>();

  constructor(private scene: Phaser.Scene, private run: RunState, private player: Phaser.Physics.Arcade.Sprite,
    private hurt: () => void, private onClear: () => void, private definition = level) {
    const level = this.definition;
    this.sprite = scene.add.image(level.boss.x, level.boss.y, 'boss-threat').setDepth(9).setVisible(false);
    this.hazards = scene.physics.add.group({ allowGravity: false });
    scene.physics.add.overlap(player, this.hazards, () => { if (this.active) this.hurt(); });
    this.walls = [level.boss.arenaStartX - 8, level.boss.arenaEndX + 8].map(x => {
      const wall = scene.add.rectangle(x, 122, 16, 244, 0xAA94F7, 0.45).setDepth(9).setVisible(false);
      scene.physics.add.existing(wall, true); (wall.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      scene.physics.add.collider(player, wall); return wall;
    });
    this.stamps = level.boss.phases.paper.stamps.map(({ x, y }, i) => {
      const stamp = scene.physics.add.staticImage(x, y, 'work-stamp').setDepth(12).disableBody(true, true);
      scene.physics.add.overlap(player, stamp, () => {
        const body = player.body as Phaser.Physics.Arcade.Body;
        if (!this.active || run.bossStage !== 'paper' || run.elapsedMs < this.introUntil || this.stampIds.has(i) || body.velocity.y <= 0 || body.prev.y + body.height > (stamp.body as Phaser.Physics.Arcade.StaticBody).top + 7) return;
        this.stampIds.add(i); stamp.setTint(0x73D6AA); player.setVelocityY(-180); audioBus.play('support');
        run.bossProgress = this.stampIds.size;
        if (this.stampIds.size >= level.boss.phases.paper.requiredStamps) this.phase('bridge');
      }); return stamp;
    });
    this.switches = level.boss.phases.bridge.switches.map(s => scene.add.image(s.x, s.y, 'support-switch').setDepth(12).setVisible(false));
    this.core = scene.physics.add.staticImage(level.boss.phases.light.x, level.boss.phases.light.y, 'support-core').setDepth(15).disableBody(true, true);
    scene.physics.add.overlap(player, this.core, () => {
      const body = player.body as Phaser.Physics.Arcade.Body;
      const window = coreWindow(run.elapsedMs - this.phaseStart, level.boss.phases.light);
      if (!this.active || run.bossStage !== 'light' || !window.exposed || this.lastCoreWindow === window.index || body.velocity.y <= 0 || body.prev.y + body.height > this.core.y + 18) return;
      this.lastCoreWindow = window.index; run.bossProgress++; player.setVelocityY(-180); audioBus.play('support');
      if (run.bossProgress >= level.boss.phases.light.coreHitsRequired) this.clear();
    });
    this.hud = scene.add.text(240, 77, '', { fontFamily: UI_FONT, fontSize: '12px', color: '#FFF4D8', backgroundColor: '#41366D', padding: { x: 8, y: 4 } }).setScrollFactor(0).setOrigin(0.5).setDepth(55).setVisible(false);
    this.warning = scene.add.text(240, 102, '', { fontFamily: UI_FONT, fontSize: '11px', color: '#253653', backgroundColor: '#FFD45B', padding: { x: 4, y: 2 } }).setScrollFactor(0).setOrigin(0.5).setDepth(55).setVisible(false);
  }

  begin(): boolean {
    const level = this.definition;
    if (this.active || this.run.bossStage === 'cleared' || !readyForBoss(this.run) || this.run.status !== 'playing') return false;
    this.active = true; this.stampIds.clear(); this.switchIds.clear(); this.lastCoreWindow = -1;
    this.run.stamina = 3; // The checkpoint before the arena is a rest stop for every role.
    (this.player.body as Phaser.Physics.Arcade.Body).reset(level.boss.arenaStartX + 25, 230);
    this.walls.forEach(w => { w.setVisible(true); (w.body as Phaser.Physics.Arcade.StaticBody).enable = true; });
    this.scene.cameras.main.stopFollow().setBounds(level.camera.bossLockFromX, 0, level.camera.bossLockToX - level.camera.bossLockFromX, level.world.height).setScroll(level.camera.bossLockFromX, 0).setBackgroundColor('#7875AE').shake(140, 0.003);
    this.sprite.setVisible(true).setAlpha(1).setScale(1).setPosition(level.boss.x, 112).setTexture('boss-threat');
    this.scene.tweens.add({ targets: this.sprite, y: level.boss.y, duration: 650, ease: 'Bounce.Out' });
    this.introUntil = this.run.elapsedMs + level.boss.entryDurationMs; this.phase('paper');
    return true;
  }

  private phase(stage: 'paper' | 'bridge' | 'light'): void {
    this.run.bossStage = stage; this.run.bossProgress = 0;
    if (stage !== 'paper') this.run.stamina = Math.min(3, this.run.stamina + 1);
    this.phaseStart = Math.max(this.run.elapsedMs, this.introUntil); this.lastWave = -1;
    this.hazards.clear(true, true);
    this.stamps.forEach(s => stage === 'paper' ? s.enableBody(false, 0, 0, true, true).clearTint() : s.disableBody(true, true));
    this.switches.forEach(s => s.setVisible(stage === 'bridge').clearTint());
    if (stage === 'light') this.core.enableBody(false, 0, 0, true, true); else this.core.disableBody(true, true);
    this.sprite.setTexture(stage === 'paper' ? 'boss-threat' : 'boss-disrupted');
    if (stage === 'bridge') {
      const bat = this.hazards.create(this.definition.boss.arenaStartX + 220, 160, 'deadline-bat') as Phaser.Physics.Arcade.Image;
      bat.setData('bat', true).setSize(20, 16).setDepth(17);
    }
    audioBus.play('support');
  }

  interact(): void {
    if (!this.active || this.run.bossStage !== 'bridge') return;
    this.switches.forEach((s, i) => {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y) <= 44 && !this.switchIds.has(i)) {
        this.switchIds.add(i); s.setTint(0x73D6AA); this.run.bossProgress = this.switchIds.size; audioBus.play('support');
      }
    });
    if (this.switchIds.size === this.definition.boss.phases.bridge.switches.length) this.phase('light');
  }

  update(): void {
    if (!this.active) return;
    const level = this.definition;
    const now = this.run.elapsedMs; const age = now - this.phaseStart;
    this.hud.setVisible(true).setText(`過載巨獸 · 負荷 ${this.run.bossStage === 'paper' ? '▰▰▰' : this.run.bossStage === 'bridge' ? '▰▰▱' : '▰▱▱'} ｜ ${script.boss.phaseHints[this.run.bossStage as 'paper' | 'bridge' | 'light']} ${this.run.bossProgress}/${phaseTarget(level.boss, this.run.bossStage)}`);
    if (now < this.introUntil) {
      this.warning.setVisible(true).setText(script.boss.onEntry[now < this.introUntil - level.boss.entryDurationMs / 2 ? 0 : 1].text); return;
    }
    const stage = this.run.bossStage;
    if (stage === 'paper' || stage === 'bridge') {
      const phase = level.boss.phases[stage];
      const wave = paperWave(age, phase);
      this.warning.setVisible(wave.warning).setText('紙張將從右側飛來 · 跳躍或錯開高度');
      if (!wave.warning && wave.index !== this.lastWave) {
        this.lastWave = wave.index;
        Array.from({ length: phase.projectileWaveCount }, (_, i) => {
          const paper = this.hazards.create(level.boss.arenaEndX - 30 + i * 110, 232, 'paper-bolt') as Phaser.Physics.Arcade.Image;
          paper.setDepth(18).setVelocityX(-130 - i * 12).setData('born', now).setData('speed', -130 - i * 12);
        });
      }
    } else {
      const { exposed } = coreWindow(age, level.boss.phases.light);
      this.core.setAlpha(exposed ? 1 : 0.25).setScale(exposed ? 1.1 : 1);
      this.warning.setVisible(true).setText(exposed ? '核心亮起！按住跳躍，落下時接通光球' : '等待核心亮起 · 下一次仍有機會');
    }
    for (const item of [...this.hazards.getChildren()] as Phaser.Physics.Arcade.Image[]) {
      if (item.getData('bat')) item.setVelocity(((level.boss.arenaStartX + level.boss.arenaEndX) / 2 + Math.sin(age / 700) * 115 - item.x) * 8, (148 + Math.sin(age / 450) * 24 - item.y) * 8);
      else if (item.x < level.boss.arenaStartX || now - item.getData('born') > 4500) item.destroy();
      else item.setVelocityX(item.getData('speed') * (stage === 'bridge' ? 1 - 0.3 * this.switchIds.size : 1));
    }
  }

  private clear(): void {
    audioBus.setMusic('clear');
    this.active = false; this.run.bossStage = 'cleared'; this.run.bossProgress = this.definition.boss.phases.light.coreHitsRequired;
    this.release(); this.core.disableBody(true, true);
    this.sprite.setTexture('boss-cleared');
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, scale: 0.4, y: 170, duration: 950 });
    this.hud.setText('支援已接通 · 過載解除！→ 前往亮起的出口');
    this.warning.setVisible(true).setText(script.boss.onClear[0].text);
    audioBus.play('clear'); this.onClear();
  }

  reset(): void {
    if (this.run.bossStage === 'cleared') return;
    this.active = false; this.run.bossStage = 'dormant'; this.run.bossProgress = 0;
    this.release(); this.stamps.forEach(s => s.disableBody(true, true)); this.switches.forEach(s => s.setVisible(false)); this.core.disableBody(true, true);
    this.scene.tweens.killTweensOf(this.sprite); this.sprite.setVisible(false); this.hud.setVisible(false); this.warning.setVisible(false);
  }

  private release(): void {
    this.hazards.clear(true, true);
    this.walls.forEach(w => { w.setVisible(false); (w.body as Phaser.Physics.Arcade.StaticBody).enable = false; });
    const practice = this.run.mode === 'practice' ? stageById(this.run.practiceStage) : undefined;
    this.scene.cameras.main.setBounds(practice?.from ?? 0, 0, practice ? practice.to - practice.from : this.definition.world.width, this.definition.world.height).startFollow(this.player, true, 0.12, 0.12);
  }
}
