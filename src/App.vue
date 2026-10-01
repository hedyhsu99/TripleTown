<template>
  <div class="app">

    <!-- Row 1：分數 + 目標 -->
    <div class="top-row">
      <div class="ui-panel score-panel">
        <div class="score-main">
          <span class="score-num">{{ score.toLocaleString() }}</span>
          <span class="score-unit">pts</span>
        </div>
        <div class="score-best">Best: {{ bestScore.toLocaleString() }}</div>
      </div>
      <div class="ui-panel goal-panel">
        <div class="goal-top">
          <!-- 原版固定顯示旗幟草丘 icon -->
          <svg class="goal-flag-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="24" cy="40" rx="20" ry="7" fill="#2a6018"/>
            <ellipse cx="22" cy="33" rx="16" ry="8" fill="#3a7820"/>
            <ellipse cx="20" cy="27" rx="13" ry="7" fill="#4a8828"/>
            <line x1="22" y1="8" x2="22" y2="28" stroke="#8B5E3C" stroke-width="2.5" stroke-linecap="round"/>
            <polygon points="22,8 38,14 22,20" fill="#4488cc"/>
          </svg>
          <div class="goal-info">
            <div class="goal-header">Goal: {{ GOAL_SCORE.toLocaleString() }} points</div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: goalPercent + '%' }"></div>
            </div>
            <div class="goal-pct">{{ goalPercent }}%</div>
          </div>
          <!-- 原版右側金幣圖示 -->
          <svg class="goal-coin-icon" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="16" fill="#E8A800"/>
            <circle cx="18" cy="18" r="13" fill="#F4C430"/>
            <circle cx="18" cy="18" r="10" fill="#E8A800"/>
            <text x="18" y="23" text-anchor="middle" font-size="13" font-weight="bold" fill="#7A4A00">$</text>
          </svg>
        </div>
      </div>
    </div>

    <!-- Row 2：下一個物件（next 預告） + Store -->
    <div class="mid-row">
      <div class="ui-panel piece-panel">
        <div class="piece-big-icon" v-if="nextPiece">
          <PieceSVG :type="nextPiece" />
        </div>
        <div class="piece-text">
          <div class="piece-action">next: {{ PIECES[nextPiece]?.article ?? 'a' }} {{ PIECES[nextPiece]?.name }}</div>
          <div class="turns-left" :class="{ warn: turnsLeft <= 20, empty: turnsLeft <= 0 }">
            <div class="regen-fill" :style="{ width: turnsRegenProgress + '%' }"></div>
            <span class="turns-text">{{ Math.max(0, turnsLeft) }} turns left</span>
          </div>
        </div>
      </div>
      <div class="store-panel" @click="showStore = true">
        <img class="store-icon-img" :src="btnStore" alt="store" />
        <div class="store-text">
          <div class="store-label">Store (tap to buy)</div>
          <div class="store-coins">{{ coins.toLocaleString() }}</div>
        </div>
      </div>
    </div>

    <!-- Row 3：手上物件（左，遊戲結束時變 Settlement 按鈕）+ 3 個圖示按鈕（右） -->
    <div class="action-row">
      <Transition name="settlement-in">
        <button
          v-if="gameOver && !showGameOverBox"
          class="settlement-btn"
          @click="showGameOverBox = true"
        >
          <img :src="btnSettlement" alt="Settlement finished! Click to see awards" class="settlement-img" />
        </button>
        <div v-else class="settlement-placeholder"></div>
      </Transition>
      <div class="icon-btns">
        <button class="icon-btn" @click="showGuide = !showGuide" title="合成指引">
          <img :src="btnFox" alt="guide" />
        </button>
        <button class="icon-btn" title="Options" @click="showOptions = true">
          <img :src="btnSettings" alt="options" />
        </button>
        <button class="icon-btn" @click="confirmRestart" title="重新開始">
          <img :src="btnHome" alt="home" />
        </button>
      </div>
    </div>

    <!-- 棋盤 -->
    <div style="flex:1; min-height: 8px; max-height: 32px;"></div>
    <GameBoard
      :grid="grid"
      :GRID_SIZE="GRID_SIZE"
      :current-piece="currentPiece"
      :stored-piece="storedPiece"
      :game-over="gameOver"
      :parked-cell="parked.cell"
      :parked-merge="parked.merge"
      :premium-cells="premiumCells"
      @place="({ row, col }) => placePiece(row, col)"
      @swap="swapPiece"
    />

    <!-- 底部裝飾橫幅 -->
    <img class="bottom-deco" src="./picts/bg_button.png" alt="" />

    <!-- 目標達成橫幅 -->
    <Transition name="banner-slide">
      <div v-if="goalReached && showGoalBanner" class="goal-banner" @click="showGoalBanner = false">
        🎉 目標達成！繼續建設你的城鎮！
      </div>
    </Transition>

    <!-- 商店 overlay（以 store.png 為視覺，疊加透明點擊區） -->
    <Transition name="fade">
      <div v-if="showStore" class="overlay" @click.self="showStore = false">
        <div class="shop-wrap">

          <!-- 餘額列（圖片外，確保永遠可見） -->
          <div class="shop-balance-bar">
            <svg viewBox="0 0 18 18" width="15" height="15">
              <circle cx="9" cy="9" r="8" fill="#E8A800"/>
              <circle cx="9" cy="9" r="6" fill="#F4C430"/>
              <text x="9" y="13" text-anchor="middle" font-size="8" font-weight="bold" fill="#7A4A00">$</text>
            </svg>
            Your balance: {{ coins.toLocaleString() }} coins
          </div>

          <!-- store.png + 透明點擊層 -->
          <div class="shop-img-wrap">
            <img :src="storeImg" class="shop-bg-img" draggable="false" />

            <!-- 全部 8 個商品透明點擊區（null = 未實作，永遠灰色） -->
            <div
              v-for="(hit, i) in SHOP_HITS"
              :key="i"
              class="shop-hit"
              :class="{
                'cant-afford': cantAfford(hit),
                'just-bought': hit.itemId && lastBought === hit.itemId
              }"
              :style="{ top: hit.top, left: hit.left, width: hit.w, height: hit.h }"
              @click="hit.itemId ? handleBuyItem(getStoreItem(hit.itemId)) : null"
            ></div>

            <!-- 動態庫存數字：疊在各物件圖示右下角（仿原版 ×N 樣式），隨購買遞減 -->
            <span
              v-for="b in STOCK_BADGES"
              :key="b.itemId"
              class="shop-stock-num"
              :class="{ 'sold-out': storeStock[b.itemId] <= 0 }"
              :style="{ top: b.top, left: b.left }"
            >x{{ storeStock[b.itemId] }}</span>

            <!-- Exit 按鈕透明區 -->
            <div class="shop-hit shop-exit-hit"
                 style="top:87.5%;left:64%;width:34%;height:11%"
                 @click="showStore = false"></div>

            <!-- 購買佇列提示（圖片內左下） -->
            <div v-if="storeQueue.length > 0" class="shop-queue-badge">
              {{ storeQueue.length }} queued
            </div>
          </div>

        </div>
      </div>
    </Transition>

    <!-- Options 視窗（仿原版齒輪選單） -->
    <Transition name="fade">
      <div v-if="showOptions" class="overlay" @click.self="showOptions = false">
        <div class="opt-box">
          <div class="opt-header">Options</div>
          <div class="opt-body">
            <!-- 音效開關 -->
            <button class="opt-row" @click="soundOn = toggleMute()">
              <span class="opt-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M9 18 V7 L18 5 V16" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
                  <circle cx="7.5" cy="18" r="2.4" fill="#fff"/>
                  <circle cx="16.5" cy="16" r="2.4" fill="#fff"/>
                  <line v-if="!soundOn" x1="3" y1="21" x2="21" y2="3" stroke="#5a1a10" stroke-width="2.6" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="opt-label">Sound: {{ soundOn ? 'On' : 'Off' }}</span>
            </button>

            <!-- 排行榜：點開顯示最高的 10 筆完場紀錄 -->
            <button class="opt-row" @click="showHighScores = !showHighScores">
              <span class="opt-icon">
                <svg viewBox="0 0 24 24">
                  <rect x="3"  y="12" width="5.5" height="8" rx="1" fill="#fff"/>
                  <rect x="9.2" y="7"  width="5.5" height="13" rx="1" fill="#fff"/>
                  <rect x="15.5" y="10" width="5.5" height="10" rx="1" fill="#fff"/>
                </svg>
              </span>
              <span class="opt-label">High scores</span>
            </button>
            <div v-if="showHighScores" class="opt-scores">
              <div v-if="highScores.length === 0" class="opt-scores-empty">
                尚無完場紀錄（玩到棋盤全滿才會記錄）
              </div>
              <div v-for="(s, i) in highScores" :key="i" class="opt-score-row">
                <span class="opt-score-rank">{{ i + 1 }}</span>
                <span class="opt-score-val">{{ s.score.toLocaleString() }}</span>
                <span class="opt-score-date">{{ s.date }}</span>
              </div>
            </div>

            <!-- Credits -->
            <button class="opt-row" @click="showCredits = !showCredits">
              <span class="opt-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M5 4 Q7 9 8 10 Q5 13 5 16 Q5 20 12 20 Q19 20 19 16 Q19 13 16 10 Q17 9 19 4 Q15 7 14 7 Q13 6 12 6 Q11 6 10 7 Q9 7 5 4 Z" fill="#fff"/>
                </svg>
              </span>
              <span class="opt-label">Credits</span>
            </button>
            <div v-if="showCredits" class="opt-credits">
              Triple Town CL — 致敬 Spry Fox《Triple Town》的個人練習作品。<br/>
              開發：Hedy ＆ Claude（Vue 3 + Capacitor + Electron）
            </div>

            <!-- 放棄目前這局 -->
            <button class="opt-row" @click="abandonGame">
              <span class="opt-icon">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="13" r="8" fill="none" stroke="#fff" stroke-width="2.4"/>
                  <line x1="12" y1="3" x2="12" y2="11" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="opt-label">Abandon current game</span>
            </button>
          </div>
          <div class="opt-footer">
            <span class="opt-version">v1.0.0</span>
            <button class="opt-done" @click="showOptions = false">Done</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 合成指引 overlay -->
    <Transition name="fade">
      <div v-if="showGuide" class="overlay" @click.self="showGuide = false">
        <div class="guide-box">
          <div class="guide-title">合成指引</div>
          <div class="guide-list">
            <div v-for="(result, source) in MERGE_INTO" :key="source" class="guide-row">
              <div class="g-icon"><PieceSVG :type="source" /></div>
              <span class="g-x3">× {{ MERGE_COUNT[source] ?? 3 }}</span>
              <span class="g-arrow">→</span>
              <div class="g-icon"><PieceSVG :type="result" /></div>
              <span class="g-name">{{ PIECES[result]?.name }}</span>
            </div>
          </div>
          <button class="close-btn" @click="showGuide = false">關閉</button>
        </div>
      </div>
    </Transition>

    <!-- Out of turns! 視窗（步數用光時嘗試放置就跳出，版面仿原版） -->
    <Transition name="fade">
      <div v-if="showOutOfTurns" class="overlay" @click.self="showOutOfTurns = false">
        <div class="oot-box">
          <div class="oot-header">Out of turns!</div>
          <div class="oot-body">

            <!-- 選項1：無限暢玩（原版為付費項目，此處僅展示、不可點） -->
            <div class="oot-row oot-disabled">
              <svg class="oot-icon" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="#f4c430" stroke="#c89000" stroke-width="2.5"/>
                <circle cx="24" cy="24" r="14" fill="#fff8e0"/>
                <line x1="24" y1="24" x2="24" y2="14" stroke="#3c3218" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="24" y1="24" x2="30" y2="27" stroke="#3c3218" stroke-width="2.5" stroke-linecap="round"/>
                <text x="24" y="42" text-anchor="middle" font-size="13" font-weight="bold" fill="#8a5a00">&#8734;</text>
              </svg>
              <div class="oot-info">
                <div class="oot-title">Unlimited play, all modes</div>
                <div class="oot-sub">$130.00（試玩版未提供）</div>
              </div>
            </div>

            <!-- 選項2：金幣買 200 步 -->
            <div class="oot-row" :class="{ 'oot-disabled': coins < 950 }" @click="buyTurnsFromDialog">
              <svg class="oot-icon" viewBox="0 0 48 48">
                <ellipse cx="22" cy="32" rx="14" ry="6" fill="#c89000"/>
                <ellipse cx="22" cy="28" rx="14" ry="6" fill="#f4c430"/>
                <ellipse cx="26" cy="22" rx="14" ry="6" fill="#c89000"/>
                <ellipse cx="26" cy="18" rx="14" ry="6" fill="#ffd75e"/>
              </svg>
              <div class="oot-info">
                <div class="oot-title">Use coins to buy 200 turns</div>
                <div class="oot-sub"><span class="vc-coin"></span> 950</div>
              </div>
            </div>

            <!-- 選項3：等待回血（顯示倒數，點了關閉視窗） -->
            <div class="oot-row" @click="showOutOfTurns = false">
              <svg class="oot-icon" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="#2a4a7a" stroke="#c89000" stroke-width="2.5"/>
                <path d="M24 4 A20 20 0 0 1 24 44 Z" fill="#8ec4e8"/>
                <circle cx="16" cy="20" r="5" fill="#f2e28a"/>
                <circle cx="33" cy="26" r="4" fill="#fff" opacity="0.9"/>
              </svg>
              <div class="oot-info">
                <div class="oot-title">Wait for turns to refresh</div>
                <div class="oot-sub">next turn in 0:{{ String(turnsRegenSecs).padStart(2, '0') }}</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Transition>

    <!-- Village Complete 結算視窗（點 Settlement 後才出現，版面仿原版） -->
    <Transition name="fade">
      <div v-if="gameOver && showGameOverBox" class="overlay">
        <div class="vc-box">
          <!-- 標題欄：深綠底、置左大字 -->
          <div class="vc-header">Village Complete</div>

          <!-- 恭喜區：黃色底、文字置左、含總金幣 -->
          <div class="vc-congrats" v-if="settlement">
            <div class="vc-congrats-title">Congratulations!</div>
            <div class="vc-congrats-msg">Her Majesty has awarded you a bonus for your good deeds in the new world</div>
            <div class="vc-total">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <circle cx="12" cy="12" r="11" fill="#E8A800"/>
                <circle cx="12" cy="12" r="8.5" fill="#F4C430"/>
                <text x="12" y="16.5" text-anchor="middle" font-size="13" font-weight="bold" fill="#8a5a00">+</text>
              </svg>
              {{ settlement.total.toLocaleString() }} coins
            </div>
          </div>

          <!-- 分項獎勵：米色底、兩欄無框列表（圖示左、名稱+金幣右） -->
          <div class="vc-grid" v-if="settlement">
            <!-- Village rank：草丘徽章圖示 -->
            <div class="vc-item">
              <svg class="vc-item-icon" viewBox="0 0 48 48">
                <ellipse cx="24" cy="40" rx="20" ry="7" fill="#2a6018"/>
                <ellipse cx="23" cy="34" rx="16" ry="8" fill="#3a7820"/>
                <ellipse cx="22" cy="28" rx="13" ry="7" fill="#4a8828"/>
                <path d="M16 22 L24 15 L32 22 Z" fill="#b03030"/>
                <rect x="19" y="22" width="10" height="8" rx="1" fill="#8a2020"/>
                <rect x="22.5" y="25" width="3" height="5" fill="#4a1408"/>
              </svg>
              <div class="vc-item-info">
                <div class="vc-item-name">Village rank</div>
                <div class="vc-item-coins"><span class="vc-coin"></span>{{ settlement.rankCoins.toLocaleString() }}</div>
              </div>
            </div>

            <!-- Years of History：日晷圖示 -->
            <div class="vc-item">
              <svg class="vc-item-icon" viewBox="0 0 48 48">
                <ellipse cx="24" cy="36" rx="17" ry="7" fill="#7a6a4a"/>
                <ellipse cx="24" cy="33" rx="17" ry="7" fill="#9a8a62"/>
                <ellipse cx="24" cy="32" rx="13" ry="5" fill="#b5a67c"/>
                <path d="M24 32 L24 14 L33 28 Z" fill="#8a4a20"/>
                <path d="M24 32 L24 14 L21.5 15.5 L21.5 32 Z" fill="#a85a28"/>
              </svg>
              <div class="vc-item-info">
                <div class="vc-item-name">{{ (settlement.turnsUsed * 10).toLocaleString() }} Years of History</div>
                <div class="vc-item-coins"><span class="vc-coin"></span>{{ settlement.historyCoins.toLocaleString() }}</div>
              </div>
            </div>

            <!-- 各物件分項 -->
            <div v-for="item in settlement.items" :key="item.piece" class="vc-item">
              <div class="vc-item-icon"><PieceSVG :type="item.piece" /></div>
              <div class="vc-item-info">
                <div class="vc-item-name">{{ capName(item.piece) }}{{ item.count > 1 ? ' x ' + item.count : '' }}</div>
                <div class="vc-item-coins"><span class="vc-coin"></span>{{ item.coins.toLocaleString() }}</div>
              </div>
            </div>
          </div>

          <!-- 按鈕：兩顆橘色 -->
          <div class="vc-btns">
            <button class="vc-btn" @click="showGameOverBox = false">View city</button>
            <button class="vc-btn" @click="restart">Start a new game</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useGame } from './game/useGame.js'
