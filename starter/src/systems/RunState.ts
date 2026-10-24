import type { StageId } from './Journey';
export type RoleId = 'family' | 'protect' | 'outreach' | 'mental';
export type EncounterId = 'need' | 'relay';
export type BossStage = 'dormant' | 'paper' | 'bridge' | 'light' | 'cleared';

export interface RunState {
  mode: 'story' | 'practice';
  practiceStage: StageId | null;
  organizationName: string;
  role: RoleId;
  stamina: number;
  collectedStarIds: string[];
  checkpointX: number;
  encounters: Record<EncounterId, boolean>;
  bridgeActive: boolean;
  bossStage: BossStage;
  bossProgress: number;
  status: 'ready' | 'playing' | 'cleared';
  startedAt: string | null;
  finishedAt: string | null;
  elapsedMs: number;
}

export const DEFAULT_ORGANIZATION = '冒險者';
export const ORGANIZATION_LIMIT = 30;

export function cleanOrganization(value: string): string {
  return value.normalize('NFC')
    .replace(/[\u00ad\u200b\u2060\ufeff]/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/gu, ' ').trim();
}

/** Keep complete graphemes while retaining the 30-code-point storage contract. */
export function truncateOrganization(value: string): string {
  let result = '', count = 0;
  for (const { segment } of new Intl.Segmenter('zh-TW', { granularity: 'grapheme' }).segment(cleanOrganization(value))) {
    const size = Array.from(segment).length;
    if (count + size > ORGANIZATION_LIMIT) break;
    result += segment; count += size;
  }
  return result;
}

export function normalizeOrganization(value: string): string {
  const result = truncateOrganization(value);
  return result.replace(/[\p{Default_Ignorable_Code_Point}\p{Mark}\s]/gu, '') ? result : DEFAULT_ORGANIZATION;
}

export function createRun(organizationName = DEFAULT_ORGANIZATION, role: RoleId = 'family', spawnX = 64): RunState {
  return {
    mode: 'story', practiceStage: null,
    organizationName: normalizeOrganization(organizationName), role, stamina: 3,
    collectedStarIds: [], checkpointX: spawnX, encounters: { need: false, relay: false },
    bridgeActive: false, bossStage: 'dormant', bossProgress: 0, status: 'ready',
    startedAt: null, finishedAt: null, elapsedMs: 0,
  };
}

type Registry = { get(key: string): unknown; set(key: string, value: unknown): unknown };
export function getRun(registry: Registry): RunState {
  const current = registry.get('runState') as RunState | undefined;
  if (current) return current;
  const run = createRun();
  registry.set('runState', run);
  return run;
}

export function collectStar(run: RunState, id: string, validIds: readonly string[]): boolean {
  if (run.status !== 'playing' || !validIds.includes(id) || run.collectedStarIds.includes(id)) return false;
  run.collectedStarIds.push(id);
  return true;
}

// A result requires all objectives in the shared state, not a Scene payload.
export function hasCompletedObjectives(run: RunState): boolean {
  return run.mode === 'story' && run.encounters.need && run.encounters.relay && run.bridgeActive && run.bossStage === 'cleared';
}
