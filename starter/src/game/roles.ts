import characters from '../../../data/characters.json';
import type { RoleId } from '../systems/RunState';
export type { RoleId } from '../systems/RunState';

export interface Role {
  id: RoleId;
  name: string;
  title: string;
  color: number;
  ability: string;
  intro: string;
  cooldownMs: number;
  durationMs: number;
}

export const ROLES: Role[] = characters.playable.map(r => ({
  id: r.id as RoleId, name: r.name, title: r.title,
  color: Number.parseInt(r.color.slice(1), 16), ability: r.ability.name, intro: r.intro,
  cooldownMs: r.ability.cooldownSeconds * 1000, durationMs: r.ability.durationSeconds * 1000,
}));

export const UI_FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';
