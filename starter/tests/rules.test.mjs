import test from 'node:test';
import assert from 'node:assert/strict';
import level from '../../data/level01.json';
import { createRun, normalizeOrganization, truncateOrganization, collectStar } from '../src/systems/RunState.ts';
import { completeEncounter } from '../src/systems/Encounters.ts';
import { completedSnapshot, finishRun, calculateScore } from '../src/systems/ScoreCalculator.ts';
import { MOVEMENT } from '../src/systems/Movement.ts';
import { PlayerController } from '../src/systems/PlayerController.ts';
import { entity } from './engine-stub.mjs';

test('invisible-only names fall back; visible text and joined emoji remain', () => {
  for (const input of ['', '  ', '\u200b', '\u2060', '\u200d\ufe0f', '\u034f']) assert.equal(normalizeOrganization(input), '冒險者');
  assert.equal(normalizeOrganization('小\u200b光\u2060'), '小光');
  assert.equal(normalizeOrganization('  小光  同學  '), '小光 同學');
  assert.equal(normalizeOrganization('👨‍👩‍👧‍👦'), '👨‍👩‍👧‍👦');
  assert.equal(normalizeOrganization('e\u0301'), 'é');
});
test('30 code points is a ceiling, not 30 graphemes; no partial emoji or combining sequence', () => {
  assert.equal(normalizeOrganization('光'.repeat(31)), '光'.repeat(30));
  assert.equal(normalizeOrganization('👨‍👩‍👧‍👦'.repeat(5)), '👨‍👩‍👧‍👦'.repeat(4));
  assert.equal(truncateOrganization('光'.repeat(29) + '👋🏽'), '光'.repeat(29));
  assert.equal(truncateOrganization('光'.repeat(28) + '👋🏽'), '光'.repeat(28) + '👋🏽');
});

function controller() {
  const player = entity(); player.body.blocked = { down: true };
  const keys = {};
  for (const name of 'LEFT,RIGHT,A,D,SPACE,Z,J,X,ESC,P,E,ENTER,UP,DOWN'.split(',')) keys[name] = { isDown: false, on() {}, reset() {} };
  return { player, control: new PlayerController(player, { addKeys: () => keys }) };
}
test('all required platforms have at least 8 world pixels of full-jump clearance', () => {
  const { player, control } = controller();
  control.setTouch('jump', true); control.update(0);
  let bottom = 0, apex = 0;
  player.body.blocked.down = false;
  for (let frame = 1; frame <= 60; frame++) {
    player.body.velocity.y += MOVEMENT.gravity / MOVEMENT.physicsHz;
    bottom += player.body.velocity.y / MOVEMENT.physicsHz;
    apex = Math.min(apex, bottom);
    control.update(frame * 1000 / MOVEMENT.physicsHz);
  }
  for (const platform of level.platforms) {
    const rise = level.world.groundTopY - (platform.y - platform.height / 2);
    assert.ok(rise <= -apex - 8, `${platform.id}: ${rise}px needs more clearance`);
  }
});
test('jump release, coyote time, buffering and reset preserve input boundaries', () => {
  let { player, control } = controller();
  control.update(0); player.body.blocked.down = false;
  control.setTouch('jump', true); control.update(90);
  assert.equal(player.body.velocity.y, MOVEMENT.jumpVelocity);
  control.setTouch('jump', false); control.update(95);
  assert.equal(player.body.velocity.y, MOVEMENT.shortJumpVelocity);
  player.body.velocity.y = 0; control.setTouch('jump', true); control.update(99);
  assert.equal(player.body.velocity.y, 0, 'cannot jump twice while airborne');
  ({ player, control } = controller());
  player.body.blocked.down = false; control.setTouch('jump', true); control.update(0);
  player.body.blocked.down = true; control.update(100);
  assert.equal(player.body.velocity.y, MOVEMENT.jumpVelocity, 'buffered jump fires on landing');
  control.reset(); player.body.velocity.y = 0; control.update(120);
  assert.equal(player.body.velocity.y, 0, 'reset clears buffered/held jump');
});
test('events remain idempotent; practice cannot produce a formal score', () => {
  const run = createRun(); run.status = 'playing'; run.startedAt = new Date(0).toISOString();
  assert.equal(completeEncounter(run, 'need', 'promise'), false);
  assert.equal(finishRun(run), false);
  assert.equal(completeEncounter(run, 'need', 'listen'), true);
  assert.equal(completeEncounter(run, 'need', 'listen'), false);
  assert.equal(completeEncounter(run, 'relay', 'confirm'), true);
  assert.equal(run.bridgeActive, true);
  run.bossStage = 'cleared';
  for (const star of level.collectibles) { assert.equal(collectStar(run, star.id, level.collectibles.map(s => s.id)), true); assert.equal(collectStar(run, star.id, level.collectibles.map(s => s.id)), false); }
  assert.equal(collectStar(run, 'invented', level.collectibles.map(s => s.id)), false);
  run.mode = 'practice'; assert.equal(finishRun(run), false); assert.equal(completedSnapshot(run), null);
  run.mode = 'story'; assert.equal(finishRun(run), true);
  const snapshot = completedSnapshot(run); assert.equal(calculateScore(snapshot).score, 1800);
  run.collectedStarIds.length = 0; assert.equal(calculateScore(snapshot).score, 1800);
  assert.ok(Object.isFrozen(snapshot.encounters));
});
