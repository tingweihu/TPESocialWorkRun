import Phaser from 'phaser';
import level from '../../../data/level01.json';
import { UI_FONT } from '../game/roles';
import { conversations, encounters, readyForBoss, type DialogueId } from './Encounters';
import type { RunState } from './RunState';
import { stageById } from './Journey';

export class StoryWorld {
  readonly npcs: Phaser.GameObjects.Image[] = [];
  private barrier: Phaser.GameObjects.Rectangle;
  private barrierCollider: Phaser.Physics.Arcade.Collider;
  private lightBridge: Phaser.Physics.Arcade.Image;
  private bridgeLabel: Phaser.GameObjects.Text;
  private checkpointLamps: Phaser.GameObjects.Rectangle[] = [];
  private network: Phaser.GameObjects.Graphics;
  private progress: Phaser.GameObjects.Text;
  private prompt: Phaser.GameObjects.Text;
  private nearest?: typeof level.npcs[number];
  private atEntrance = false;
  private seal: Phaser.GameObjects.Rectangle;
  private exit: Phaser.GameObjects.Image;

  constructor(private scene: Phaser.Scene, private run: RunState,
    private player: Phaser.Physics.Arcade.Sprite, platforms: Phaser.Physics.Arcade.StaticGroup,
    private say: (message: string) => void) {
    for (const npc of level.npcs) {
      // NPCs are scenery/interaction targets: no enemy body, damage or stomp callback.
      this.npcs.push(scene.add.image(npc.x, level.world.groundTopY, `npc-${npc.id}`).setOrigin(0.5, 1).setDepth(12));
      scene.add.text(npc.x, npc.y - 27, conversations[npc.dialogueId as DialogueId].speaker, { fontFamily: UI_FONT, fontSize: '11px', color: '#253653', backgroundColor: '#FFF4D8', padding: { x: 2, y: 1 } }).setOrigin(0.5).setDepth(13);
    }
    const gate = level.bridgeGate;
    // Visible full-height signal curtain prevents simply jumping over the locked base.
    this.barrier = scene.add.rectangle(gate.x, level.world.groundTopY / 2, gate.width, level.world.groundTopY, 0xAA94F7, 0.35).setStrokeStyle(2, 0x41366D).setDepth(11);
    scene.physics.add.existing(this.barrier, true);
    this.barrierCollider = scene.physics.add.collider(player, this.barrier);
    this.lightBridge = platforms.create(gate.x, gate.y, 'platform') as Phaser.Physics.Arcade.Image;
    this.lightBridge.setDisplaySize(gate.width, gate.height).setTint(0x73D6AA).setDepth(10).refreshBody().disableBody(true, true);
    this.bridgeLabel = scene.add.text(gate.x, 92, '訊號中斷\n← 找小連確認連結', { fontFamily: UI_FONT, fontSize: '11px', color: '#41366D', align: 'center', backgroundColor: '#FFF4D8' }).setOrigin(0.5).setDepth(18);
    for (const checkpoint of level.checkpoints) {
      scene.add.rectangle(checkpoint.x, 229, 4, 30, 0x253653).setDepth(5);
      this.checkpointLamps.push(scene.add.rectangle(checkpoint.x + 8, checkpoint.y, 18, 10, 0xA6ABC0).setStrokeStyle(2, 0x253653).setDepth(10));
      scene.add.text(checkpoint.x, 187, '休息站', { fontFamily: UI_FONT, fontSize: '10px', color: '#253653' }).setOrigin(0.5);
    }
    const entranceX = level.boss.arenaStartX;
    const seal = scene.add.rectangle(entranceX + 17, level.world.groundTopY / 2, 34, level.world.groundTopY, 0x41366D, 0.6).setStrokeStyle(3, 0xAA94F7).setDepth(10);
    scene.physics.add.existing(seal, true); scene.physics.add.collider(player, seal);
    this.seal = seal;
    scene.add.image(entranceX + 17, 213, 'finish').setScale(2).setDepth(11);
    scene.add.text(entranceX - 70, 101, '過載廣場\n一起分擔，接通支持', { fontFamily: UI_FONT, fontSize: '13px', color: '#FFF4D8', backgroundColor: '#41366D', align: 'center' }).setOrigin(0.5).setDepth(12);
    // The entrance seal requires both encounters and an active bridge.
    this.exit = scene.add.image(level.exit.x, level.exit.y, 'finish').setDepth(10).setAlpha(0.35);
    scene.add.rectangle(240, 39, 480, 18, 0x253653, 0.92).setScrollFactor(0).setDepth(50);
    this.network = scene.add.graphics().setScrollFactor(0).setDepth(51);
    this.progress = scene.add.text(78, 32, '', { fontFamily: UI_FONT, fontSize: '12px', color: '#FFF4D8' }).setScrollFactor(0).setDepth(51);
    this.prompt = scene.add.text(0, 0, '', { fontFamily: UI_FONT, fontSize: '11px', color: '#253653', backgroundColor: '#FFD45B', padding: { x: 4, y: 3 }, align: 'center' }).setOrigin(0.5).setDepth(40);
    this.refresh();
  }

