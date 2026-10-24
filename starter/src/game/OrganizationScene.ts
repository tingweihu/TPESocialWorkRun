import Phaser from 'phaser';
import { responsiveLayout } from '../systems/ResponsiveLayout';
import { cleanOrganization, DEFAULT_ORGANIZATION, getRun, normalizeOrganization, ORGANIZATION_LIMIT } from '../systems/RunState';

export class OrganizationScene extends Phaser.Scene {
  constructor() { super('Organization'); }

  create(): void {
    responsiveLayout.setScreen('menu');
    this.cameras.main.setBackgroundColor('#41366D');
    const run = getRun(this.registry);
    const overlay = document.createElement('section');
    overlay.className = 'org-overlay';
    overlay.setAttribute('aria-label', '輸入玩家姓名');
    const form = document.createElement('form');
    form.className = 'org-panel';
    const heading = document.createElement('h1');
    heading.textContent = '今天，怎麼稱呼你呢？';
    const subtitle = document.createElement('p');
    subtitle.textContent = '留個名字，讓夥伴記得這趟冒險的你。';
    const label = document.createElement('label');
    label.htmlFor = 'organization-name';
    label.textContent = '玩家姓名';
    const input = document.createElement('input');
    input.id = 'organization-name';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = '輸入玩家姓名';
    input.value = run.organizationName === DEFAULT_ORGANIZATION ? '' : run.organizationName;
    input.setAttribute('aria-describedby', 'organization-help organization-count');
    const count = document.createElement('p');
    count.id = 'organization-count';
    count.className = 'org-count';
    count.setAttribute('aria-live', 'polite');
    const help = document.createElement('p');
    help.id = 'organization-help';
    help.className = 'org-help';
    help.textContent = '暱稱也可以，也能略過。只在這次遊玩中記得你，不會上傳。';
    const buttons = document.createElement('div');
    buttons.className = 'org-actions';
    const confirm = document.createElement('button');
    confirm.type = 'submit';
    confirm.textContent = '確認並選擇角色';
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'secondary';
    skip.textContent = '略過';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'secondary';
    back.textContent = '返回主選單';
    buttons.append(confirm, skip, back);
    form.append(heading, subtitle, label, input, count, help, buttons);
    overlay.append(form);
    document.querySelector('#game')!.append(overlay);

    const manager = this.input.keyboard!.manager;
    const wasEnabled = manager.enabled;
    manager.enabled = false; // Native input receives spaces, arrows, Enter and IME intact.
    let composing = false;
    let compositionJustEnded = false;
    let compositionTimer: ReturnType<typeof setTimeout> | undefined;
    let leaving = false;
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    const validate = (): void => {
      if (composing) return;
      const chars = Array.from(cleanOrganization(input.value));
      if (chars.length > ORGANIZATION_LIMIT) input.value = chars.slice(0, ORGANIZATION_LIMIT).join('');
      count.textContent = `${Math.min(chars.length, ORGANIZATION_LIMIT)} / 30 字${chars.length > ORGANIZATION_LIMIT ? '，已保留前 30 字' : '；不填寫顯示「冒險者」'}`;
    };
    const leave = (scene: string, value?: string): void => {
      if (leaving || composing) return;
      leaving = true;
      if (value !== undefined) run.organizationName = normalizeOrganization(value);
      this.scene.start(scene);
    };
    input.addEventListener('compositionstart', () => { composing = true; }, options);
    input.addEventListener('compositionend', () => {
      composing = false;
      compositionJustEnded = true;
      clearTimeout(compositionTimer);
      compositionTimer = setTimeout(() => { compositionJustEnded = false; }, 0);
      validate();
    }, options);
    input.addEventListener('input', validate, options);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!composing && !compositionJustEnded) leave('Character', input.value);
    }, options);
    form.addEventListener('keydown', event => {
      if (event.isComposing || composing || event.keyCode === 229 || compositionJustEnded) return;
      if (event.key === 'Escape') { event.preventDefault(); leave('Title', input.value); }
    }, options);
    skip.addEventListener('click', () => leave('Character', ''), options);
    back.addEventListener('click', () => leave('Title', input.value), options);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      listeners.abort();
      clearTimeout(compositionTimer);
      overlay.remove();
      manager.enabled = wasEnabled;
      this.input.keyboard?.resetKeys();
    });
    validate();
    input.focus();
  }
}
