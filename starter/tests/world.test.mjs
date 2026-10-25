import test from 'node:test';
import assert from 'node:assert/strict';
import level from '../../data/level01.json';
import { STAGES } from '../src/systems/Journey.ts';
import { activateCheckpoint, createRun } from '../src/systems/RunState.ts';
import { sceneryAnchor, scenerySlices } from '../src/art/sceneryLayout.ts';

test('four contiguous chapters have three times their original map lengths', () => {
  const previousLengths = [520, 610, 800, 950];
  assert.equal(level.world.width, 8640);
  assert.equal(STAGES.length, 4);
  level.acts.forEach((act, index) => {
    const stage = STAGES[index];
    assert.equal(act.toX - act.fromX, previousLengths[index] * 3);
    assert.equal(act.fromX, index ? level.acts[index - 1].toX : 0);
    assert.equal(stage.from, act.fromX); assert.equal(stage.to, act.toX);
    assert.ok(stage.from < stage.spawn && stage.spawn < stage.goal && stage.goal < stage.to);
  });
  assert.equal(STAGES.at(-1).to, level.world.width);
  assert.equal(STAGES.at(-1).goal, level.exit.x);
});

test('story gates, stars and the single-screen Boss remain reachable in their chapters', () => {
  const npc = id => level.npcs.find(n => n.id === id);
  assert.ok(npc('ms-lin').x > STAGES[1].spawn && npc('ms-lin').x < STAGES[1].goal);
  assert.ok(npc('coord').x > STAGES[2].spawn && npc('coord').x < level.bridgeGate.x);
  assert.ok(level.bridgeGate.x < STAGES[2].goal);
  assert.ok(level.boss.arenaStartX > STAGES[3].spawn && level.boss.arenaEndX < level.exit.x);
  assert.equal(level.boss.arenaEndX - level.boss.arenaStartX, 480);
  assert.deepEqual([level.camera.bossLockFromX, level.camera.bossLockToX], [level.boss.arenaStartX, level.boss.arenaEndX]);
  const { paper, bridge, light } = level.boss.phases;
  for (const item of [...paper.stamps, ...bridge.switches, light]) {
    assert.ok(item.x > level.boss.arenaStartX && item.x < level.boss.arenaEndX);
  }
  assert.equal(level.collectibles.length, 3, 'length does not inflate scoring');
  for (const star of level.collectibles) {
    assert.ok(level.platforms.some(p => Math.abs(p.x - star.x) <= p.width / 2 && p.y - p.height / 2 - star.y >= 20 && p.y - p.height / 2 - star.y <= 36));
  }
  for (const collection of [level.platforms, level.enemies, level.npcs, level.checkpoints, level.collectibles]) {
    assert.equal(new Set(collection.map(item => item.id)).size, collection.length);
    for (const item of collection) assert.ok(item.x > 0 && item.x < level.world.width);
  }
  for (const p of level.platforms) assert.ok(p.x - p.width / 2 >= 0 && p.x + p.width / 2 <= level.world.width);
});

test('each chapter has spaced safe rest stops, including immediately before the Boss', () => {
  for (const stage of STAGES) {
    const checkpoints = level.checkpoints.filter(c => c.x > stage.spawn && c.x < stage.goal);
    assert.ok(checkpoints.length >= 2);
    const route = [stage.spawn, ...checkpoints.map(c => c.x), stage.goal];
    for (let i = 1; i < route.length; i++) assert.ok(route[i] > route[i - 1] && route[i] - route[i - 1] <= 1100);
    for (const checkpoint of checkpoints) {
      for (const enemy of level.enemies) {
        const [left, right] = enemy.range ?? [enemy.x, enemy.x];
        assert.ok(checkpoint.x < left - 60 || checkpoint.x > right + 60, 'rest stop is clear of enemy patrols');
      }
    }
  }
  const last = level.checkpoints.at(-1);
  assert.ok(last.x < level.boss.arenaStartX && level.boss.arenaStartX - last.x <= 120);
});

test('new rest stops heal once and preserve stars, events and bridge progress', () => {
  const run = createRun();
  Object.assign(run, { status: 'playing', stamina: 1, collectedStarIds: ['star-1'], encounters: { need: true, relay: true }, bridgeActive: true });
  assert.equal(activateCheckpoint(run, 570), true);
  assert.equal(run.stamina, 3); assert.equal(run.checkpointX, 570);
  assert.deepEqual(run.collectedStarIds, ['star-1']);
  assert.deepEqual(run.encounters, { need: true, relay: true }); assert.equal(run.bridgeActive, true);
  run.stamina = 1;
  assert.equal(activateCheckpoint(run, 570), false);
  assert.equal(activateCheckpoint(run, 100), false); assert.equal(run.stamina, 1);
  run.status = 'cleared'; assert.equal(activateCheckpoint(run, 1190), false);
});

test('parallax chunks cover every camera position within small texture limits', () => {
  for (const scroll of [.1, .35, .75]) {
    const slices = scenerySlices(level.world.width, level.world.viewportWidth, scroll);
    assert.equal(slices[0].x, 0);
    slices.forEach((slice, index) => {
      assert.ok(slice.width > 0 && slice.width <= 1024);
      if (index) assert.equal(slice.x, slices[index - 1].x + slices[index - 1].width);
    });
    const end = slices.at(-1).x + slices.at(-1).width;
    for (const cameraX of [0, 3390, level.world.width - level.world.viewportWidth]) {
      assert.ok(end >= cameraX * scroll + level.world.viewportWidth);
      const worldX = cameraX + level.world.viewportWidth / 2;
      assert.ok(Math.abs(sceneryAnchor(worldX, level.world.viewportWidth, scroll) - cameraX * scroll - level.world.viewportWidth / 2) < .001);
    }
  }
});
