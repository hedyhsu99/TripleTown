<template>
  <div class="board-area">
    <div class="board-wrapper">
      <!-- 盤子（hold 槽）：初始空，點擊可與手上物件交換
           盤子圖案由 bg_board.png 背景自帶，這裡只放透明點擊區與暫存物件
           與格子相同的「放開才觸發、滑開取消」手感 -->
      <div
        class="piece-plate"
        @pointerdown="onPlateDown"
        @pointerup="onPlateUp"
        @pointercancel="resetPlatePointer"
      >
        <div class="plate-piece" v-if="storedPiece">
          <PieceSVG :type="storedPiece" />
        </div>
      </div>

      <div
        class="board"
        ref="boardEl"
        :style="{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }"
        @pointerdown="onBoardDown"
        @pointerup="onBoardUp"
        @pointercancel="resetPointer"
        @lostpointercapture="resetPointer"
      >
        <template v-for="(piece, idx) in flatGrid" :key="idx">
          <!-- cell (0,0) 保留給盤子，不渲染內容 -->
          <div v-if="idx === 0" class="dish-spacer"></div>
          <GameCell
            v-else
            :piece="piece"
            :game-over="gameOver"
            :is-openable="!!(piece && PIECES[piece]?.isOpenable)"
            :premium="premiumCells.has(idx)"
            :parked-type="idx === parkedCell ? currentPiece : null"
            :parked-merge="idx === parkedCell && parkedMerge"
            :ghost-type="currentPiece === 'bot' ? (piece ? 'bot' : null) : (piece ? null : currentPiece)"
          />
        </template>
      </div>

      <!-- 環境小人：在棋盤下方的綠地帶散步（純裝飾、不攔截點擊） -->
      <div class="villager-strip">
        <TransitionGroup name="vg">
          <div
            v-for="v in villagers"
            :key="v.id"
            class="villager"
            :style="{ left: v.x + '%', top: v.y + '%' }"
          >
            <VillagerSVG
              class="villager-sprite"
              :kind="v.kind"
              :style="{ animationDuration: v.bounce + 's' }"
            />
          </div>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import GameCell from './GameCell.vue'
import PieceSVG from './PieceSVG.vue'
import VillagerSVG from './VillagerSVG.vue'
import { PIECES } from '../game/pieces.js'
import { useVillagers } from '../game/useVillagers.js'

const props = defineProps({
  grid: Array,
  GRID_SIZE: Number,
  currentPiece: String,
  storedPiece: String,
  gameOver: Boolean,
  parkedCell: Number,   // 手牌停放格 index：手上物件白框顯示於此，等玩家點格放置
  parkedMerge: Boolean, // 停放格是否為「放這裡就能合成」的提示點
  premiumCells: Object, // 高級版物件格子集合（Set，4+ 合成產生的閃亮版）
})

const emit = defineEmits(['place', 'swap'])

// 環境小人（純裝飾）：跟著棋盤上的建築生滅
const { villagers } = useVillagers(props.grid, props.GRID_SIZE)

const flatGrid = computed(() => props.grid.flat())

// ── 放置手感：棋盤層級的座標命中判定（取代逐格 click） ──────────────
//
// 為什麼不在 GameCell 各自判定？
// 手指按在兩格交界時，瀏覽器只會把事件送給實際壓到的那一格。
// 若那格剛好是「不能放」的格子（已有物件），舊做法就直接靜靜忽略，
// 玩家會覺得「明明點了卻放不上去」。
// 改成在棋盤層級用座標算格子，再允許往鄰近的可放置格「吸附」，
// 只要沒偏超過容錯半徑就一樣能放，不必精準點到格子中心。

const boardEl = ref(null)

// 吸附容錯半徑（格寬比例）：點擊點偏進不可放格子多少範圍內仍會吸回鄰格。
// 太大會誤放到沒想放的位置（本遊戲每一步都關鍵），0.35 約等於 60px 格子的 21px。
const SNAP_RATIO = 0.35

// 該格是否可以被「吸附」過去。
// 刻意比 isPlaceable 更嚴格：只吸附到空格，
// 因為機器人（摧毀物件）與寶箱（開箱）都是有後果的動作，
// 這類格子一律要求玩家精準點到，不做容錯。
function isSnapTarget(row, col) {
  if (props.gameOver) return false
  if (row === 0 && col === 0) return false
  if (props.currentPiece === 'bot') return false
  return props.grid[row][col] === null
}