import { MERGE_INTO, MERGE_COUNT } from './game/pieces.js'
import { toggleMute, isSoundOn } from './game/sfx.js'
import GameBoard from './components/GameBoard.vue'
import PieceSVG from './components/PieceSVG.vue'
import btnFox        from './picts/btn_fox.png'
import btnSettings   from './picts/btn_settings.png'
import btnHome       from './picts/btn_home.png'
import btnStore      from './picts/btn_store.png'
import btnSettlement from './picts/btn-settlement.png'
import storeImg      from './picts/storeV2.png'

const {
  GRID_SIZE, GOAL_SCORE, PIECES, TOTAL_TURNS, STORE_ITEMS,
  grid, score, bestScore, highScores, turnsLeft, turnsRegenSecs, turnsRegenProgress, goalReached, goalPercent, coins,
  currentPiece, nextPiece, storedPiece, gameOver, settlement, storeQueue, storeStock, canUndo, parked, noTurns, premiumCells,
  placePiece, swapPiece, buyItem, restart,
} = useGame()

// 步數用光時嘗試放置 → 跳「Out of turns!」視窗（原版行為）
const showOutOfTurns = ref(false)
watch(noTurns, () => { showOutOfTurns.value = true })

// 用金幣買 200 步（同商店的 turns 商品）
function buyTurnsFromDialog() {
  const item = STORE_ITEMS.find(i => i.effect === 'turns')
  if (!item || !buyItem(item)) return
  showOutOfTurns.value = false
}