  refresh(): void {
    const sealed = this.run.bossStage === 'dormant';
    this.seal.setVisible(sealed); (this.seal.body as Phaser.Physics.Arcade.StaticBody).enable = sealed;
    this.exit.setAlpha(this.run.bossStage === 'cleared' ? 1 : 0.35);
    if (this.run.bridgeActive && this.barrier.active) {
      this.barrierCollider.destroy(); this.barrier.destroy();
      this.lightBridge.enableBody(false, 0, 0, true, true).refreshBody();
      this.bridgeLabel.setText('支援光橋已接通').setColor('#253653');
      this.scene.tweens.add({ targets: this.lightBridge, alpha: 0.35, duration: 220, repeat: 3, yoyo: true });
    }
    this.checkpointLamps.forEach((lamp, i) => lamp.setFillStyle(this.run.checkpointX >= level.checkpoints[i].x ? 0xFFD45B : 0xA6ABC0));
    this.network.clear().lineStyle(2, 0xA6ABC0).lineBetween(14, 39, 62, 39);
    [this.run.encounters.need, this.run.encounters.relay, this.run.bridgeActive].forEach((lit, i) => {
      this.network.fillStyle(lit ? 0xFFD45B : 0x5B5978).fillCircle(14 + 24 * i, 39, 5);
    });
  }

  update(): void {
    const act = level.acts.find(a => this.player.x >= a.fromX && this.player.x < a.toX) ?? level.acts[0];
    const objective = !this.run.encounters.need ? '←→ 找林小姐釐清需求' : !this.run.encounters.relay ? '→ 找小連接通光橋' : this.run.bossStage === 'cleared' ? '→ 走向亮起的出口' : this.run.bossStage !== 'dormant' ? '共同分擔過載，接通支持' : '→ 前往過載廣場入口';
    const practice = this.run.mode === 'practice' ? stageById(this.run.practiceStage) : undefined;
    this.progress.setText(`${act.title} ｜ ${practice?.objective ?? objective}`);
    this.nearest = level.npcs.filter(n => Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y) <= (encounters.find(e => e.npcId === n.id)?.interactionRangePx ?? 44))
      .sort((a, b) => Math.abs(a.x - this.player.x) - Math.abs(b.x - this.player.x))[0];
    this.atEntrance = this.run.bossStage === 'dormant' && Math.abs(this.player.x - level.boss.arenaStartX) <= 44 && this.player.y > 185;
    this.prompt.setVisible(!!this.nearest || this.atEntrance);
    if (this.nearest) this.prompt.setPosition(this.nearest.x, this.nearest.y - 49).setText('[E / Enter] 交談');
    else if (this.atEntrance) this.prompt.setPosition(level.boss.arenaStartX - 65, 163).setText(readyForBoss(this.run) ? '[E / Enter] 進入廣場\n休息整備 · EN 補滿' : '← 回頭找林小姐完成需求事件');
    for (const checkpoint of level.checkpoints) {
      if (this.run.checkpointX < checkpoint.x && Phaser.Math.Distance.Between(this.player.x, this.player.y, checkpoint.x, checkpoint.y) <= 35) {
        this.run.checkpointX = checkpoint.x; this.refresh(); this.say('休息站已點亮 · 重生保留星星、事件與光橋');
      }
    }
  }

  interact(open: (id: DialogueId, npcId: string) => void): boolean {
    if (this.nearest) open(this.nearest.dialogueId as DialogueId, this.nearest.id);
    else if (this.atEntrance && readyForBoss(this.run)) return true;
    else if (this.atEntrance) this.say('入口仍在等候需求線索 · 可以回頭找林小姐');
    return false;
  }

  hidePrompt(): void { this.prompt.setVisible(false); }
}
