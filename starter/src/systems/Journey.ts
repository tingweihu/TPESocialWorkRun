export const STAGES = [
  { id: 'beimen', number: '01', title: '北門・暖身街口', subtitle: '把第一步，交給一點點勇氣。', description: '跟阿光打聲招呼，試著跳過紙山。走到街口另一端，就完成這段散步。', objective: '向右抵達街口終點', from: 0, to: 520, spawn: 64, goal: 500 },
  { id: 'dihua', number: '02', title: '迪化街・好好聽你說', subtitle: '騎樓下，留一個慢慢說話的位置。', description: '找到林小姐，先聽懂她最急迫的需要。選錯也沒關係，聊一聊，再一起想辦法。', objective: '完成需求對話，再走到休息站右側', from: 520, to: 1130, spawn: 600, goal: 1100 },
  { id: 'river', number: '03', title: '大稻埕・把光接起來', subtitle: '河風吹過來，夥伴也正在路上。', description: '跟小連確認資訊，讓支援光橋亮起。沒有星星也能過橋，往右找到下一個休息站。', objective: '與小連接通光橋，走到河岸盡頭', from: 1130, to: 2030, spawn: 1170, goal: 2000 },
  { id: 'boss', number: '04', title: '信義・一起分擔', subtitle: '高樓很高，但你不用一個人撐住。', description: '進入過載廣場，依序完成分配章、兩側開關與光球。每次失敗都能從廣場前重來。', objective: '解除過載巨獸，走向亮起的出口', from: 1930, to: 2880, spawn: 1980, goal: 2740 },
] as const;
export type StageId = typeof STAGES[number]['id'];
export type JourneyLaunch = { mode?: 'story' | 'practice'; stage?: StageId };
export const stageById = (id: unknown) => STAGES.find(stage => stage.id === id);

export const BOSS_STEPS = [
  { symbol: '↓  ▰  ↓', title: '① 分配工作 · 踩亮兩枚章', text: '兩枚章在地板上。走近後按住「跳躍」（Space／Z），落下時踩中；每枚各一次。低位紙浪來了就跳過。' },
  { symbol: '←  E  →', title: '② 接通支援 · 開啟兩側開關', text: '走到左右兩側的綠色開關旁，分別按「互動」（E／Enter）。兩邊都亮起，就能進入最後一階段。' },
  { symbol: '↑  ✦  ↓', title: '③ 點亮核心 · 接通光球三次', text: '站在亮起的光球下方，按住「跳躍」，從上方落下碰到光球。每次亮起只能接通一次，共三次。' },
] as const;