// 該格是否可接受點擊（規則必須與 useGame.placePiece 的檢查一致）
function isPlaceable(row, col) {
  if (props.gameOver) return false
  if (row === 0 && col === 0) return false                    // 盤子專用格
  const piece = props.grid[row][col]
  if (piece && PIECES[piece]?.isOpenable) return true         // 寶箱：點了開箱
  if (props.currentPiece === 'bot') return !!piece            // 機器人只能點有物件的格
  return !piece                                               // 一般物件只能放空格
}

// 由畫面座標解析出要放置的格子；找不到合理目標回傳 null
function resolveTarget(clientX, clientY) {
  const el = boardEl.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return null

  const cw = rect.width / props.GRID_SIZE
  const ch = rect.height / props.GRID_SIZE
  const tol = Math.min(cw, ch) * SNAP_RATIO
  const x = clientX - rect.left
  const y = clientY - rect.top

  // 離棋盤太遠（超過容錯範圍）直接忽略
  if (x < -tol || y < -tol || x > rect.width + tol || y > rect.height + tol) return null

  const clamp = (v) => Math.min(props.GRID_SIZE - 1, Math.max(0, v))
  const col0 = clamp(Math.floor(x / cw))
  const row0 = clamp(Math.floor(y / ch))

  // 1) 正中目標本來就能放 → 直接用
  if (isPlaceable(row0, col0)) return { row: row0, col: col0 }

  // 2) 否則找周圍 8 格中「可放置且離點擊點最近」的一格
  //    距離定義為點擊點到該格矩形的距離（點在格內為 0），
  //    因此只有真的貼著邊界按下去才會被吸附。
  let best = null
  let bestDist = Infinity
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const r = row0 + dr
      const c = col0 + dc
      if (r < 0 || r >= props.GRID_SIZE || c < 0 || c >= props.GRID_SIZE) continue
      if (!isSnapTarget(r, c)) continue
      const dx = Math.max(c * cw - x, 0, x - (c + 1) * cw)
      const dy = Math.max(r * ch - y, 0, y - (r + 1) * ch)
      const dist = Math.hypot(dx, dy)
      // 同距離時偏好上下左右（dr/dc 其中一項為 0），避免斜角搶走判定
      const orthoBonus = (dr === 0 || dc === 0) ? 0 : 0.001
      if (dist + orthoBonus < bestDist) {
        bestDist = dist + orthoBonus
        best = { row: r, col: c }
      }
    }
  }
  return bestDist <= tol ? best : null
}

// 按下先記錄位置與 pointerId（多指觸控時只認第一根手指），放開才真正放置
let downX = null
let downY = null
let downId = null

function resetPointer() {
  downX = null
  downY = null
  downId = null
}

function onBoardDown(e) {
  if (e.button !== undefined && e.button !== 0) return   // 滑鼠僅左鍵
  if (downId !== null) return                            // 已有手指按著，忽略第二根
  downX = e.clientX
  downY = e.clientY
  downId = e.pointerId
  // 主動抓取 pointer：確保 pointerup 一定回到棋盤。
  // 觸控本來就有隱含捕獲，但滑鼠沒有——按在棋盤上、拖到棋盤外才放開時，
  // pointerup 會送給外面的元素，downId 永遠清不掉，棋盤就再也點不動了（EXE 版才會遇到）。
  try { boardEl.value?.setPointerCapture(e.pointerId) } catch { /* 不支援就算了，不影響觸控 */ }
}

function onBoardUp(e) {
  if (downId === null || e.pointerId !== downId) return
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY)
  const x = downX
  const y = downY
  resetPointer()

  // 滑開取消（後悔機制）：門檻改成隨格子大小縮放，
  // 固定 24px 在高解析度手機上太敏感，手指自然的滾動就會被誤判成拖曳。
  const rect = boardEl.value?.getBoundingClientRect()
  const cellSize = rect ? rect.width / props.GRID_SIZE : 60
  if (moved > cellSize * 0.75) return

  // 以「按下」的座標判定，不用放開的座標：
  // 手指離開螢幕的瞬間接觸面會偏移，用放開點反而更容易偏格。
  const target = resolveTarget(x, y)
  if (target) emit('place', target)
}