// 手牌智慧停放邏輯在 useGame.parked：優先停在可完成合成的空格（提示），
// 否則停在上一步附近；點任何空格即直接放置。

const soundOn = ref(isSoundOn())

const showGuide = ref(false)
const showGoalBanner = ref(false)
const showGameOverBox = ref(false)
const showStore = ref(false)
const showOptions = ref(false)
const showCredits = ref(false)
const showHighScores = ref(false)

// Options：放棄目前這局（重新開始）
function abandonGame() {
  if (!confirm('確定要放棄目前這局嗎？')) return
  showOptions.value = false
  showCredits.value = false
  restart()
}
const storeTab = ref('featured')
const lastBought = ref(null)

// storeV2.png（1024×856，無畫死數字的乾淨版）上全部 8 個商品格的點擊區
// （itemId: null = 未實作，永遠灰色）
const SHOP_HITS = [
  { itemId: 'turns',   top: '14%',   left: '3%',    w: '46%', h: '16%' },
  { itemId: null,      top: '14%',   left: '50.5%', w: '46%', h: '16%' }, // Unlimited turns (real $)
  { itemId: 'crystal', top: '32.7%', left: '3%',    w: '46%', h: '16%' },
  { itemId: 'bot',     top: '32.7%', left: '50.5%', w: '46%', h: '16%' },
  { itemId: 'tree',    top: '51.1%', left: '3%',    w: '46%', h: '16%' },
  { itemId: 'bush',    top: '51.1%', left: '50.5%', w: '46%', h: '16%' },
  { itemId: 'undo',    top: '68.9%', left: '3%',    w: '46%', h: '16%' }, // 悔棋：還原上一步
  { itemId: 'grass',   top: '68.9%', left: '50.5%', w: '46%', h: '16%' },
]

