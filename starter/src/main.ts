import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/BootScene';
import { TitleScene } from './game/TitleScene';
import { OrganizationScene } from './game/OrganizationScene';
import { CharacterScene } from './game/CharacterScene';
import { PlayScene } from './game/PlayScene';
import { ResultScene } from './game/ResultScene';
import { TrainingScene } from './game/TrainingScene';
import { JourneyScene } from './game/JourneyScene';
import { audioBus } from './systems/AudioBus';
import { responsiveLayout } from './systems/ResponsiveLayout';
import { MOVEMENT } from './systems/Movement';
import level from '../../data/level01.json';

audioBus.install();
responsiveLayout.install();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: level.world.viewportWidth,
  height: level.world.viewportHeight,
  backgroundColor: '#85D6F7',
  pixelArt: true,
  roundPixels: true,
  // Native overlays own their pointer events; do not also hit the canvas underneath.
  input: { windowEvents: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: MOVEMENT.gravity }, fps: MOVEMENT.physicsHz, fixedStep: true, debug: false } },
  scene: [BootScene, TitleScene, OrganizationScene, CharacterScene, TrainingScene, JourneyScene, PlayScene, ResultScene],
};

export const game = new Phaser.Game(config);
responsiveLayout.bind(game);