// 盤子：放開才觸發交換、滑開取消（與棋盤相同手感、相同容錯門檻）
let plateDownX = null
let plateDownY = null
let plateDownId = null
function resetPlatePointer() {
  plateDownX = null
  plateDownY = null
  plateDownId = null
}
function onPlateDown(e) {
  if (e.button !== undefined && e.button !== 0) return
  if (plateDownId !== null) return
  plateDownX = e.clientX
  plateDownY = e.clientY
  plateDownId = e.pointerId
}
function onPlateUp(e) {
  if (plateDownId === null || e.pointerId !== plateDownId) return
  const moved = Math.hypot(e.clientX - plateDownX, e.clientY - plateDownY)
  resetPlatePointer()
  const rect = boardEl.value?.getBoundingClientRect()
  const cellSize = rect ? rect.width / props.GRID_SIZE : 60
  if (moved > cellSize * 0.75) return
  emit('swap')
}
</script>

<style scoped>
.board-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.board-wrapper {
  position: relative;
  width: min(94vw, 420px);
  /* bg_board.png 已裁切：左從 x=80 保留完整盤子，右到 x=990 保有機邊框 */
  background-image: url('../picts/bg_board.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  border-radius: 0;
  overflow: visible;
  box-shadow: none;
}

/* 盤子：覆蓋在格子 (0,0) 正上方，padding=0 後與網格左上角對齊 */
.piece-plate {
  position: absolute;
  top: 0;
  left: 0;
  /* padding=0 後格子寬 = board / 6 */
  width: calc(min(94vw, 420px) / 6);
  height: calc(min(94vw, 420px) / 6);
  z-index: 10;
  cursor: pointer;
  touch-action: none;
  -webkit-touch-callout: none;
}

/* 暫存物件：微微上移，讓物件看起來「坐」在盤子裡（盤面偏上緣） */
.plate-piece {
  position: absolute;
  top: 3%;
  left: 11%;
  right: 11%;
  bottom: 19%;
  filter: drop-shadow(0 0 3px white);
}

.dish-spacer {
  /* 佔住 (0,0) 格子，背後不顯示任何內容 */
}

.board {
  display: grid;
  gap: 0;
  width: min(94vw, 420px);
  background: transparent;
  /* padding=0：格子直接鋪滿整個 board-wrapper，無縫填滿 */
  padding: 0;
  border-radius: 0;
  overflow: visible;
  box-sizing: border-box;
  /* none（而非 manipulation）：完全交出觸控手勢給遊戲。
     manipulation 仍保留捲動／縮放判定，手指按下後只要微微移動，
     Android WebView 就可能把這一觸判成捲動並發出 pointercancel，
     pointerup 再也不會來 → 玩家眼中就是「點了沒反應」。 */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;   /* 長按不跳系統選單（同樣會造成 pointercancel） */
}

/* ── 環境小人：棋盤下方的綠地帶 ───────────── */
.villager-strip {
  position: absolute;
  top: 100%;              /* 緊貼棋盤下緣的綠地 */
  left: 2%;
  right: 2%;
  height: 52px;
  pointer-events: none;   /* 不攔截點擊 */
  z-index: 5;
}
.villager {
  position: absolute;
  width: 26px;
  /* 散步時平滑滑過去 */
  transition: left 1.4s ease-in-out, top 1.4s ease-in-out;
}
.villager svg {
  width: 100%;
  height: auto;
  display: block;
  /* 細深色描邊，和已放置物件一致（原版小人無白框） */
  filter: drop-shadow(0 1px 1.5px rgba(30, 32, 14, 0.5));
}
/* 待機跳動：每個小人 animation-duration 不同，節奏錯開 */
.villager-sprite {
  animation: v-hop 1s ease-in-out infinite;
  transform-origin: 50% 100%;
}
@keyframes v-hop {
  0%, 100% { transform: translateY(0)      scale(1, 1); }
  30%      { transform: translateY(-16%)   scale(0.96, 1.05); }
  50%      { transform: translateY(0)      scale(1.04, 0.94); }
  62%      { transform: translateY(0)      scale(1, 1); }
}
/* 出現 / 消失淡入淡出 */
.vg-enter-active { transition: opacity 0.5s, transform 0.5s; }
.vg-leave-active { transition: opacity 0.4s, transform 0.4s; }
.vg-enter-from { opacity: 0; transform: scale(0.3); }
.vg-leave-to   { opacity: 0; transform: scale(0.3); }
</style>
