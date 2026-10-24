type Cue = 'jump' | 'star' | 'hurt' | 'button' | 'support' | 'clear';
export type MusicTrack = 'city' | 'boss' | 'clear' | 'silent';
const notes: Record<Cue, number[]> = { jump: [260, 390], star: [660, 880, 990], hurt: [180, 110], button: [440], support: [330, 440, 550], clear: [330, 440, 550, 660, 880] };

// Original eight-bar compositions, in MIDI notes; zero is a breath/rest.
const cityMelody = [
  72,0,76,79,76,74,72,0, 69,72,76,0,74,72,67,0,
  65,69,72,76,74,0,72,69, 67,71,74,0,79,76,74,0,
  72,76,79,84,81,79,76,0, 69,72,76,79,76,0,74,72,
  65,69,72,0,76,74,72,69, 67,71,74,79,76,74,72,0,
];
const bossMelody = [
  69,0,72,76,72,0,74,76, 65,0,69,72,74,72,69,0,
  62,65,69,0,72,69,65,0, 64,68,71,76,74,71,68,0,
  69,72,76,81,79,76,72,0, 65,69,72,77,76,72,69,0,
  62,65,69,74,72,69,65,0, 64,68,71,76,74,71,69,0,
];
export function musicStep(track: Exclude<MusicTrack, 'silent'>, step: number): { midi: number; volume: number; beats: number; wave: OscillatorType }[] {
  const melody = track === 'boss' ? bossMelody : cityMelody;
  const roots = track === 'boss' ? [45,41,38,40,45,41,38,40] : [48,45,41,43,48,45,41,43];
  const result: { midi: number; volume: number; beats: number; wave: OscillatorType }[] = [];
  const midi = melody[step % melody.length];
  if (midi) result.push({ midi, volume: .025, beats: .8, wave: 'triangle' });
  if (step % 4 === 0) result.push({ midi: roots[Math.floor(step / 8) % 8], volume: .035, beats: 2.4, wave: 'sine' });
  if (step % 4 === 2) result.push({ midi: roots[Math.floor(step / 8) % 8] + 19, volume: .012, beats: .5, wave: 'sine' });
  return result;
}

class AudioBus {
  muted = false;
  musicEnabled = true;
  private context?: AudioContext;
  private installed = false;
  private voices = new Map<OscillatorNode, GainNode>();
  private musicVoices = new Set<OscillatorNode>();
  private music: MusicTrack = 'silent';
  private paused = false;
  private timer?: ReturnType<typeof setInterval>;
  private nextNote = 0;
  private step = 0;

  install(): void {
    if (this.installed) return;
    this.installed = true;
    const interact = (event: Event): void => {
      if (!event.isTrusted) return;
      if (event instanceof KeyboardEvent && (event.isComposing || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return;
      try {
        this.context ??= new AudioContext();
        if (this.context.state === 'suspended') void this.context.resume().then(() => this.syncMusic()).catch(() => {});
        else this.syncMusic();
      } catch { /* Sound remains optional when the device is unavailable. */ }
      if (event instanceof KeyboardEvent && !event.repeat) {
        if (event.code === 'KeyM') this.toggle();
        if (event.code === 'KeyB') this.toggleMusic();
      }
    };
    document.addEventListener('pointerdown', interact);
    document.addEventListener('keydown', interact);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.stopMusic(); this.stopVoices(); } else this.syncMusic();
    });
    document.querySelector('#sound-toggle')?.addEventListener('click', () => this.toggle());
    document.querySelector('#music-toggle')?.addEventListener('click', () => this.toggleMusic());
    this.labels();
  }
  setMusic(track: MusicTrack): void {
    if (track !== this.music) { this.stopMusic(); this.music = track; this.step = 0; }
    this.syncMusic();
  }
  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) { this.stopMusic(); this.stopVoices(); } else this.syncMusic();
  }
  toggle(): void {
    this.muted = !this.muted;
    if (this.muted) { this.stopMusic(); this.stopVoices(); } else this.syncMusic();
    this.labels(); this.play('button');
  }
  toggleMusic(): void {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) this.stopMusic(); else this.syncMusic();
    this.labels();
  }
  private labels(): void {
    const sound = document.querySelector('#sound-toggle'), music = document.querySelector('#music-toggle');
    if (sound) { sound.textContent = `聲音：${this.muted ? '關' : '開'}（M）`; sound.setAttribute('aria-pressed', String(!this.muted)); }
    if (music) { music.textContent = `音樂：${this.musicEnabled ? '開' : '關'}（B）`; music.setAttribute('aria-pressed', String(this.musicEnabled)); }
  }
  private stopVoices(onlyMusic = false): void {
    for (const [oscillator, gain] of this.voices) {
      if (onlyMusic && !this.musicVoices.has(oscillator)) continue;
      oscillator.onended = null; oscillator.stop(); oscillator.disconnect(); gain.disconnect();
      this.voices.delete(oscillator); this.musicVoices.delete(oscillator);
    }
  }
  private stopMusic(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined; this.stopVoices(true);
  }
  private syncMusic(): void {
    const ctx = this.context;
    if (this.timer !== undefined || !ctx || ctx.state !== 'running' || this.muted || !this.musicEnabled || this.paused || document.hidden || this.music === 'silent') return;
    this.nextNote = ctx.currentTime + .03;
    const schedule = (): void => {
      if (this.music === 'silent' || ctx !== this.context || ctx.state !== 'running' || this.muted || this.paused || document.hidden) { this.stopMusic(); return; }
      const beat = 60 / (this.music === 'boss' ? 112 : this.music === 'clear' ? 88 : 100) / 2;
      // Never play a backlog after a suspended tab or a busy frame.
      if (this.nextNote < ctx.currentTime - .1) this.nextNote = ctx.currentTime + .03;
      while (this.nextNote < ctx.currentTime + .18) {
        for (const note of musicStep(this.music, this.step)) this.tone(440 * 2 ** ((note.midi - 69) / 12), this.nextNote, note.beats * beat, note.volume, note.wave, true);
        this.nextNote += beat; this.step = (this.step + 1) % 64;
      }
    };
    schedule(); this.timer = setInterval(schedule, 80);
  }
  private tone(frequency: number, start: number, duration: number, volume: number, wave: OscillatorType, music = false): void {
    const ctx = this.context!;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    this.voices.set(oscillator, gain); if (music) this.musicVoices.add(oscillator);
    oscillator.type = wave; oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + .012);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(start); oscillator.stop(start + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); this.musicVoices.delete(oscillator); };
  }
  play(cue: Cue): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || this.muted || this.paused || document.hidden) return;
    notes[cue].forEach((frequency, i) => this.tone(frequency, ctx.currentTime + i * .075, .1, .055, 'triangle'));
  }
}
export const audioBus = new AudioBus();
