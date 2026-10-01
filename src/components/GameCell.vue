<template>
  <div
    class="cell"
    :class="[
      piece ? `cell-${piece}` : 'cell-empty',
      { 'cell-hover': !piece && !gameOver },
      { 'cell-bot-target': ghostType === 'bot' && (piece === 'ninja_bear' || piece === 'bear') && !gameOver },
      { 'cell-bot-destroy': ghostType === 'bot' && piece && piece !== 'ninja_bear' && piece !== 'bear' && !gameOver },
      { 'cell-openable': isOpenable && !gameOver }
    ]"
  >
    <!--
      Transition 讓物件出現（pop-in）和消失（pop-out）都有動畫。
      :key="piece" 確保物件種類改變時重新掛載，觸發 enter 動畫。
    -->
    <Transition name="piece">
      <div v-if="piece" :key="piece + (premium ? '+' : '')" class="piece-wrap">
        <PieceSVG :type="piece" :premium="premium" />
      </div>
    </Transition>

    <!-- 手牌停放（原版行為）：手上物件白框顯示在此格，點任何空格才真正放置
         停在可合成點時加跳動提示 -->
    <div v-if="!piece && parkedType" class="piece-wrap piece-parked" :class="{ 'piece-parked-merge': parkedMerge }">
      <PieceSVG :type="parkedType" />
    </div>

    <!-- 懸停預覽：空格（一般物件）或有物件格（bot 模式）；停放格不再疊 ghost -->
    <div v-else-if="ghostType && (piece ? ghostType === 'bot' : true)" class="piece-wrap piece-ghost">
      <PieceSVG :type="ghostType" />
    </div>
  </div>
</template>

<script setup>
import PieceSVG from './PieceSVG.vue'

defineProps({
  piece: String,
  gameOver: Boolean,
  ghostType: String,
  isOpenable: Boolean,
  parkedType: String,    // 手牌停放：手上物件類型（白框顯示在此格）
  parkedMerge: Boolean,  // 停放格是可合成提示點（加跳動動畫）
  premium: Boolean,      // 高級版物件（4+ 合成產生，使用閃亮版圖）
})

// 本元件只負責「畫」一格，不再自行處理 pointer 事件。
// 點擊判定改由 GameBoard 以棋盤座標統一處理（含邊界吸附容錯），
// 避免手指壓在兩格交界時被判給不能放的那一格而靜靜失敗。
</script>

<style scoped>
.cell {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  box-shadow: none;
  position: relative;
  user-select: none;
  transition: background-image 0.12s;
  overflow: hidden;
  /* 觸控手勢統一由 .board 攔下（touch-action: none），這裡跟著關閉，
     避免子元素把捲動／縮放判定又打開造成 pointercancel */
  touch-action: none;
}

/* 有物件的格子：填充綠地底色（和原版一致） */
.cell:not(.cell-empty) {
  background-image: url('../picts/bg_green.png');
  background-repeat: repeat;
  background-size: auto;
}

.cell-hover { cursor: pointer; }
/* hover 效果只給真滑鼠裝置：觸控螢幕的 hover 會黏在上次點擊處，
   造成半透明 ghost 像「物件停在那裡還沒放」的錯覺 */
@media (hover: hover) and (pointer: fine) {
  .cell-hover:hover { background: rgba(255,255,255,0.10); }
}

/* bot 瞄準熊類（→ 墓碑）/ 其他物件（→ 摧毀）：hover 效果限滑鼠裝置 */
.cell-bot-target  { cursor: crosshair; }
.cell-bot-destroy { cursor: crosshair; }
@media (hover: hover) and (pointer: fine) {
  .cell-bot-target:hover { background: rgba(255,60,60,0.25); }
  .cell-bot-target:hover .piece-ghost { opacity: 0.70; }
  .cell-bot-destroy:hover { background: rgba(255,140,0,0.25); }
  .cell-bot-destroy:hover .piece-ghost { opacity: 0.55; }
}


/* 可開啟物件（寶箱）：金光脈動提示可點擊
   注意：不要用 filter 動畫——drop-shadow 逐幀重算在部分 Android WebView（三星）會導致 GPU 凍結，
   改用背景光暈 + opacity 動畫（合成器處理，安全） */
.cell-openable { cursor: pointer; }
.cell-openable::before {
  content: '';
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,190,0,0.55) 0%, rgba(255,190,0,0) 70%);
  animation: treasure-glow 1.4s ease-in-out infinite alternate;
  pointer-events: none;
}
@keyframes treasure-glow {
  from { opacity: 0.25; transform: scale(0.9); }
  to   { opacity: 1;    transform: scale(1.15); }
}

/* 所有格子（含各種物件）維持相同沙棕底色，物件本身提供視覺差異 */

/* 物件是坐在格子上的卡通貼紙；已放置的物件用細深色描邊（同原版） */
.piece-wrap {
  width: 78%;
  height: 78%;
  position: absolute;
  /* 單層濾鏡就好：全盤 35 顆棋子若各掛兩層 drop-shadow，部分 Android WebView 的 GPU 會吃不消 */
  filter: drop-shadow(0 1px 1.5px rgba(30, 32, 14, 0.6));
}

/* 手牌停放：白色外框標示「這是手上的牌，還沒放定」（原版的白框物件） */
.piece-parked {
  filter: drop-shadow(0 0 2.5px white) drop-shadow(0 0 1px white);
  animation: parked-in 0.25s ease-out both;
}
@keyframes parked-in {
  from { transform: scale(0.4); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

/* 停在可合成點：上下跳動提示「放這裡可以合成！」（transform 動畫，GPU 安全） */
.piece-parked-merge {
  animation: parked-in 0.25s ease-out both, parked-hop 0.55s ease-in-out 0.25s infinite alternate;
  transform-origin: 50% 100%;
}
@keyframes parked-hop {
  from { transform: translateY(0)    scale(1, 1); }
  to   { transform: translateY(-12%) scale(0.97, 1.04); }
}

.piece-ghost {
  opacity: 0;
  transition: opacity 0.15s;
  /* 懸停預覽維持白框，和手牌一致 */
  filter: drop-shadow(0 0 2.5px white) drop-shadow(0 0 1px white);
}
@media (hover: hover) and (pointer: fine) {
  .cell-hover:hover .piece-ghost { opacity: 0.40; }
}

/* ── 出現動畫（pop-in） ────────────────── */
.piece-enter-active {
  animation: pop-in 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

/* ── 消失動畫（合成/被吃掉的物件） ────── */
.piece-leave-active {
  animation: pop-out 0.18s ease-in both;
  pointer-events: none;
}

@keyframes pop-in {
  0%   { transform: scale(0.1) rotate(-12deg); opacity: 0; }
  65%  { transform: scale(1.2)  rotate(4deg);  opacity: 1; }
  100% { transform: scale(1)    rotate(0deg);  opacity: 1; }
}

@keyframes pop-out {
  0%   { transform: scale(1);    opacity: 1; }
  40%  { transform: scale(1.15); opacity: 0.8; }
  100% { transform: scale(0.1);  opacity: 0; }
}
</style>
