import { ROLES, UI_FONT } from '../game/roles';
import { paintTaipeiScorecard } from '../art/taipei';
import { adventureDate, calculateScore, formatTime, RECORD_NOTICE, type RunSnapshot } from './ScoreCalculator';

export function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = []; let line = '';
  for (const char of Array.from(text)) {
    if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = char; }
    else line += char;
  }
  if (line) lines.push(line);
  return lines;
}
export function renderScorecard(run: RunSnapshot, hero: CanvasImageSource): HTMLCanvasElement {
  const score = calculateScore(run);
  if (!score) throw new Error('尚未正式通關，不能產生成績圖卡。');
  const role = ROLES.find(r => r.id === run.role)!;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1080;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('此瀏覽器無法建立圖卡畫布。');
  ctx.fillStyle = '#253653'; ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = '#FFD45B'; ctx.fillRect(32, 32, 1016, 1016);
  ctx.fillStyle = '#FFF4D8'; ctx.fillRect(48, 48, 984, 984);
  const text = (value: string, x: number, y: number, size: number, color = '#253653', bold = false): void => {
    ctx.fillStyle = color; ctx.font = `${bold ? 'bold ' : ''}${size}px ${UI_FONT}`; ctx.fillText(value, x, y);
  };
  text('TPESocialWorkRun', 80, 110, 44, '#41366D', true);
  text('社工勇者：城市裡的光', 80, 157, 30);
  text('MISSION CLEAR!', 80, 230, 58, '#253653', true);
  text('城市裡的光，因你而亮。', 80, 274, 30);
  ctx.font = `bold 38px ${UI_FONT}`;
  const organization = wrapText(ctx, run.organizationName, 690);
  organization.forEach((line, i) => text(line, 80, 337 + i * 48, 38, '#41366D', true));
  ctx.imageSmoothingEnabled = false; ctx.drawImage(hero, 840, 290, 120, 168); ctx.imageSmoothingEnabled = true;
  text(`${role.title}・${role.name}`, 80, 456, 30);
  ctx.fillStyle = '#253653'; ctx.fillRect(80, 488, 920, 175);
  text(`${score.score}`, 116, 610, 106, '#FFD45B', true); text('/ 1800', 440, 607, 42, '#FFF4D8');
  text(score.title, 654, 565, 34, '#73D6AA', true);
  text('支援已接通', 654, 614, 27, '#FFF4D8');
  text(`協作星 ${score.stars} / 3　事件 2 / 2　過載巨獸已解除`, 80, 716, 30);
  text(`時間 ${formatTime(run.elapsedMs)}　冒險日期 ${adventureDate(run)}`, 80, 765, 30);
  paintTaipeiScorecard(ctx);
  ctx.fillStyle = '#73D6AA'; ctx.fillRect(64, 918, 952, 8);
  text('真正的支持，需要整座城市一起努力。', 80, 952, 30, '#41366D', true);
  text(RECORD_NOTICE, 80, 982, 23);
  text('人物與事件均為虛構；玩家名稱為自行填寫的暱稱。', 80, 1008, 20, '#5B5978');
  return canvas;
}
export function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try { canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 產生失敗，請重試。')), 'image/png'); }
    catch (error) { reject(error); }
  });
}