// 動態庫存數字座標（相對整圖的 %，落在各物件圖示右下角，仿原版 ×N 位置）
const STOCK_BADGES = [
  { itemId: 'crystal', top: '42.9%', left: '9.5%'  },
  { itemId: 'bot',     top: '42.9%', left: '56.5%' },
  { itemId: 'tree',    top: '61%',   left: '9.5%'  },
  { itemId: 'bush',    top: '61%',   left: '56.5%' },
  { itemId: 'grass',   top: '79%',   left: '56.5%' },
]

function getStoreItem(id) { return STORE_ITEMS.find(i => i.id === id) }

// 商品是否不可購買（灰色顯示）：未實作 / 本局庫存售完 / 金幣不足 / 遊戲結束 / Undo 無可悔棋的步
function cantAfford(hit) {
  if (!hit.itemId || gameOver.value) return true
  const item = getStoreItem(hit.itemId)
  if (item.stock !== null && storeStock[item.id] <= 0) return true
  if (coins.value < item.price) return true
  if (hit.itemId === 'undo' && !canUndo.value) return true
  return false
}

function handleBuyItem(item) {
  if (!item) return
  if (!buyItem(item)) return
  lastBought.value = item.id
  setTimeout(() => { lastBought.value = null }, 500)
  // 購買成功直接回到遊戲畫面，馬上可以使用買到的物件（不需再按 Exit）
  showStore.value = false
}

