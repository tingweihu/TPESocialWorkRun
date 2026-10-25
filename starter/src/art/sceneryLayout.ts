/** Cover the camera's full travel without requiring oversized GPU textures. */
export function scenerySlices(worldWidth: number, viewportWidth: number, scroll: number) {
  const width = Math.ceil(viewportWidth + Math.max(0, worldWidth - viewportWidth) * scroll);
  return Array.from({ length: Math.ceil(width / 1024) }, (_, index) => ({
    x: index * 1024, width: Math.min(1024, width - index * 1024),
  }));
}

export function sceneryAnchor(worldX: number, viewportWidth: number, scroll: number): number {
  return worldX * scroll + viewportWidth * (1 - scroll) / 2;
}
