import { ROLES } from '../game/roles';
import { adventureDate, calculateScore, formatTime, RECORD_NOTICE, type RunSnapshot } from './ScoreCalculator';

export function shareText(run: RunSnapshot): string {
  const score = calculateScore(run); if (!score) throw new Error('尚未正式通關。');
  const role = ROLES.find(r => r.id === run.role)!;
  return `TPESocialWorkRun｜社工勇者：城市裡的光\n${run.organizationName}｜${role.title}・${role.name}\nMISSION CLEAR! ${score.score}/1800 · ${score.title}\n協作星 ${score.stars}/3 · 事件 2/2 · 過載巨獸已解除\n時間 ${formatTime(run.elapsedMs)} · ${adventureDate(run)}\n真正的支持，需要整座城市一起努力。\n${RECORD_NOTICE}\n人物與事件均為虛構；玩家名稱為自行填寫的暱稱。`;
}
export type SharePorts = { canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void> };
export type ShareOutcome = { kind: 'success' | 'cancelled' | 'fallback'; message: string };
export async function shareFile(file: File, text: string, ports: SharePorts = navigator): Promise<ShareOutcome> {
  try {
    if (!ports.share || !ports.canShare?.({ files: [file] })) return { kind: 'fallback', message: '此瀏覽器不支援檔案分享。請下載 PNG 後自行上傳，或複製分享文字。' };
    // No async preparation before this call: retain the player's click activation.
    await ports.share({ files: [file], title: 'TPESocialWorkRun', text });
    return { kind: 'success', message: '分享操作已完成。' };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return { kind: 'cancelled', message: '已取消分享。' };
    return { kind: 'fallback', message: '分享未完成。請下載 PNG 後自行上傳，或複製分享文字。' };
  }
}
export async function copyText(text: string, write: ((text: string) => Promise<void>) | undefined): Promise<boolean> {
  if (!write) return false;
  try { await write(text); return true; } catch { return false; }
}
