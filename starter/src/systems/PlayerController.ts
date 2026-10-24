import Phaser from 'phaser';
import { audioBus } from './AudioBus';
import { MOVEMENT } from './Movement';

export type TouchAction = 'left' | 'right' | 'jump' | 'skill' | 'interact' | 'pause';

export class PlayerController {
  private touchHeld = new Set<TouchAction>();
  private touchPressed = new Set<TouchAction>();
  onTouchReset?: () => void;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private lastGrounded = -Infinity;
  private jumpBuffered = -Infinity;
  private pendingJump = false;
  private pendingSkill = false;
  private pendingPause = false;
  private pendingEscape = false;
  private pendingInteract = false;
  private pendingDirection = 0;

  constructor(private player: Phaser.Physics.Arcade.Sprite, keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    this.keys = keyboard.addKeys('LEFT,RIGHT,A,D,SPACE,Z,J,X,ESC,P,E,ENTER,UP,DOWN') as Record<string, Phaser.Input.Keyboard.Key>;
    [this.keys.SPACE, this.keys.Z].forEach(key => key.on('down', () => { this.pendingJump = true; }));
    [this.keys.J, this.keys.X].forEach(key => key.on('down', () => { this.pendingSkill = true; }));
    this.keys.P.on('down', () => { this.pendingPause = true; });
    this.keys.ESC.on('down', () => { this.pendingEscape = true; });
    [this.keys.E, this.keys.ENTER].forEach(key => key.on('down', () => { this.pendingInteract = true; }));
    this.keys.UP.on('down', () => { this.pendingDirection = -1; });
    this.keys.DOWN.on('down', () => { this.pendingDirection = 1; });
  }

  update(now: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = this.keys.LEFT.isDown || this.keys.A.isDown || this.touchHeld.has('left');
    const right = this.keys.RIGHT.isDown || this.keys.D.isDown || this.touchHeld.has('right');
    this.player.setVelocityX(left === right ? 0 : left ? -MOVEMENT.speed : MOVEMENT.speed);
    if (left !== right) this.player.setFlipX(left);
    if (body.blocked.down && body.velocity.y >= 0) this.lastGrounded = now;
    if (this.touchPressed.delete('jump') || this.pendingJump) this.jumpBuffered = now;
    this.pendingJump = false;
    if (now - this.jumpBuffered <= MOVEMENT.bufferMs && now - this.lastGrounded <= MOVEMENT.coyoteMs) {
      this.player.setVelocityY(MOVEMENT.jumpVelocity);
      audioBus.play('jump');
      this.jumpBuffered = this.lastGrounded = -Infinity;
    }
    if (!this.keys.SPACE.isDown && !this.keys.Z.isDown && !this.touchHeld.has('jump') && body.velocity.y < MOVEMENT.shortJumpVelocity) this.player.setVelocityY(MOVEMENT.shortJumpVelocity);
  }

  skillPressed(): boolean {
    const pressed = this.touchPressed.delete('skill') || this.pendingSkill;
    this.pendingSkill = false;
    return pressed;
  }

  pausePressed(): boolean {
    const pressed = this.touchPressed.delete('pause') || this.pendingPause || this.pendingEscape;
    this.pendingPause = this.pendingEscape = false;
    return pressed;
  }

  escapePressed(): boolean {
    const pressed = this.pendingEscape; this.pendingEscape = false; return pressed;
  }

  storyInput(): { direction: number; confirm: boolean } {
    const input = { direction: this.pendingDirection, confirm: this.touchPressed.delete('interact') || this.pendingInteract };
    this.pendingDirection = 0; this.pendingInteract = false;
    return input;
  }

  reset(): void {
    this.onTouchReset?.(); this.clearTouch();
    this.lastGrounded = this.jumpBuffered = -Infinity;
    this.pendingJump = this.pendingSkill = this.pendingPause = false;
    this.pendingEscape = this.pendingInteract = false; this.pendingDirection = 0;
    Object.values(this.keys).forEach(key => key.reset());
  }

  setTouch(action: TouchAction, down: boolean): void {
    if (down) { if (!this.touchHeld.has(action)) this.touchPressed.add(action); this.touchHeld.add(action); }
    else this.touchHeld.delete(action);
  }
  clearTouch(): void { this.touchHeld.clear(); this.touchPressed.clear(); }
}
