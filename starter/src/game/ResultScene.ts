import Phaser from 'phaser';
import { ROLES } from './roles';
import { getRun } from '../systems/RunState';
import { completedSnapshot } from '../systems/ScoreCalculator';
import { ResultPanel } from '../systems/ResultPanel';
import { audioBus } from '../systems/AudioBus';
import { responsiveLayout } from '../systems/ResponsiveLayout';

// Trust only the shared RunState; Scene payloads never confer completion.
export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(): void {
    responsiveLayout.setScreen('menu');
    audioBus.setMusic('clear'); audioBus.setPaused(false);
    const run = getRun(this.registry);
    const snapshot = completedSnapshot(run);
    if (snapshot) {
      this.cameras.main.setBackgroundColor('#41366D');
      for (let i = 0; i < 4; i++) {
        this.add.sprite(120 + i * 80, 232, `hero-${ROLES[i].id}`).play(`idle-${ROLES[i].id}`).setScale(2);
        this.add.rectangle(90 + i * 80, 204, 3, 66, 0x253653);
        this.add.circle(90 + i * 80, 168, 9, 0xFFD45B);
      }
      const manager = this.input.keyboard!.manager; const previous = manager.enabled;
      manager.enabled = false;
      const panel = new ResultPanel(this, snapshot);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { panel.destroy(); manager.enabled = previous; this.input.keyboard?.resetKeys(); });
      return;
    }
    this.scene.start('Title');
  }
}
