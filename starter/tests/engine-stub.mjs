export default {
  Math: {
    Distance: { Between: (x, y, a, b) => Math.hypot(x - a, y - b) },
    Wrap: (value, min, max) => ((value - min) % (max - min) + max - min) % (max - min) + min,
  },
};

export function entity(x = 0, y = 0, key = '') {
  const item = {
    x, y, key, active: true, visible: true, data: {},
    body: { enable: true, top: y - 8, height: 26, prev: { y: 0 }, velocity: { x: 0, y: 0 } },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setVelocityX(x) { this.body.velocity.x = x; return this; },
    setVelocityY(y) { this.body.velocity.y = y; return this; },
    setVelocity(x, y) { return this.setVelocityX(x).setVelocityY(y); },
    setData(key, value) { this.data[key] = value; return this; },
    getData(key) { return this.data[key]; },
    setText(text) { this.text = text; return this; },
    setVisible(value) { this.visible = value; return this; },
    disableBody() { this.body.enable = this.active = this.visible = false; return this; },
    enableBody() { this.body.enable = this.active = this.visible = true; return this; },
    destroy() { this.active = false; },
  };
  for (const method of ['setDepth', 'setTint', 'setOrigin', 'setAlpha', 'setScale', 'setTexture', 'setSize', 'setScrollFactor', 'clearTint', 'setFlipX']) item[method] = function () { return this; };
  item.body.reset = (x, y) => item.setPosition(x, y);
  return item;
}

export function bossScene() {
  const images = [], overlaps = new Map(), groups = [];
  const makeImage = (...args) => { const image = entity(...args); images.push(image); return image; };
  const camera = { bounds: [], setBounds(...bounds) { this.bounds = bounds; return this; } };
  for (const method of ['stopFollow', 'startFollow', 'setScroll', 'setBackgroundColor', 'shake']) camera[method] = () => camera;
  const scene = {
    add: { image: makeImage, rectangle: entity, text: entity },
    physics: { add: {
      existing() {}, collider() {}, staticImage: makeImage,
      overlap(player, target, callback) { overlaps.set(target, callback); },
      group() {
        const group = {
          items: [], create(...args) { const item = entity(...args); this.items.push(item); return item; },
          clear() { this.items = []; }, getChildren() { return this.items.filter(item => item.active); },
        };
        groups.push(group); return group;
      },
    } },
    cameras: { main: camera }, tweens: { add() {}, killTweensOf() {} },
  };
  return { scene, images, overlaps, groups, camera };
}
