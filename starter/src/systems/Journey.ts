import level from '../../../data/level01.json';

const CHAPTERS = [
  { id: 'beimen', number: '01', title: '北門・暖身街口', subtitle: '把第一步，交給一點點勇氣。', description: '跟阿光打聲招呼，沿著街口、騎樓與小廣場練習跳躍。路上的休息站會補滿體力，慢慢走到街口另一端吧。', objective: '向右抵達街口終點' },
  { id: 'dihua', number: '02', title: '迪化街・好好聽你說', subtitle: '騎樓下，留一個慢慢說話的位置。', description: '穿過茶行騎樓與小院，找到林小姐，先聽懂她最急迫的需要。選錯也沒關係，聊一聊，再一起往下一站出發。', objective: '完成需求對話，再走到街巷盡頭' },
  { id: 'river', number: '03', title: '大稻埕・把光接起來', subtitle: '河風吹過來，夥伴也正在路上。', description: '沿著河岸步道與碼頭平台，跟小連確認資訊，讓支援光橋亮起。沒有星星也能過橋，累了就在休息站歇歇。', objective: '與小連接通光橋，走到河岸盡頭' },
  { id: 'boss', number: '04', title: '信義・一起分擔', subtitle: '高樓很高，但你不用一個人撐住。', description: '走過城市綠帶與廣場，在最後的休息站整備。進入過載廣場後，依序完成分配章、兩側開關與光球；失敗可從廣場前重來。', objective: '解除過載巨獸，走向亮起的出口' },
] as const;
// Selection, physics and chapter scenery share the same map boundaries.
export const STAGES = CHAPTERS.map((chapter, index) => {
  const act = level.acts[index];
  return { ...chapter, from: act.fromX, to: act.toX, spawn: act.spawnX, goal: act.goalX };
});
export type StageId = typeof STAGES[number]['id'];
export type JourneyLaunch = { mode?: 'story' | 'practice'; stage?: StageId };
export const stageById = (id: unknown) => STAGES.find(stage => stage.id === id);

export const BOSS_STEPS = [
  { symbol: '↓  ▰  ↓', title: `① 分配工作 · 踩亮 ${level.boss.phases.paper.requiredStamps} 枚章`, text: '工作章在地板上。走近後按住「跳躍」（Space／Z），落下時踩中；每枚各一次。低位紙浪來了就跳過。' },
  { symbol: '←  E  →', title: `② 接通支援 · 開啟 ${level.boss.phases.bridge.switches.length} 個開關`, text: '走到綠色開關旁，分別按「互動」（E／Enter）。全部亮起，就能進入最後一階段。' },
  { symbol: '↑  ✦  ↓', title: `③ 點亮核心 · 接通光球 ${level.boss.phases.light.coreHitsRequired} 次`, text: '站在亮起的光球下方，按住「跳躍」，從上方落下碰到光球。每次亮起只能接通一次，累積到目標次數就完成。' },
] as const;
