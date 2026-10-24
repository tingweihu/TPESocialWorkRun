import data from '../../../data/encounters.json';
import dialogues from '../../../data/dialogues.zh-TW.json';
import type { EncounterId, RunState } from './RunState';

export type DialogueId = keyof typeof dialogues.conversations;
export type Choice = { id: string; label: string; reply: string[]; isCompletion: boolean; hint?: string; onSuccess?: string[] };
export type Conversation = { speaker: string; intro: string[]; choices?: Choice[]; completedLine?: string };
export const conversations: Record<DialogueId, Conversation> = dialogues.conversations;
export const encounters = data.encounters;

// The only event mutation. Read the choice contract, never award by proximity or opening a dialog.
export function completeEncounter(run: RunState, dialogueId: DialogueId, choiceId: string): boolean {
  const event = encounters.find(e => e.id === dialogueId);
  const choice = conversations[dialogueId].choices?.find(c => c.id === choiceId);
  if (!event || !choice?.isCompletion || choiceId !== event.completionChoiceId || run.status !== 'playing') return false;
  const id = event.onComplete.flag as EncounterId;
  if (run.encounters[id]) return false;
  run.encounters[id] = true;
  if (event.onComplete.bridgeActive) run.bridgeActive = true;
  return true;
}

export function readyForBoss(run: RunState): boolean {
  return run.encounters.need && run.encounters.relay && run.bridgeActive;
}
