/** Focus after a scene has finished constructing its native controls. */
export function focusMenu(root: HTMLElement): void {
  queueMicrotask(() => {
    if (root.isConnected && !root.hidden && !root.closest('[hidden]')) {
      const selected = root.querySelector<HTMLElement>('button[aria-pressed="true"]:not(:disabled)');
      (selected ?? root.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled)'))?.focus({ preventScroll: true });
    }
  });
}

export function focusGame(): void {
  const game = document.querySelector<HTMLElement>('#game');
  if (game) { game.tabIndex = -1; game.focus({ preventScroll: true }); }
}

/** Native button activation must not also reach Phaser's keyboard shortcuts. */
export function stopButtonActivation(event: KeyboardEvent): void {
  if (event.target instanceof HTMLButtonElement && (event.key === 'Enter' || event.key === ' ')) event.stopPropagation();
}
