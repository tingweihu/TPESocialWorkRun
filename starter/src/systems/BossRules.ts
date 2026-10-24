import type level from '../../../data/level01.json';
import type { BossStage } from './RunState';

export type BossDefinition = typeof level.boss;
export function phaseTarget(boss: BossDefinition, stage: BossStage): number {
  if (stage === 'paper') return boss.phases.paper.requiredStamps;
  if (stage === 'bridge') return boss.phases.bridge.switches.length;
  return boss.phases.light.coreHitsRequired;
}
export function coreWindow(age: number, phase: BossDefinition['phases']['light']) {
  return { index: Math.floor(age / phase.exposeIntervalMs), exposed: age >= 0 && age % phase.exposeIntervalMs < phase.exposeWindowMs };
}
export function paperWave(age: number, phase: BossDefinition['phases']['paper'] | BossDefinition['phases']['bridge']) {
  return { index: Math.floor(age / phase.waveIntervalMs), warning: age < 0 || age % phase.waveIntervalMs < phase.telegraphMs };
}