watch(gameOver, (val) => { if (!val) showGameOverBox.value = false })

watch(goalReached, (val) => {
  if (val) {
    showGoalBanner.value = true
    setTimeout(() => { showGoalBanner.value = false }, 4000)
  }
})

function confirmRestart() {
  if (confirm('確定要重新開始嗎？')) restart()
}

// 結算清單顯示用：物件名稱每個單字首字大寫（原版樣式，如 Floating Castle）
function capName(piece) {
  return (PIECES[piece]?.name ?? piece).replace(/\b\w/g, ch => ch.toUpperCase())
}
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app { height: 100%; }
body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background-image: url('./picts/bg_green.png');
  background-repeat: repeat;
  background-size: auto;
  color: #3a2800;
  overflow: hidden;
}
</style>

<style scoped>
/* ── 整體容器 ───────────────────────────── */
.app {
  min-height: 100vh;
  background-image: url('./picts/bg_green.png');
  background-repeat: repeat;
  background-size: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 8px 10px;
  gap: 5px;
}

/* ── UI 面板基底 ─────────────────────────── */
.ui-panel {
  /* bg_green.png 圖樣 + 深色疊加，讓面板和外圍背景同色系但更深 */
  background-image:
    linear-gradient(rgba(0,0,0,0.58), rgba(0,0,0,0.58)),
    url('./picts/bg_green.png');
  background-repeat: repeat;
  background-size: auto;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.10);
  padding: 7px 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.45);
}

