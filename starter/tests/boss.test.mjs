import test from 'node:test';
import assert from 'node:assert/strict';
import level from '../../data/level01.json';
import { BossController } from '../src/systems/BossController.ts';
import { coreWindow, paperWave } from '../src/systems/BossRules.ts';
import { createRun } from '../src/systems/RunState.ts';
import { bossScene, entity } from './engine-stub.mjs';

test('configured windows have exact opening/closing boundaries', () => {
  const core = { ...level.boss.phases.light, exposeIntervalMs: 3100, exposeWindowMs: 700 };
  assert.equal(coreWindow(-1, core).exposed, false);
  assert.equal(coreWindow(699, core).exposed, true);
  assert.equal(coreWindow(700, core).exposed, false);
  assert.deepEqual(coreWindow(3100, core), { index: 1, exposed: true });
  const paper = { ...level.boss.phases.paper, telegraphMs: 200, waveIntervalMs: 3200 };
  assert.equal(paperWave(199, paper).warning, true);
  assert.deepEqual(paperWave(200, paper), { index: 0, warning: false });
  assert.deepEqual(paperWave(3200, paper), { index: 1, warning: true });
});
test('editing JSON settings changes actual Boss objects, waves, progression and camera', () => {
  const definition = structuredClone(level);
  Object.assign(definition.boss.phases.paper, { requiredStamps: 1, telegraphMs: 200, waveIntervalMs: 3200, projectileWaveCount: 5 });
  const arena = definition.boss.arenaStartX;
  definition.boss.phases.paper.stamps = [{ x: arena + 132, y: 231 }, { x: arena + 354, y: 230 }];
  definition.boss.phases.bridge.switches.push({ id: 'middle', x: arena + 260, y: 213 });
  Object.assign(definition.boss.phases.light, { x: arena + 255, y: 160, coreHitsRequired: 2, exposeIntervalMs: 3100, exposeWindowMs: 700 });
  definition.camera.bossLockFromX = arena - 10;
  const { scene, images, overlaps, groups, camera } = bossScene();
  const player = entity(); const run = createRun();
  Object.assign(run, { status: 'playing', mode: 'practice', practiceStage: 'boss', bridgeActive: true, encounters: { need: true, relay: true } });
  let clears = 0;
  const boss = new BossController(scene, run, player, () => {}, () => clears++, definition);
  const stamps = images.filter(i => i.key === 'work-stamp');
  const core = images.find(i => i.key === 'support-core');
  assert.deepEqual(stamps.map(s => [s.x, s.y]), [[arena + 132, 231], [arena + 354, 230]]);
  assert.deepEqual([core.x, core.y], [arena + 255, 160]);
  assert.equal(boss.begin(), true);
  assert.deepEqual(camera.bounds, [arena - 10, 0, 490, 270]);
  run.elapsedMs = definition.boss.entryDurationMs + 199; boss.update(); assert.equal(groups[0].items.length, 0);
  run.elapsedMs++; boss.update(); assert.equal(groups[0].items.length, 5);
  boss.update(); assert.equal(groups[0].items.length, 5, 'one wave per interval');
  player.body.velocity.y = 20; overlaps.get(stamps[0])(); assert.equal(run.bossStage, 'bridge');
  boss.update();
  const bat = groups[0].items.find(item => item.getData('bat'));
  assert.ok(bat.x > arena && bat.x < definition.boss.arenaEndX, 'bat spawns inside the relocated arena');
  const batTarget = bat.x + bat.body.velocity.x / 8;
  assert.ok(batTarget > arena && batTarget < definition.boss.arenaEndX, 'bat patrol follows the arena, not its old world position');
  for (const control of definition.boss.phases.bridge.switches.slice(0, 2)) { player.setPosition(control.x, control.y); boss.interact(); }
  assert.equal(run.bossStage, 'bridge', 'all configured switches are required');
  const last = definition.boss.phases.bridge.switches.at(-1); player.setPosition(last.x, last.y); boss.interact();
  assert.equal(run.bossStage, 'light');
  const phaseStart = run.elapsedMs;
  const hit = () => { player.body.velocity.y = 20; overlaps.get(core)(); };
  hit(); hit(); assert.equal(run.bossProgress, 1, 'same window cannot award twice');
  run.elapsedMs = phaseStart + 700; hit(); assert.equal(run.bossProgress, 1, 'closed window cannot award');
  run.elapsedMs = phaseStart + 3100; hit();
  assert.equal(run.bossStage, 'cleared'); assert.equal(run.bossProgress, 2); assert.equal(clears, 1);
  hit(); assert.equal(clears, 1);
  assert.deepEqual(camera.bounds, [5790, 0, 2850, 270], 'practice camera returns to its own section');
});
test('shipped Boss data has valid targets and timings', () => {
  const { paper, bridge, light } = level.boss.phases;
  assert.ok(paper.requiredStamps > 0 && paper.requiredStamps <= paper.stamps.length);
  assert.ok(bridge.switches.length > 0 && light.coreHitsRequired > 0);
  for (const wave of [paper, bridge]) {
    assert.ok(wave.waveIntervalMs > wave.telegraphMs && wave.telegraphMs > 0);
    assert.ok(Number.isInteger(wave.projectileWaveCount) && wave.projectileWaveCount > 0);
  }
  assert.ok(light.exposeIntervalMs > light.exposeWindowMs && light.exposeWindowMs > 0);
});
