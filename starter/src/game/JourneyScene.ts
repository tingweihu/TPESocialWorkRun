import Phaser from 'phaser';
import { STAGES, stageById, type StageId } from '../systems/Journey';
import { appendBossSteps } from '../systems/BossGuide';
import { audioBus } from '../systems/AudioBus';
import { responsiveLayout } from '../systems/ResponsiveLayout';

export class JourneyScene extends Phaser.Scene {
  constructor() { super('Journey'); }
  create(data: { completed?: StageId } = {}): void {
    responsiveLayout.setScreen('menu');
    audioBus.setMusic('city'); audioBus.setPaused(false);
    this.cameras.main.setBackgroundColor('#85D6F7');
    const overlay = document.createElement('section'); overlay.className = 'journey-overlay'; overlay.setAttribute('aria-label', '關卡地圖');
    const panel = document.createElement('div'); panel.className = 'journey-panel';
    const title = document.createElement('h1'); title.textContent = data.completed ? '這一站的光，亮起來了！' : '今天，想從哪裡開始？';
    const intro = document.createElement('p'); intro.textContent = '從北門的早安，走到河岸的晚風。選一站練習，或和夥伴走完這趟小冒險。換關會重新開始這一站。';
    const list = document.createElement('div'); list.className = 'journey-cards'; list.setAttribute('aria-label', '選擇關卡');
    const details = document.createElement('div'); details.className = 'journey-detail'; details.id = 'journey-detail';
    const abort = new AbortController();
    const button = (text: string, action: () => void, parent = panel): HTMLButtonElement => { const node = document.createElement('button'); node.type = 'button'; node.textContent = text; node.addEventListener('click', action, { signal: abort.signal }); parent.append(node); return node; };
    let selected: StageId | 'story' = 'story';
    const show = (id: StageId | 'story'): void => {
      selected = id; details.replaceChildren();
      for (const b of list.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.stage === id));
      const stage = stageById(id);
      const heading = document.createElement('h2'); heading.textContent = stage?.title ?? '完整冒險 · 城市裡的光';
      const description = document.createElement('p'); description.textContent = stage?.description ?? '從北門出發，聽懂需求、接通光橋，再和夥伴解除過載。完整走完，留下屬於你的冒險圖卡。';
      const objective = document.createElement('p'); objective.className = 'journey-objective'; objective.textContent = stage ? `這一站的目標：${stage.objective}` : '路線：北門 → 迪化街 → 大稻埕河岸 → 信義過載廣場';
      const mode = document.createElement('p'); mode.className = 'journey-note'; mode.textContent = stage ? '自由練習 · 每次從這一站重新開始，不列正式成績。Esc 選單可換關。' : '完整冒險 · 完成兩事件、光橋與 Boss 後，可下載正式成績圖卡。';
      details.append(heading, description, objective, mode);
      if (id === 'boss') appendBossSteps(details);
      button(stage ? '開始這一關' : '開始完整冒險', () => this.scene.start('Play', stage ? { mode: 'practice', stage: stage.id } : { mode: 'story' }), details).className = 'primary';
    };
    const story = button('完整冒險 · 一路走到底', () => show('story'), list); story.dataset.stage = 'story';
    for (const stage of STAGES) { const b = button(`${stage.number}  ${stage.title}`, () => show(stage.id), list); b.dataset.stage = stage.id; }
    const nav = document.createElement('div'); nav.className = 'journey-nav';
    button('再練習一下', () => this.scene.start('Training'), nav);
    button('換角色／修改姓名', () => this.scene.start('Character'), nav);
    button('返回主選單', () => this.scene.start('Title'), nav);
    panel.append(title, intro, list, details, nav); overlay.append(panel); document.querySelector('#game')!.append(overlay);
    const manager = this.input.keyboard!.manager; const previous = manager.enabled; manager.enabled = false;
    show(data.completed ? STAGES[Math.min(STAGES.findIndex(s => s.id === data.completed) + 1, STAGES.length - 1)].id : selected);
    (list.querySelector('[aria-pressed="true"]') as HTMLButtonElement).focus();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { abort.abort(); overlay.remove(); manager.enabled = previous; this.input.keyboard!.resetKeys(); });
  }
}
