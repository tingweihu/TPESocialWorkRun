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

audioBus.install();
responsiveLayout.install();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 480,
  height: 270,
  backgroundColor: '#85D6F7',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 860 }, debug: false } },
  scene: [BootScene, TitleScene, OrganizationScene, CharacterScene, TrainingScene, JourneyScene, PlayScene, ResultScene],
};

export const game = new Phaser.Game(config);
responsiveLayout.bind(game);
