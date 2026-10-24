import test from 'node:test';
import assert from 'node:assert/strict';
import { focusMenu, focusGame, stopButtonActivation } from '../src/systems/NativeMenu.ts';

test('new menus focus after construction, while hidden or removed menus do not steal focus', async () => {
  let focused = 0;
  const root = { isConnected: true, hidden: false, closest: () => null, querySelector: () => ({ focus() { focused++; } }) };
  focusMenu(root); assert.equal(focused, 0);
  await new Promise(queueMicrotask); assert.equal(focused, 1);
  root.hidden = true; focusMenu(root); await new Promise(queueMicrotask); assert.equal(focused, 1);
  root.hidden = false; root.isConnected = false; focusMenu(root); await new Promise(queueMicrotask); assert.equal(focused, 1);
});
test('native Enter/Space activates once; Escape still reaches the game', () => {
  const original = globalThis.HTMLButtonElement;
  globalThis.HTMLButtonElement = class {};
  try {
    for (const key of ['Enter', ' ', 'Escape', 'ArrowDown']) {
      let stopped = false;
      stopButtonActivation({ key, target: new HTMLButtonElement(), stopPropagation() { stopped = true; } });
      assert.equal(stopped, key === 'Enter' || key === ' ');
    }
  } finally { globalThis.HTMLButtonElement = original; }
});
test('reopening a role menu keeps focus on the selected role', async () => {
  let focused = '';
  const root = {
    isConnected: true, hidden: false, closest: () => null,
    querySelector: selector => ({ focus() { focused = selector.includes('aria-pressed') ? 'selected' : 'first'; } }),
  };
  focusMenu(root); await new Promise(queueMicrotask);
  assert.equal(focused, 'selected');
});
test('closing a menu returns focus to the playable region without adding a Tab stop', () => {
  const original = globalThis.document;
  let focused = false;
  const game = { focus() { focused = true; } };
  globalThis.document = { querySelector: () => game };
  try { focusGame(); assert.equal(game.tabIndex, -1); assert.equal(focused, true); }
  finally { globalThis.document = original; }
});
