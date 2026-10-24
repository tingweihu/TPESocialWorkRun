import Phaser from 'phaser';
import { focusGame, focusMenu } from '../systems/NativeMenu';
import { drawTaipeiCity } from '../art/taipei';
import level from '../../../data/level01.json';
import { ROLES, UI_FONT } from './roles';
import { collectStar, createRun, getRun, type RunState } from '../systems/RunState';
import { PlayerController } from '../systems/PlayerController';
import { DialogueController } from '../systems/DialogueController';
import { StoryWorld } from '../systems/StoryWorld';
import { BossController } from '../systems/BossController';
import { finishRun } from '../systems/ScoreCalculator';
import { audioBus } from '../systems/AudioBus';
import { stageById, type JourneyLaunch } from '../systems/Journey';
import { BossGuide } from '../systems/BossGuide';
import { TouchControls } from '../systems/TouchControls';
import { compactPanel, menuButton, responsiveLayout } from '../systems/ResponsiveLayout';

type Enemy = { sprite: Phaser.Physics.Arcade.Sprite; type: string; x: number; y: number; left: number; right: number; direction: number; phase: number };

export class PlayScene extends Phaser.Scene {
  private run!: RunState;
  private player!: Phaser.Physics.Arcade.Sprite;
  private controller!: PlayerController;
  private dialogue!: DialogueController;
  private story!: StoryWorld;
  private boss!: BossController;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies: Enemy[] = [];
  private stars: Phaser.Physics.Arcade.Image[] = [];
  private hud!: Phaser.GameObjects.Text;
  private notice!: Phaser.GameObjects.Text;
  private skillEffect!: Phaser.GameObjects.Graphics;
  private fog!: Phaser.GameObjects.Graphics;
  private pausePanel!: Phaser.GameObjects.Container;
  private paused = false;
  private lastTick = 0;
  private invulnerableUntil = 0;
  private skillUntil = 0;
  private skillReadyAt = 0;
  private noticeUntil = 0;
  private shield = false;
  private supplyUsed = false;
  private supply?: Phaser.Physics.Arcade.Image;
  private guide?: BossGuide;
  private guideWasPaused = false;
  private launch: JourneyLaunch = {};
  private practice?: ReturnType<typeof stageById>;
  private wasGrounded = false;
  private shadow!: Phaser.GameObjects.Ellipse;
  private hudValue = '';
  private bossHelpSeen = false;
  private touchControls!: TouchControls;
  private pauseOverlay!: HTMLElement;

  constructor() { super('Play'); }

