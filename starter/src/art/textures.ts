import type Phaser from 'phaser';

function block(g: Phaser.GameObjects.Graphics, color: number, x: number, y: number, w: number, h: number): void {
  g.fillStyle(color, 1);
  g.fillRect(x, y, w, h);
}

function makeHero(scene: Phaser.Scene, key: string, jacket: number, accessory: number, type: number, frame = 0): void {
  const g = scene.add.graphics();
  // 原創 20×28 像素小人；固定畫布與 hitbox，動作只改四肢。
  block(g, 0x253653, 5, 0, 11, 9); // 頭髮、輪廓
  block(g, 0xF4C9A1, 6, 5, 9, 8);  // 臉
  block(g, 0x253653, 8, 9, 1, 2);  // 眼睛
  block(g, 0x253653, 13, 9, 1, 2);
  block(g, 0xF9A44C, 10, 11, 3, 1); // 微笑
  block(g, 0x253653, 4, 13, 13, 10); // 衣服輪廓
  block(g, jacket, 5, 14, 11, 9);
  const stride = frame === 1 ? 2 : frame === 2 ? -2 : 0;
  block(g, 0xF4C9A1, 2, frame === 3 ? 10 : 15 + stride, 3, 6);
  block(g, 0xF4C9A1, 16, frame === 3 ? 10 : 15 - stride, 3, 6);
  block(g, 0x253653, 6 - stride, 23, 4, frame === 3 ? 2 : 4);
  block(g, 0x253653, 12 + stride, 23, 4, frame === 3 ? 2 : 4);
  block(g, 0xFFF4D8, 6 - stride, frame === 3 ? 24 : 26, 4, 2);
  block(g, 0xFFF4D8, 12 + stride, frame === 3 ? 24 : 26, 4, 2);
  if (frame === 4) { block(g, 0xF4C9A1, 8, 9, 1, 2); block(g, 0xF4C9A1, 13, 9, 1, 2); block(g, 0x253653, 8, 10, 1, 1); block(g, 0x253653, 13, 10, 1, 1); }
  if (type === 0) { // 家援：肩包
    block(g, accessory, 14, 16, 5, 6); block(g, 0x253653, 13, 14, 1, 8);
  } else if (type === 1) { // 保護：白色護目與徽章
    block(g, accessory, 7, 4, 7, 2); block(g, 0xFFD45B, 14, 16, 2, 3);
  } else if (type === 2) { // 外展：橘色背包與帽子
    block(g, accessory, 4, 14, 3, 8); block(g, accessory, 3, 1, 15, 3);
  } else { // 心衛：髮夾與披肩
    block(g, accessory, 14, 2, 4, 3); block(g, accessory, 1, 15, 4, 7);
  }
  g.generateTexture(key, 20, 28);
  g.destroy();
}