/* ── Row 1：分數 + 目標 ──────────────────── */
.top-row {
  width: 100%;
  max-width: 420px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
/* 讓 grid 子項可收縮，避免窄螢幕撐爆導致折行 */
.top-row > *, .mid-row > * { min-width: 0; overflow: hidden; }

.score-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
}
.score-main {
  display: flex;
  align-items: baseline;
  gap: 5px;
}
.score-num {
  /* 字級以 7 位數（1,000,000）放得下為準 */
  font-size: clamp(15px, 5vw, 21px);
  font-weight: 900;
  letter-spacing: -0.5px;
  color: #ffffff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.6);
  white-space: nowrap;
}
.score-unit { font-size: 10px; color: #cccccc; font-weight: 700; }
.score-best { font-size: 9px; color: #aaaaaa; font-weight: 700; white-space: nowrap; }

.goal-panel { padding: 6px 8px; }
.goal-top { display: flex; align-items: center; gap: 5px; }
.goal-flag-icon { width: clamp(32px, 10vw, 44px); height: auto; flex-shrink: 0; }
.goal-coin-icon { width: clamp(22px, 7vw, 30px); height: auto; flex-shrink: 0; align-self: center; }
.goal-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.goal-header {
  font-size: clamp(8px, 2.4vw, 10px);
  color: #dddddd;
  font-weight: 700;
  white-space: nowrap;   /* 「Goal: 300,000 points」固定單行 */
}
.progress-track {
  height: 10px;
  background: rgba(0,0,0,0.35);
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.3);
}
.progress-fill {
  height: 100%;
  background-image:
    linear-gradient(rgba(0,0,0,0.00), rgba(0,0,0,0.05)),
    url('./picts/bg_green.png');
  background-repeat: repeat;
  background-size: auto;
  border-radius: 5px;
  transition: width 0.4s ease;
  box-shadow: 0 0 4px rgba(120,200,60,0.5);
}
.goal-pct { font-size: 10px; color: #aaaaaa; text-align: right; font-weight: 700; }

/* ── Row 2：當前物件 + Store ─────────────── */
.mid-row {
  width: 100%;
  max-width: 420px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.piece-panel { display: flex; align-items: center; gap: 7px; }
.piece-big-icon {
  width: clamp(42px, 12vw, 56px);
  height: clamp(42px, 12vw, 56px);
  flex-shrink: 0;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 3px;
  border: 1.5px solid rgba(0,0,0,0.3);
  filter: drop-shadow(0 0 3px white);
}
.piece-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.piece-action {
  font-size: clamp(9px, 2.8vw, 12px);
  color: #ffffff;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;      /* 「next: some grass」固定單行 */
  overflow: hidden;
  text-overflow: ellipsis;
}
.turns-left {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  white-space: nowrap;      /* 「149 turns left」固定單行 */
  position: relative;
  overflow: hidden;
  margin-top: 2px;
  padding: 2px 8px;
  background-image:
    linear-gradient(rgba(0,0,0,0.05), rgba(0,0,0,0.15)),
    url('./picts/bg_green.png');
  background-repeat: repeat;
  background-size: auto;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  border-radius: 20px;
}
.turns-left.warn {
  background-image:
    linear-gradient(rgba(160,0,0,0.65), rgba(120,0,0,0.80)),
    url('./picts/bg_green.png');
  animation: pulse 0.8s ease-in-out infinite alternate;
}
.turns-left.empty {
  background-image:
    linear-gradient(rgba(80,0,0,0.80), rgba(50,0,0,0.90)),
    url('./picts/bg_green.png');
  animation: pulse 0.5s ease-in-out infinite alternate;
}
/* 回血進度條：從左至右填充，代表距下一步的進度 */
.regen-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 20px;
  transition: width 0.9s linear;
  pointer-events: none;
}
.turns-text {
  position: relative;
  z-index: 1;
}

.store-panel {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  background-image:
    linear-gradient(rgba(0,0,0,0.58), rgba(0,0,0,0.58)),
    url('./picts/bg_green.png');
  background-repeat: repeat;
  background-size: auto;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  padding: 7px 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.45);
}
.store-panel:hover {
  background-image:
    linear-gradient(rgba(0,0,0,0.48), rgba(0,0,0,0.48)),
    url('./picts/bg_green.png');
}
.store-icon-img { width: clamp(34px, 9.5vw, 46px); height: auto; flex-shrink: 0; object-fit: contain; }
.store-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.store-label {
  /* 「Store (tap to buy)」必須完整單行：字級與圖示都要縮到窄機也放得下 */
  font-size: clamp(8px, 2.6vw, 11px);
  color: #ffffff;
  font-weight: 800;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.store-coins { font-size: clamp(12px, 3.8vw, 16px); color: #ffffff; font-weight: 900; white-space: nowrap; }

/* ── Row 3：Settlement + 3 按鈕 ─────────── */
.action-row {
  width: 100%;
  max-width: 420px;
  display: flex;
  align-items: stretch;
  gap: 6px;
}

.settlement-btn {
  flex: 1;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: stretch;
  transition: transform 0.1s;
  box-shadow: 0 3px 8px rgba(0,0,0,0.4);
  border-radius: 8px;
  overflow: hidden;
}
.settlement-img {
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
}
.settlement-btn:hover  { filter: brightness(1.08); }
.settlement-btn:active { transform: scale(0.97); }

.settlement-placeholder {
  flex: 1;
}

.icon-btns {
  display: flex;
  gap: 6px;
  align-items: center;
}
.icon-btn {
  width: 46px;
  height: 46px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 10px;
  overflow: hidden;
  transition: transform 0.1s;
  box-shadow: 0 3px 5px rgba(0,0,0,0.35);
}
.icon-btn img { width: 100%; height: 100%; display: block; object-fit: cover; }
.icon-btn:hover  { transform: scale(1.06); }
.icon-btn:active { transform: scale(0.93); }

/* ── Options 視窗（仿原版） ─────────────── */
.opt-box {
  width: min(92vw, 400px);
  background: #3d4a37;
  border-radius: 14px;
  padding: 4px 10px 12px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.7);
}
.opt-header {
  color: #ffffff;
  font-size: 30px;
  font-weight: 900;
  text-align: left;
  padding: 14px 6px 12px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.45);
}
.opt-body {
  background: #f6f3e4;
  border-radius: 3px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.opt-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  text-align: left;
}
.opt-row:active:not(.opt-row-static) { transform: scale(0.98); }
.opt-row-static { cursor: default; }
.opt-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 9px;
  background: linear-gradient(#f0922e, #d9700f);
  border: 2px solid #8a4506;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 3px rgba(0,0,0,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}
.opt-icon svg { width: 100%; height: 100%; }
.opt-label {
  font-size: 18px;
  font-weight: 800;
  color: #44585e;
}
/* 排行榜列表（High scores 點開展開） */
.opt-scores {
  background: rgba(0,0,0,0.18);
  border-radius: 8px;
  padding: 8px 12px;
  margin: 2px 4px 6px;
}
.opt-scores-empty {
  font-size: 13px;
  color: #5a6a52;
  text-align: center;
  padding: 6px 0;
}
.opt-score-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 3px 2px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
.opt-score-row:last-child { border-bottom: none; }
.opt-score-rank {
  width: 22px;
  font-size: 13px;
  font-weight: 900;
  color: #b06000;
  text-align: right;
}
.opt-score-val {
  flex: 1;
  font-size: 15px;
  font-weight: 800;
  color: #3c4a36;
}
.opt-score-date {
  font-size: 11px;
  color: #7a8a72;
}

.opt-credits {
  font-size: 13px;
  color: #5a6a60;
  line-height: 1.5;
  padding: 2px 8px 2px 58px;
}
.opt-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 4px 0;
}
.opt-version {
  color: #d8e0d0;
  font-size: 16px;
  font-weight: 800;
}
.opt-done {
  background: linear-gradient(#f0922e, #d9700f);
  border: 1px solid #a85508;
  border-radius: 8px;
  color: #fff;
  font-size: 17px;
  font-weight: 800;
  padding: 11px 38px;
  cursor: pointer;
  box-shadow: 0 3px 6px rgba(0,0,0,0.35);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.opt-done:active { transform: scale(0.96); }

/* ── 目標達成橫幅 ──────────────────────── */
.goal-banner {
  position: fixed;
  top: 120px;
  left: 50%;
  transform: translateX(-50%);
  background-image:
    linear-gradient(rgba(0,0,0,0.10), rgba(0,0,0,0.25)),
    url('./picts/bg_green.png');
  background-repeat: repeat;
  background-size: auto;
  border: 2px solid rgba(255,255,255,0.3);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  padding: 12px 24px;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  cursor: pointer;
  z-index: 150;
  white-space: nowrap;
}

.banner-slide-enter-active { transition: all 0.4s cubic-bezier(0.175,0.885,0.32,1.275); }
.banner-slide-leave-active { transition: all 0.3s ease-in; }
.banner-slide-enter-from  { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.85); }
.banner-slide-leave-to    { opacity: 0; transform: translateX(-50%) translateY(-10px); }

.settlement-in-enter-active { transition: all 0.35s cubic-bezier(0.175,0.885,0.32,1.275); }
.settlement-in-leave-active { transition: all 0.2s ease-in; }
.settlement-in-enter-from   { opacity: 0; transform: scale(0.8); }
.settlement-in-leave-to     { opacity: 0; transform: scale(0.9); }

/* ── 商店 overlay（PNG 圖疊層式） ─────── */
.shop-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.shop-balance-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0,0,0,0.72);
  color: #FFD060;
  font-size: 14px;
  font-weight: 800;
  padding: 7px 18px;
  border-radius: 20px;
}
.shop-img-wrap {
  position: relative;
  width: min(86vw, 360px);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}