  create(data: JourneyLaunch = {}): void {
    responsiveLayout.setScreen('play');
    this.launch = data; this.practice = data.mode === 'practice' ? stageById(data.stage) : undefined;
    const preferences = getRun(this.registry);
    const spawnX = this.practice?.spawn ?? level.spawn.x;
    this.run = createRun(preferences.organizationName, preferences.role, spawnX);
    if (this.practice) {
      this.run.mode = 'practice'; this.run.practiceStage = this.practice.id;
      // Isolated chapter setup never confers formal completion or a scorecard.
      this.run.encounters.need = ['river', 'boss'].includes(this.practice.id);
      this.run.encounters.relay = this.practice.id === 'boss'; this.run.bridgeActive = this.practice.id === 'boss';
    }
    audioBus.setMusic('city'); audioBus.setPaused(false);
    this.run.status = 'playing';
    this.run.startedAt = new Date().toISOString();
    this.registry.set('runState', this.run);
    this.enemies = []; this.stars = []; this.supply = undefined;
    this.paused = false; this.invulnerableUntil = 0; this.skillUntil = 0;
    this.skillReadyAt = 0; this.noticeUntil = 0; this.shield = false; this.supplyUsed = false;
    this.lastTick = performance.now();
    this.guide = undefined; this.hudValue = ''; this.wasGrounded = false; this.bossHelpSeen = false;
    this.cameras.main.setBackgroundColor('#85D6F7');
    const from = this.practice?.from ?? 0, width = this.practice ? this.practice.to - from : level.world.width;
    this.physics.world.setBounds(from, 0, width, level.world.height);
    this.cameras.main.setBounds(from, 0, width, level.world.height);
    this.drawCity();
    this.platforms = this.physics.add.staticGroup();
    for (let x = 32; x < level.world.width; x += 64) this.platforms.create(x, level.world.groundTopY + 13, 'ground');
    for (const p of level.platforms) {
      const tile = this.platforms.create(p.x, p.y, 'platform') as Phaser.Physics.Arcade.Image;
      tile.setDisplaySize(p.width, p.height).refreshBody();
    }
    this.shadow = this.add.ellipse(spawnX, 242, 17, 4, 0x253653, .18).setDepth(6);
    this.player = this.physics.add.sprite(spawnX, level.spawn.y, `hero-${this.run.role}`);
    this.player.setCollideWorldBounds(true).setDepth(20).setSize(14, 26).setOffset(3, 2);
    this.physics.add.collider(this.player, this.platforms);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.controller = new PlayerController(this.player, this.input.keyboard!);
    this.touchControls = new TouchControls(this, this.controller);
    for (const item of level.collectibles) {
      const star = this.physics.add.staticImage(item.x, item.y, 'star').setDepth(10);
      star.setData('id', item.id);
      this.stars.push(star);
      this.physics.add.overlap(this.player, star, () => {
        if (!star.active || !collectStar(this.run, item.id, level.collectibles.map(s => s.id))) return;
        this.sparkle(star.x, star.y, 0xFFD45B);
        star.destroy();
        audioBus.play('star');
        this.say('協作星 +1 · 合作讓城市更亮');
      });
    }
    for (const config of level.enemies.filter(e => ['paperSlime', 'deadlineBat', 'signalGhost'].includes(e.type))) {
      const bat = config.type === 'deadlineBat';
      const ghost = config.type === 'signalGhost';
      const sprite = this.physics.add.sprite(config.x, config.y, ghost ? 'signal-ghost' : bat ? 'deadline-bat' : 'paper-slime').setDepth(15);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(!bat && !ghost);
      sprite.setSize(bat ? 19 : 18, 18).setOffset(bat ? 6 : 1, 1);
      if (!bat && !ghost) this.physics.add.collider(sprite, this.platforms);
      this.enemies.push({ sprite, type: config.type, x: config.x, y: config.y, left: config.range![0], right: config.range![1], direction: 1, phase: 0 });
      this.physics.add.overlap(this.player, sprite, () => this.touchEnemy(sprite));
    }
    this.fog = this.add.graphics().setDepth(17);
    const fogX = level.enemies.find(e => e.type === 'stigmaFog')!.x;
    for (let i = 0; i < 6; i++) {
      this.fog.fillStyle(0x41366D, 0.2);
      this.fog.fillRect(fogX - 70 + i * 24, 165 + (i % 2) * 12, 42, 56);
    }
    this.story = new StoryWorld(this, this.run, this.player, this.platforms, message => this.say(message));
    this.boss = new BossController(this, this.run, this.player, () => this.hurt(), () => {
      this.enemies.forEach(enemy => enemy.sprite.disableBody(true, true));
      this.story.refresh(); this.sparkle(this.player.x, 190, 0xFFD45B);
      this.say('怪物退了，城市裡還有很多路要一起走。', 5000);
    });
    this.dialogue = new DialogueController(this, this.run, () => {
      this.controller.reset(); this.player.setVelocity(0, 0); this.syncSimulation();
    }, id => {
      this.story.refresh();
      audioBus.play('support');
      this.sparkle(this.player.x, this.player.y - 20, 0xFFD45B);
      this.say(id === 'need' ? '需求線索已點亮 · 接著找小連確認連結' : '資源訊號已接通 · 光橋亮起了！');
    });
    this.skillEffect = this.add.graphics().setDepth(25);
    this.add.rectangle(240, 16, 480, 32, 0x253653, 0.95).setScrollFactor(0).setDepth(50);
    this.hud = this.add.text(10, 16, '', { fontFamily: UI_FONT, fontSize: '12px', color: '#FFF4D8' }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(51);
    this.notice = this.add.text(240, 60, '', { fontFamily: UI_FONT, fontSize: '11px', color: '#253653', backgroundColor: '#FFF4D8', padding: { x: 5, y: 3 } }).setOrigin(0.5).setScrollFactor(0).setDepth(51);
    this.createPause();
    this.say(this.practice ? `自由練習 · ${this.practice.objective}` : '← → 移動 · Space 跳躍 · J 技能 · E 交談 · H 攻略', 6000);
    const controls = new AbortController();
    const help = document.querySelector<HTMLButtonElement>('#boss-help'), map = document.querySelector<HTMLButtonElement>('#journey-menu');
    if (help) { help.hidden = false; help.addEventListener('click', () => this.openGuide(), { signal: controls.signal }); }
    if (map) { map.hidden = false; map.addEventListener('click', () => this.scene.start('Journey', {}), { signal: controls.signal }); }
    this.input.keyboard!.addKey('H').on('down', () => this.openGuide());
    const resetClock = (): void => { this.lastTick = performance.now(); this.controller.reset(); };
    const onBlur = (): void => { if (this.guide) this.guideWasPaused = true; if (!this.paused) this.togglePause(); resetClock(); };
    const onVisibility = (): void => { if (document.hidden) onBlur(); else resetClock(); };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      controls.abort(); if (help) help.hidden = true; if (map) map.hidden = true;
      this.guide?.destroy(); this.guide = undefined;
      audioBus.setPaused(false);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      this.input.keyboard?.resetKeys();
    });
  }

  private drawCity(): void { drawTaipeiCity(this); }

  private touchEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!enemy.active || this.paused || this.guide || this.run.bossStage === 'cleared') return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const target = enemy.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y > 0 && body.prev.y + body.height <= target.top + 5) {
      this.sparkle(enemy.x, enemy.y, 0xFFF4D8);
      enemy.disableBody(true, true);
      this.player.setVelocityY(-180);
      audioBus.play('star');
      this.say('障礙解除！');
    } else this.hurt();
  }

  private hurt(): void {
    if (this.run.bossStage === 'cleared' || this.dialogue.active || this.paused || this.guide) return;
    const now = this.run.elapsedMs;
    if (now < this.invulnerableUntil) return;
    if (this.shield && now < this.skillUntil) {
      this.shield = false; this.skillUntil = 0; this.invulnerableUntil = now + 900;
      this.say('安全護盾擋下這次接觸'); return;
    }
    this.run.stamina--;
    audioBus.play('hurt');
    this.invulnerableUntil = now + 900;
    this.cameras.main.shake(90, 0.004);
    if (this.run.stamina <= 0) this.respawn();
    else this.say('EN -1 · 從上方踩中障礙，或跳過它');
  }

  private respawn(): void {
    this.boss.reset();
    audioBus.setMusic('city');
    if (this.practice) this.cameras.main.setBounds(this.practice.from, 0, this.practice.to - this.practice.from, level.world.height);
    this.run.stamina = 3;
    const checkpointY = level.checkpoints.find(c => c.x === this.run.checkpointX)?.y ?? level.spawn.y;
    (this.player.body as Phaser.Physics.Arcade.Body).reset(this.run.checkpointX, checkpointY);
    this.player.setVelocity(0, 0);
    this.controller.reset();
    this.shield = false; this.skillUntil = 0; this.skillReadyAt = 0; this.supplyUsed = false;
    this.supply?.destroy(); this.supply = undefined;
    this.invulnerableUntil = this.run.elapsedMs + 900;
    for (const enemy of this.enemies) {
      enemy.sprite.enableBody(true, enemy.x, enemy.y, true, true).setVelocity(0, 0);
      enemy.direction = 1; enemy.phase = 0;
    }
    this.story.refresh();
    this.say('回到休息點 · 星星、事件與光橋進度保留');
  }

  private activateSkill(): void {
    const now = this.run.elapsedMs;
    if (now < this.skillReadyAt) return;
    const role = ROLES.find(r => r.id === this.run.role)!;
    if (role.id === 'outreach' && this.supplyUsed) { this.say('這條生命已使用補給；重生後可再次使用'); return; }
    this.skillReadyAt = now + role.cooldownMs;
    this.skillUntil = now + role.durationMs;
    if (role.id === 'protect') this.shield = true;
    if (role.id === 'outreach') {
      if (this.supply?.active) this.supply.destroy();
      this.supply = this.physics.add.image(this.player.x + (this.player.flipX ? -24 : 24), this.player.y - 24, 'tea').setDepth(18).setCollideWorldBounds(true);
      const groundContact = this.physics.add.collider(this.supply, this.platforms);
      const pickup = this.supply;
      const pickupContact = this.physics.add.overlap(this.player, pickup, () => {
        if (!pickup.active || this.run.stamina >= 3) return;
        this.run.stamina = Math.min(3, this.run.stamina + 1);
        this.supplyUsed = true;
        pickup.destroy();
        this.say('喘息茶 EN +1 · 這條生命已補給');
      });
      pickup.once(Phaser.GameObjects.Events.DESTROY, () => {
        // Destroyed objects do not unregister Arcade colliders themselves.
        if (groundContact.world) groundContact.destroy();
        if (pickupContact.world) pickupContact.destroy();
      });
    }
    this.say(role.id === 'outreach' ? '補給已放下 · 受傷後靠近可恢復 1 EN' : `${role.ability}啟動！`);
  }

  private updateEffects(): void {
    const now = this.run.elapsedMs;
    this.skillEffect.clear();
    this.fog.setAlpha(this.run.role === 'mental' && now < this.skillUntil ? 0.08 : 1);
    if (now < this.skillUntil && this.run.role === 'protect' && this.shield) {
      this.skillEffect.lineStyle(2, 0xFF7166); this.skillEffect.strokeCircle(this.player.x, this.player.y, 22);
    }
    if (now < this.skillUntil && this.run.role === 'family') {
      const nearest = [...this.stars.filter(s => s.active), ...this.story.npcs].sort((a, b) => Math.abs(a.x - this.player.x) - Math.abs(b.x - this.player.x)).slice(0, 3);
      this.skillEffect.lineStyle(2, 0xFFD45B);
      nearest.forEach(s => { this.skillEffect.strokeCircle(s.x, s.y, 15); this.skillEffect.lineBetween(this.player.x, this.player.y - 20, s.x, s.y); });
    }
    if (now < this.skillUntil && this.run.role === 'mental') {
      this.skillEffect.lineStyle(2, 0xAA94F7); this.skillEffect.lineBetween(this.player.x, 238, Math.min(this.player.x + 160, level.world.width), 238);
      this.skillEffect.strokeTriangle(this.player.x + 34, 220, this.player.x + 44, 226, this.player.x + 34, 232);
    }
    this.player.setAlpha(now < this.invulnerableUntil && Math.floor(now / 90) % 2 === 0 ? 0.4 : 1);
  }

  private createPause(): void {
    const shade = this.add.rectangle(240, 135, 480, 270, 0x253653, 0.88);
    const title = this.add.text(240, 25, '稍作喘息', { fontFamily: UI_FONT, fontSize: '20px', color: '#FFD45B' }).setOrigin(0.5);
    const organization = this.add.text(240, 43, this.run.organizationName, { fontFamily: UI_FONT, fontSize: '12px', color: '#FFF4D8', wordWrap: { width: 420, useAdvancedWrap: true }, align: 'center' }).setOrigin(0.5, 0);
    const actions: Phaser.GameObjects.GameObject[] = [shade, title, organization];
    [['繼續冒險 · Esc / P', () => this.togglePause()], ['Boss 怎麼打？ · H', () => this.openGuide()], ['關卡地圖 · 換關重新開始', () => this.scene.start('Journey', {})], ['重新挑戰', () => this.scene.restart(this.launch)], ['換角色／修改姓名', () => this.scene.start('Character')], ['返回主選單', () => this.scene.start('Title')]].forEach(([label, action], i) => {
      actions.push(this.add.text(240, 88 + i * 29, label as string, { fontFamily: UI_FONT, fontSize: '14px', color: '#FFF4D8' }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true }).on('pointerdown', action as () => void));
    });
    this.pausePanel = this.add.container(0, 0, actions).setScrollFactor(0).setDepth(100).setVisible(false);
    const mobile = compactPanel(this, '稍作喘息', 'pause-overlay'); this.pauseOverlay = mobile.parentElement!; this.pauseOverlay.hidden = true;
    const heading = document.createElement('h2'); heading.textContent = '稍作喘息';
    const name = document.createElement('p'); name.textContent = this.run.organizationName; mobile.append(heading, name);
    const buttons = document.createElement('div'); buttons.className = 'pause-actions'; mobile.append(buttons);
    menuButton(buttons, '繼續冒險', () => this.togglePause()).className = 'primary';
    menuButton(buttons, 'Boss 攻略', () => this.openGuide());
    menuButton(buttons, '關卡地圖', () => this.scene.start('Journey', {}));
    menuButton(buttons, '重新挑戰', () => this.scene.restart(this.launch));
    menuButton(buttons, '換角色／修改姓名', () => this.scene.start('Character'));
    menuButton(buttons, '返回主選單', () => this.scene.start('Title'));
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.pausePanel.setVisible(this.paused);
    this.pauseOverlay.hidden = !this.paused;
    this.dialogue.setPaused(this.paused);
    this.syncSimulation();
    this.controller.reset(); this.lastTick = performance.now();
    if (this.paused) focusMenu(this.pauseOverlay);
    else if (!this.dialogue.active) focusGame();
  }

  private syncSimulation(): void {
    const modal = this.paused || this.dialogue.active || !!this.guide;
    responsiveLayout.setScreen(modal ? 'menu' : 'play');
    this.touchControls.setEnabled(!modal);
    if (this.paused || this.dialogue.active || this.guide) { this.physics.pause(); this.player.anims.pause(); }
    else { this.physics.resume(); this.player.anims.resume(); }
    if (this.paused || this.guide) this.tweens.pauseAll(); else this.tweens.resumeAll();
    audioBus.setPaused(this.paused || !!this.guide || this.dialogue.active);
  }

  private openGuide(): void {
    if (this.guide) return;
    this.guideWasPaused = this.paused;
    this.controller.reset(); this.player.setVelocity(0, 0);
    this.guide = new BossGuide(this, () => {
      this.guide?.destroy(); this.guide = undefined;
      this.paused = this.guideWasPaused; this.controller.reset(); this.lastTick = performance.now(); this.syncSimulation();
    });
    this.syncSimulation();
  }

  private sparkle(x: number, y: number, color: number): void {
    for (let i = 0; i < 6; i++) {
      const piece = this.add.rectangle(x, y, 3, 3, color).setDepth(30);
      this.tweens.add({ targets: piece, x: x + Math.cos(i) * 24, y: y - 12 + Math.sin(i) * 20, alpha: 0, duration: 350, onComplete: () => piece.destroy() });
    }
  }

  private say(text: string, duration = 2400): void { this.notice.setText(text); this.noticeUntil = this.run.elapsedMs + duration; }

  update(): void {
    const tick = performance.now();
    const delta = Math.min(50, tick - this.lastTick);
    this.lastTick = tick;
    if (this.guide) return;
    if (this.dialogue.active && !this.paused && this.controller.escapePressed()) {
      this.dialogue.close(); return;
    }
    if (this.controller.pausePressed()) this.togglePause();
    if (this.paused || document.hidden) return;
    this.run.elapsedMs += delta;
    const storyInput = this.controller.storyInput();
    if (this.dialogue.active) {
      this.dialogue.handle(storyInput); this.story.hidePrompt(); return;
    }
    this.story.update();
    if (storyInput.confirm) {
      if (this.story.interact((id, npcId) => this.dialogue.open(id, npcId))) {
        this.controller.reset(); this.boss.begin(); audioBus.setMusic('boss'); this.story.refresh();
        if (!this.bossHelpSeen) { this.bossHelpSeen = true; this.openGuide(); }
        return;
      }
      if (this.boss.active) this.boss.interact();
      if (this.dialogue.active) return;
    }
    this.controller.update(this.run.elapsedMs);
    if (this.controller.skillPressed()) this.activateSkill();
    for (const enemy of this.enemies) {
      if (!enemy.sprite.active) continue;
      if (enemy.type === 'paperSlime') {
        if (enemy.sprite.x >= enemy.right) enemy.direction = -1;
        if (enemy.sprite.x <= enemy.left) enemy.direction = 1;
        enemy.sprite.setVelocityX(enemy.direction * 38).setFlipX(enemy.direction < 0);
      } else if (enemy.type === 'signalGhost') {
        if (this.run.encounters.relay) { enemy.sprite.disableBody(true, true); continue; }
        enemy.phase += delta / 1000;
        const visible = Math.sin(enemy.phase * 2) > -0.25;
        enemy.sprite.setAlpha(visible ? 0.8 : 0.2);
        (enemy.sprite.body as Phaser.Physics.Arcade.Body).enable = visible;
        enemy.sprite.setPosition((enemy.left + enemy.right) / 2 + Math.sin(enemy.phase) * 70, enemy.y + Math.sin(enemy.phase * 2) * 20);
      } else {
        enemy.phase += delta / 1000;
        const dive = Math.max(0, Math.sin(enemy.phase * 1.15)) ** 12 * 78;
        const x = (enemy.left + enemy.right) / 2 + Math.sin(enemy.phase * 1.8) * (enemy.right - enemy.left) / 2;
        const y = enemy.y + Math.sin(enemy.phase * 3.6) * 12 + dive;
        enemy.sprite.setVelocity((x - enemy.sprite.x) * 8, (y - enemy.sprite.y) * 8);
        enemy.sprite.setTexture(Math.sin(enemy.phase * 12) > 0 ? 'deadline-bat' : 'deadline-bat-flap');
      }
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.shadow.setPosition(this.player.x, Math.min(242, body.bottom + 3)).setAlpha(body.blocked.down ? .2 : .08);
    if (body.blocked.down && !this.wasGrounded) {
      const puff = this.add.ellipse(this.player.x, body.bottom, 18, 3, 0xFFF4D8, .6).setDepth(19);
      this.tweens.add({ targets: puff, scaleX: 1.5, alpha: 0, duration: 180, onComplete: () => puff.destroy() });
    }
    this.wasGrounded = body.blocked.down;
    if (!body.blocked.down) { this.player.anims.stop(); this.player.setTexture(`hero-${this.run.role}-jump`); }
    else this.player.play(`${Math.abs(body.velocity.x) > 0 ? 'run' : 'idle'}-${this.run.role}`, true);
    this.updateEffects();
    this.boss.update();
    const role = ROLES.find(r => r.id === this.run.role)!;
    const cooldown = Math.max(0, Math.ceil((this.skillReadyAt - this.run.elapsedMs) / 1000));
    const hud = `EN ${'♥'.repeat(this.run.stamina)}${'♡'.repeat(3 - this.run.stamina)}  ${role.name}   ★ ${this.run.collectedStarIds.length}/3   ${role.ability} ${cooldown ? `${cooldown}s` : '[J]'}${this.practice ? ' · 練習' : ''}`;
    if (hud !== this.hudValue) { this.hudValue = hud; this.hud.setText(hud); }
    this.notice.setVisible(this.run.elapsedMs < this.noticeUntil);
    if (this.player.y > level.world.height + 20) this.respawn();
    if (this.practice && this.player.x >= this.practice.goal) {
      const complete = this.practice.id === 'beimen' || (this.practice.id === 'dihua' && this.run.encounters.need) || (this.practice.id === 'river' && this.run.bridgeActive) || (this.practice.id === 'boss' && this.run.bossStage === 'cleared');
      if (complete) { this.scene.start('Journey', { completed: this.practice.id }); return; }
    }
    if (this.player.x >= level.exit.x && finishRun(this.run)) {
      this.physics.pause(); this.scene.start('Result');
    }
  }
}
