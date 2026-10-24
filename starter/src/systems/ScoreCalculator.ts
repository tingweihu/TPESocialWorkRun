import level from '../../../data/level01.json';
import { hasCompletedObjectives, type RunState } from './RunState';

export type RunSnapshot = Readonly<Omit<RunState, 'collectedStarIds' | 'encounters'>> & {
  readonly collectedStarIds: readonly string[];
  readonly encounters: Readonly<RunState['encounters']>;
};
export const RECORD_NOTICE = '本成績為遊戲挑戰紀錄，非社工專業績效評量。';
export function finishRun(run: RunState, now = new Date().toISOString()): boolean {
  if (run.status !== 'playing' || !hasCompletedObjectives(run)) return false;
  run.finishedAt = now; run.status = 'cleared'; return true;
}
export function calculateScore(run: RunSnapshot): { score: number; stars: number; title: string } | null {
  if (run.mode !== 'story' || run.status !== 'cleared' || !run.encounters.need || !run.encounters.relay || !run.bridgeActive || run.bossStage !== 'cleared' || !run.finishedAt || !run.startedAt || !Number.isFinite(Date.parse(run.startedAt)) || !Number.isFinite(Date.parse(run.finishedAt)) || !Number.isFinite(run.elapsedMs) || run.elapsedMs < 0) return null;
  const valid = new Set(level.collectibles.map(s => s.id));
  const stars = new Set(run.collectedStarIds.filter(id => valid.has(id))).size;
  return { score: 1000 + stars * 100 + 150 + 150 + 200, stars,
    title: ['城市同行者', '街角點燈者', '協作星光旅人', '城市光芒冒險家'][stars] };
}
export function completedSnapshot(run: RunState): RunSnapshot | null {
  if (!calculateScore(run)) return null;
  return Object.freeze({ ...run, collectedStarIds: Object.freeze([...run.collectedStarIds]), encounters: Object.freeze({ ...run.encounters }) });
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function adventureDate(run: RunSnapshot): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(run.startedAt!));
}