.shop-bg-img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
  pointer-events: none;
}
/* 透明點擊區共用樣式 */
.shop-hit {
  position: absolute;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.12s;
}
.shop-hit:hover:not(.cant-afford) {
  background: rgba(255,255,255,0.18);
}
.shop-hit:active:not(.cant-afford) {
  background: rgba(255,255,255,0.30);
}
.shop-hit.cant-afford {
  background: rgba(0,0,0,0.38);
  cursor: not-allowed;
}
.shop-hit.just-bought {
  background: rgba(80,210,80,0.38);
}
.shop-exit-hit {
  cursor: pointer;
}
/* 動態庫存數字：純文字（無底色）疊在物件圖示右下角
   storeV2.png 是無數字的乾淨版（舊版含 ×N 的原圖備份在 art-reference/store_original.png） */
.shop-stock-num {
  position: absolute;
  width: 6.8%;
  height: 5%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(min(86vw, 360px) * 0.038);   /* 隨商店圖寬度縮放（貼近原圖字級） */
  font-weight: 900;
  color: #fff;
  /* 仿原圖樣式：白字 + 灰褐色外框 */
  text-shadow: -1px -1px 0 #8a8878, 1px -1px 0 #8a8878,
               -1px 1px 0 #8a8878, 1px 1px 0 #8a8878,
               0 1.5px 1.5px rgba(0,0,0,0.3);
  pointer-events: none;
}
.shop-stock-num.sold-out {
  color: #cfcaba;
}
/* 佇列提示徽章 */
.shop-queue-badge {
  position: absolute;
  bottom: 14%;
  left: 3%;
  background: rgba(255,220,50,0.92);
  color: #6a4000;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 10px;
  pointer-events: none;
}