export function buildTextures(scene: Phaser.Scene): void {
  const heroes = [
    ['family', 0xFFD45B, 0x9C644C], ['protect', 0xFF7166, 0xFFF4D8],
    ['outreach', 0x57C6D9, 0xF9A44C], ['mental', 0xAA94F7, 0xFFD45B],
  ] as const;
  heroes.forEach(([id, jacket, accessory], type) => {
    ['', '-run1', '-run2', '-jump', '-blink'].forEach((suffix, frame) => makeHero(scene, `hero-${id}${suffix}`, jacket, accessory, type, frame));
    scene.anims.create({ key: `run-${id}`, frames: [{ key: `hero-${id}-run1` }, { key: `hero-${id}-run2` }], frameRate: 9, repeat: -1 });
    scene.anims.create({ key: `idle-${id}`, frames: [{ key: `hero-${id}`, duration: 1600 }, { key: `hero-${id}-blink`, duration: 160 }], frameRate: 1, repeat: -1 });
  });

  const g = scene.add.graphics();
  // Original NPC sprites; costume and accessories follow the story bible.
  const npcs = [['team-mate', 0x73D6AA], ['ms-lin', 0xAF4960], ['coord', 0x87D4ED], ['mentor', 0xFFF4D8]] as const;
  npcs.forEach(([id, jacket]) => {
    block(g, id === 'ms-lin' ? 0x644848 : 0x253653, 4, 1, 12, 11);
    block(g, 0xF4C9A1, 6, 5, 9, 9);
    block(g, 0x253653, 8, 8, 1, 2); block(g, 0x253653, 13, 8, 1, 2);
    block(g, 0x253653, 4, 14, 13, 12); block(g, jacket, 5, 14, 11, 10);
    block(g, 0xF4C9A1, 2, 15, 3, 8); block(g, 0xF4C9A1, 16, 15, 3, 8);
    block(g, 0x253653, 5, 25, 4, 5); block(g, 0x253653, 12, 25, 4, 5);
    if (id === 'team-mate' || id === 'ms-lin') {
      block(g, 0x9C644C, 13, 19, 7, 7); block(g, 0x253653, 15, 17, 3, 2);
    }
    if (id === 'coord') { block(g, 0x253653, 16, 18, 4, 6); block(g, 0x253653, 18, 14, 1, 5); block(g, 0xFFD45B, 17, 19, 2, 2); }
    if (id === 'mentor') { block(g, 0xAA94F7, 6, 8, 9, 3); block(g, 0xD6A67A, 14, 17, 6, 8); block(g, 0xFFF4D8, 15, 18, 4, 5); }
    g.generateTexture(`npc-${id}`, 20, 30); g.clear();
  });
  // 64×26 的地磚：草與磚
  block(g, 0x253653, 0, 0, 64, 26);
  block(g, 0x73D6AA, 0, 0, 64, 5);
  block(g, 0x4FAE87, 0, 5, 64, 3);
  for (let x = 4; x < 62; x += 17) block(g, 0x96775D, x, 10 + (x % 3), 12, 4);
  for (let x = 0; x < 60; x += 16) block(g, 0xD6A67A, x + 3, 19, 8, 3);
  g.generateTexture('ground', 64, 26); g.clear();

  block(g, 0x253653, 0, 0, 112, 16);
  block(g, 0xF9A44C, 2, 1, 108, 4);
  block(g, 0xD8835F, 3, 6, 106, 5);
  for (let x = 8; x < 110; x += 16) block(g, 0xFFF4D8, x, 12, 6, 2);
  g.generateTexture('platform', 112, 16); g.clear();

  block(g, 0x253653, 1, 3, 18, 15);
  block(g, 0x57C6D9, 3, 5, 14, 12);
  block(g, 0xFFF4D8, 7, 0, 8, 5);
  block(g, 0x253653, 7, 9, 2, 2);
  block(g, 0x253653, 13, 9, 2, 2);
  block(g, 0xFF7166, 10, 14, 4, 2);
  g.generateTexture('paper-slime', 20, 20); g.clear();

  for (let frame = 0; frame < 2; frame++) {
    block(g, 0x253653, 0, frame ? 7 : 1, 31, 9);
    block(g, 0xAA94F7, 2, frame ? 9 : 3, 27, 5);
    block(g, 0x253653, 9, 2, 14, 17);
    block(g, 0xFFD45B, 11, 3, 10, 14);
    block(g, 0xFFF4D8, 12, 6, 8, 8);
    block(g, 0x253653, 16, 7, 1, 5);
    block(g, 0x253653, 14, 10, 3, 1);
    block(g, 0xFF7166, 12, 16, 8, 2);
    g.generateTexture(frame ? 'deadline-bat-flap' : 'deadline-bat', 32, 20); g.clear();
  }
  block(g, 0x253653, 1, 5, 12, 10); block(g, 0xFFF4D8, 3, 6, 7, 7);
  block(g, 0x73D6AA, 3, 7, 7, 3); block(g, 0xFFF4D8, 11, 7, 4, 5);
  block(g, 0x253653, 12, 8, 2, 3); block(g, 0xFFF4D8, 5, 0, 2, 3);
  g.generateTexture('tea', 16, 16); g.clear();

  block(g, 0x253653, 5, 0, 2, 12); block(g, 0x253653, 0, 5, 12, 2);
  block(g, 0xFFD45B, 4, 2, 4, 8); block(g, 0xFFD45B, 1, 5, 10, 2);
  g.generateTexture('star', 12, 12); g.clear();

  block(g, 0x253653, 0, 0, 20, 28); block(g, 0xFFF4D8, 2, 2, 16, 24);
  block(g, 0x73D6AA, 4, 6, 12, 12); block(g, 0x253653, 9, 4, 2, 16);
  g.generateTexture('finish', 20, 28);
  g.clear();
  for (const [key, face] of [['boss-threat', 0], ['boss-disrupted', 1], ['boss-cleared', 2]] as const) {
    block(g, 0x253653, 12, 10, 56, 58); block(g, 0x9E547E, 16, 14, 48, 50);
    block(g, 0x41366D, 2, 25, 16, 31); block(g, 0x41366D, 62, 25, 16, 31);
    block(g, 0xFF7166, 18, 17, 43, 9); block(g, 0xAA94F7, 20, 28, 40, 28);
    for (const x of [2, 58]) for (let i = 0; i < 3; i++) { block(g, 0x253653, x, 10 + i * 5, 20, 5); block(g, 0xFFF4D8, x + 2, 10 + i * 5, 16, 3); }
    for (const x of [23, 47]) {
      block(g, 0x253653, x - 2, 28, 13, 13); block(g, 0xFFD45B, x, 30, 9, 9);
      block(g, 0x253653, x + 4, face === 2 ? 34 : 31, face === 2 ? 5 : 2, face === 2 ? 2 : 6);
      if (face === 1) block(g, 0xFF7166, x + 2, 32, 6, 2);
    }
    block(g, 0x253653, 30, 44, 21, face === 0 ? 4 : 2);
    block(g, face === 2 ? 0xFFD45B : 0x73D6AA, 32, 51, 17, 12);
    block(g, 0xFFF4D8, 38, 52, 4, 10); block(g, 0xFFF4D8, 34, 55, 13, 3);
    block(g, 0x253653, 14, 64, 18, 8); block(g, 0x253653, 48, 64, 18, 8);
    g.generateTexture(key, 80, 72); g.clear();
  }
  block(g, 0x41366D, 2, 4, 20, 18); block(g, 0xAA94F7, 4, 3, 16, 17);
  block(g, 0xFFF4D8, 6, 7, 4, 5); block(g, 0xFFF4D8, 14, 7, 4, 5);
  block(g, 0x253653, 8, 8, 2, 3); block(g, 0x253653, 14, 8, 2, 3);
  block(g, 0xFF7166, 9, 14, 7, 2); block(g, 0xAA94F7, 1, 20, 5, 4); block(g, 0xAA94F7, 18, 20, 5, 4);
  g.generateTexture('signal-ghost', 24, 24); g.clear();
  block(g, 0x253653, 0, 0, 14, 10); block(g, 0xFFF4D8, 1, 1, 12, 8); block(g, 0xFF7166, 3, 3, 5, 2);
  g.generateTexture('paper-bolt', 14, 10); g.clear();
  block(g, 0x253653, 0, 8, 24, 8); block(g, 0xF9A44C, 2, 10, 20, 4); block(g, 0x253653, 7, 0, 10, 10); block(g, 0xFFD45B, 9, 2, 6, 6);
  g.generateTexture('work-stamp', 24, 16); g.clear();
  block(g, 0x253653, 0, 0, 20, 28); block(g, 0x57C6D9, 2, 2, 16, 24); block(g, 0xFFF4D8, 5, 5, 10, 8); block(g, 0xFFD45B, 7, 17, 6, 6);
  g.generateTexture('support-switch', 20, 28); g.clear();
  g.fillStyle(0x253653).fillCircle(14, 14, 14); g.fillStyle(0x73D6AA).fillCircle(14, 14, 12);
  block(g, 0xFFF4D8, 11, 4, 6, 20); block(g, 0xFFD45B, 4, 11, 20, 6);
  g.generateTexture('support-core', 28, 28);
  g.destroy();
}
