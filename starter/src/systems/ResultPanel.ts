import type Phaser from 'phaser';
import dialogues from '../../../data/dialogues.zh-TW.json';
import { ROLES } from '../game/roles';
import { adventureDate, calculateScore, formatTime, RECORD_NOTICE, type RunSnapshot } from './ScoreCalculator';
import { canvasPng, renderScorecard } from './ScorecardRenderer';
import { copyText, shareFile, shareText } from './ResultActions';

export class ResultPanel {
  private overlay: HTMLElement;
  private disposed = false;
  private file?: File;
  private url?: string;
  private preparing = false;
  private sharing = false;
  private abort = new AbortController();
  private status: HTMLParagraphElement;
  private preview: HTMLImageElement;
  private download: HTMLButtonElement;
  private share: HTMLButtonElement;
  private retry: HTMLButtonElement;
  private manual: HTMLTextAreaElement;

  constructor(private scene: Phaser.Scene, private snapshot: RunSnapshot) {
    const score = calculateScore(snapshot)!; const role = ROLES.find(r => r.id === snapshot.role)!;
    const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text = ''): HTMLElementTagNameMap[K] => {
      const node = document.createElement(tag); node.textContent = text; return node;
    };
    this.overlay = element('section'); this.overlay.className = 'result-overlay'; this.overlay.setAttribute('aria-label', '冒險結算');
    const panel = element('div'); panel.className = 'result-panel';
    const heading = element('h1', 'MISSION CLEAR!'); heading.tabIndex = -1;
    const subtitle = element('p', '城市裡的光，因你而亮。');
    const organization = element('h2', snapshot.organizationName); organization.id = 'result-organization';
    const stats = element('p', `${role.title}・${role.name}\n${score.score} / 1800 · ${score.title}\n協作星 ${score.stars}/3 · 完成事件 2/2 · 過載巨獸已解除\n時間 ${formatTime(snapshot.elapsedMs)} · ${adventureDate(snapshot)}`);
    stats.className = 'result-stats'; stats.id = 'result-stats';
    const ending = element('blockquote', dialogues.ending.filter(line => line.speaker === '旁白').map(line => line.text).join('\n'));
    const journal = element('details'); journal.append(element('summary', '社工日誌與虛構提醒'), element('p', dialogues.journal.join('\n')));
    this.status = element('p', '正在準備圖卡…'); this.status.id = 'result-status'; this.status.setAttribute('role', 'status');
    this.preview = element('img'); this.preview.alt = '本局冒險成績圖卡，1080×1080'; this.preview.hidden = true;
    this.preview.className = 'scorecard-preview';
    const button = (label: string, action: () => void): HTMLButtonElement => {
      const node = element('button', label); node.type = 'button'; node.addEventListener('click', action, { signal: this.abort.signal }); return node;
    };
    this.download = button('下載成績圖卡 PNG', () => this.save());
    this.share = button('分享成績', () => { void this.send(); });
    this.retry = button('重新產生圖卡', () => { void this.prepare(); }); this.retry.hidden = true;
    const copy = button('複製分享文字', () => { void this.copy(); });
    this.download.disabled = this.share.disabled = true;
    this.manual = element('textarea'); this.manual.value = shareText(snapshot); this.manual.readOnly = true; this.manual.hidden = true;
    this.manual.setAttribute('aria-label', '手動複製分享文字'); this.manual.rows = 7;
    const actions = element('div'); actions.className = 'result-actions'; actions.append(this.download, this.share, copy, this.retry);
    const navigation = element('div'); navigation.className = 'result-actions';
    navigation.append(button('再玩一次', () => scene.scene.start('Play', { mode: 'story' })), button('關卡地圖', () => scene.scene.start('Journey', {})), button('換角色／修改姓名', () => scene.scene.start('Character')), button('返回主選單', () => scene.scene.start('Title')));
    const content = element('div'); content.className = 'result-content'; content.append(organization, stats, ending, journal);
    const grid = element('div'); grid.className = 'result-grid'; grid.append(content, this.preview);
    panel.append(heading, subtitle, grid, element('p', RECORD_NOTICE), actions, this.status, this.manual, navigation);
    this.overlay.append(panel); document.querySelector('#game')!.append(this.overlay);
    heading.focus(); void this.prepare();
  }

  private async prepare(): Promise<void> {
    if (this.preparing || this.disposed) return;
    this.preparing = true; this.retry.hidden = true; this.status.textContent = '正在準備圖卡…';
    try {
      const hero = this.scene.textures.get(`hero-${this.snapshot.role}`).getSourceImage() as HTMLCanvasElement;
      const canvas = renderScorecard(this.snapshot, hero); const blob = await canvasPng(canvas);
      if (this.disposed) return;
      this.file = new File([blob], `TPESocialWorkRun-${adventureDate(this.snapshot)}.png`, { type: 'image/png' });
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = URL.createObjectURL(blob); this.preview.src = this.url; this.preview.hidden = false;
      this.download.disabled = this.share.disabled = false; this.status.textContent = '圖卡已準備好，可下載或分享。';
    } catch {
      if (!this.disposed) { this.retry.hidden = false; this.status.textContent = '圖卡產生失敗。可重試，或先複製文字；仍可再次遊玩。'; }
    } finally { this.preparing = false; }
  }
  private save(): void {
    if (!this.file || !this.url || this.disposed) return;
    const link = document.createElement('a'); link.href = this.url; link.download = this.file.name;
    document.body.append(link); link.click(); link.remove(); this.status.textContent = '已送出 PNG 下載請求；可在瀏覽器下載清單查看。';
  }
  private async send(): Promise<void> {
    if (!this.file || this.disposed || this.sharing) return;
    this.sharing = true; this.share.disabled = true;
    const result = await shareFile(this.file, shareText(this.snapshot));
    if (!this.disposed) { this.status.textContent = result.message; this.share.disabled = false; }
    this.sharing = false;
  }
  private async copy(): Promise<void> {
    const text = shareText(this.snapshot);
    const ok = await copyText(text, navigator.clipboard?.writeText.bind(navigator.clipboard));
    if (this.disposed) return;
    if (ok) this.status.textContent = '分享文字已複製。';
    else { this.status.textContent = '無法自動複製。請在下方選取文字，按 Ctrl+C 手動複製。'; this.manual.hidden = false; this.manual.focus(); this.manual.select(); }
  }
  destroy(): void {
    this.disposed = true; this.abort.abort(); this.overlay.remove();
    if (this.url) URL.revokeObjectURL(this.url); this.url = undefined; this.file = undefined;
  }
}