/* ── 合成指引 overlay ──────────────────── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.guide-box {
  background-image:
    linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)),
    url('./picts/bg_green.png');
  background-repeat: repeat;
  background-size: auto;
  border: 3px solid rgba(255,255,255,0.25);
  border-radius: 16px;
  padding: 18px;
  min-width: 290px;
  max-width: 350px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.guide-title {
  font-size: 18px;
  font-weight: 900;
  color: #fff8e0;
  margin-bottom: 12px;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
.guide-list { display: flex; flex-direction: column; gap: 4px; }
.guide-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: rgba(0,0,0,0.25);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
}
.g-icon  { width: 32px; height: 32px; flex-shrink: 0; }
.g-x3    { font-size: 12px; color: #ffd88a; width: 28px; font-weight: 700; }
.g-arrow { font-size: 16px; color: #ffd88a; }
.g-name  { font-size: 13px; color: #fff8e0; font-weight: 600; }
.close-btn {
  margin-top: 14px;
  width: 100%;
  background-image:
    linear-gradient(rgba(0,0,0,0.30), rgba(0,0,0,0.50)),
    url('./picts/bg_green.png');
  background-repeat: repeat;
  background-size: auto;
  border: 2px solid rgba(255,255,255,0.25);
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  padding: 10px;
  cursor: pointer;
  box-shadow: 0 3px 6px rgba(0,0,0,0.3);
}

/* ── Out of turns! 視窗（版面仿原版） ─────────── */
.oot-box {
  width: min(88vw, 380px);
  background: #3d4a37;
  border-radius: 14px;
  padding: 4px 10px 14px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.7);
}
.oot-header {
  color: #ffffff;
  font-size: 26px;
  font-weight: 900;
  text-align: left;
  padding: 14px 6px 12px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.45);
}
.oot-body {
  background: #f6f3e4;
  border-radius: 4px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.oot-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fdfbf2;
  border: 1px solid #d8d2bc;
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.12s, transform 0.1s;
}
.oot-row:active { transform: scale(0.98); background: #f0ead6; }
.oot-row.oot-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
.oot-icon { width: 44px; height: 44px; flex-shrink: 0; }
.oot-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.oot-title { font-size: 16px; font-weight: 800; color: #2c6e5e; line-height: 1.2; }
.oot-sub {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 700;
  color: #5a6a60;
}

/* ── Village Complete 結算視窗（版面仿原版） ─────────── */
.vc-box {
  width: min(92vw, 400px);
  background: #3d4a37;            /* 深綠外框底 */
  border-radius: 14px;
  padding: 4px 10px 12px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.7);
}
.vc-header {
  color: #ffffff;
  font-size: 30px;
  font-weight: 900;
  text-align: left;
  padding: 14px 6px 12px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.45);
}
/* 黃色恭喜區：文字置左 */
.vc-congrats {
  background: #f2c33d;
  padding: 13px 16px 14px;
  text-align: left;
  border-radius: 3px 3px 0 0;
}
.vc-congrats-title {
  font-size: 23px;
  font-weight: 900;
  color: #2c6e5e;
}
.vc-congrats-msg {
  font-size: 15px;
  color: #44585e;
  line-height: 1.35;
  margin-top: 3px;
}
.vc-total {
  font-size: 24px;
  font-weight: 900;
  color: #3c3218;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
/* 米色分項區：兩欄、無框列表 */
.vc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 10px;
  background: #f6f3e4;
  padding: 18px 14px;
  max-height: 40vh;
  overflow-y: auto;
  border-radius: 0 0 3px 3px;
}
.vc-item {
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
}
.vc-item-icon {
  width: 54px;
  height: 54px;
  flex-shrink: 0;
}
.vc-item-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.vc-item-name {
  font-size: 15px;
  color: #44585e;
  font-weight: 700;
  line-height: 1.2;
}
.vc-item-coins {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 18px;
  font-weight: 900;
  color: #3c3218;
}
/* 小金幣圖示（+ 號） */
.vc-coin {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #ffe070, #E8A800);
  border: 1.5px solid #c88c00;
  position: relative;
  flex-shrink: 0;
}
.vc-coin::before {
  content: '+';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  color: #8a5a00;
  line-height: 1;
}
/* 底部兩顆橘色按鈕 */
.vc-btns {
  display: flex;
  gap: 10px;
  padding: 12px 0 0;
}
.vc-btn {
  flex: 1;
  background: linear-gradient(#f0922e, #d9700f);
  border: 1px solid #a85508;
  border-radius: 8px;
  color: #fff;
  font-size: 17px;
  font-weight: 800;
  padding: 13px 8px;
  cursor: pointer;
  box-shadow: 0 3px 6px rgba(0,0,0,0.35);
  transition: transform 0.1s, filter 0.1s;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.vc-btn:hover  { filter: brightness(1.08); }
.vc-btn:active { transform: scale(0.96); }

/* ── 底部裝飾 ─────────────────────────── */
.bottom-deco {
  width: 100%;
  max-width: 420px;
  display: block;
  object-fit: cover;
  margin-top: auto;
  pointer-events: none;
  user-select: none;
}

/* ── 動畫 ─────────────────────────────── */
.fade-enter-active { transition: opacity 0.25s; }
.fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes pulse {
  from { opacity: 0.7; }
  to   { opacity: 1.0; }
}
</style>
