import { reactive, ref, computed, watch } from 'vue'
import { PIECES, MERGE_INTO, MERGE_COUNT, SPAWN_POOL, PREMIUM_PIECES, weightedRandom } from './pieces.js'
import { playPlace, playMerge, playCoin } from './sfx.js'

const GRID_SIZE = 6
export const TOTAL_TURNS = 150
export const GOAL_SCORE = 300000
const REGEN_SECONDS = 10  // 每 10 秒補回 1 步

// localStorage 持久化 key（金幣、最高分、排行榜跨局跨 session 保留）
const LS_COINS  = 'tripletown_coins'
const LS_BEST   = 'tripletown_best'
const LS_SCORES = 'tripletown_highscores'

let regenIntervalId = null

export function useGame() {
  const grid = reactive(createEmptyGrid())
  const score = ref(0)
  const currentPiece = ref(null)
  const nextPiece = ref(null)
  const storedPiece = ref(null)   // 盤子：hold 槽，初始為空
  const gameOver = ref(false)
  const turnsLeft = ref(TOTAL_TURNS)
  const goalReached = ref(false)

  const coins = ref(Number(localStorage.getItem(LS_COINS)) || 0)
  const bestScore = ref(Number(localStorage.getItem(LS_BEST)) || 0)
  // 排行榜：完場（棋盤滿）的分數紀錄，只保留最高的 10 筆
  const highScores = ref((() => {
    try { return JSON.parse(localStorage.getItem(LS_SCORES)) || [] } catch { return [] }
  })())
  const premiumCells = reactive(new Set())  // 高級版物件的格子（4+ 合成產生，閃亮外觀）
  const canUndo = ref(false)   // 是否有可悔棋的快照（商店 Undo 用）
  const noTurns = ref(0)       // 步數用光時仍嘗試放置的訊號（每次+1，UI 跳「Out of turns!」）
  const lastPlaced = ref(null) // 最後放置的格子 index（r*GRID_SIZE+c），作為手牌停放位置的參考點
  const mergedCells = reactive(new Set())
  const settlement = ref(null)  // 遊戲結束後的結算資料
  const storeQueue = ref([])    // 商店購買的物件佇列（優先出牌）
  const turnsRegenSecs = ref(REGEN_SECONDS)  // 距下一步回血的秒數倒計時
  // 0-100，做背景填充進度條用
  const turnsRegenProgress = computed(() =>
    turnsLeft.value >= TOTAL_TURNS ? 0
      : Math.round((REGEN_SECONDS - turnsRegenSecs.value) / REGEN_SECONDS * 100)
  )

  let undoState = null     // 上一步放置前的快照
  let mergeChain = 0       // 本次放置觸發的合成次數（音效音高用）

  function createEmptyGrid() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  }

  function generatePiece() {
    // 商店購買的物件優先出牌
    if (storeQueue.value.length > 0) return storeQueue.value.shift()
    // 原版規則：熊/忍者熊/bot 與其他物件一樣由加權機率隨機出現，不可預測
    return weightedRandom(SPAWN_POOL)
  }

  // ── 回血計時：採「牆上時鐘」而非每秒累加 ──────────────────────
  // 手機切到背景時系統會凍結 setInterval，回前景後依實際經過時間一次補回，
  // 因此切去別的 APP 期間照樣回血。
  let regenAnchor = Date.now()   // 目前這一步回血的起算時間點

  function regenTick() {
    const now = Date.now()
    if (turnsLeft.value >= TOTAL_TURNS) {
      regenAnchor = now
      turnsRegenSecs.value = REGEN_SECONDS
      return
    }
    const elapsedSec = Math.floor((now - regenAnchor) / 1000)
    const gained = Math.floor(elapsedSec / REGEN_SECONDS)
    if (gained > 0) {
      turnsLeft.value = Math.min(TOTAL_TURNS, turnsLeft.value + gained)
      regenAnchor += gained * REGEN_SECONDS * 1000
      if (turnsLeft.value >= TOTAL_TURNS) regenAnchor = now
    }
    // UI 倒數顯示：距下一步回血的剩餘秒數
    turnsRegenSecs.value = REGEN_SECONDS - (Math.floor((now - regenAnchor) / 1000) % REGEN_SECONDS)
  }

  function startRegenTimer() {
    if (regenIntervalId) clearInterval(regenIntervalId)
    regenAnchor = Date.now()
    turnsRegenSecs.value = REGEN_SECONDS
    regenIntervalId = setInterval(regenTick, 1000)
  }

  // App 從背景回前景時立即結算（背景期間 interval 被凍結，這裡補上）
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) regenTick()
    })
  }

  // 結算：場上各建築留存的金幣價值
  const SETTLE_COINS = {
    hut: 5, house: 20, mansion: 100, castle: 200,
    floating_castle: 1000, triple_castle: 5000,
    church: 30, cathedral: 150,
    treasure: 500, large_treasure: 2000,
    mountain: 50,
  }

  // 村莊等級：依場上最高階建築決定等級標籤與對應等第（顯示用）
  const VILLAGE_RANKS = [
    { piece: 'triple_castle',   label: 'Imperial City' },
    { piece: 'floating_castle', label: 'Royal City'    },
    { piece: 'castle',          label: 'Castle Town'   },
    { piece: 'mansion',         label: 'Noble Estate'  },
    { piece: 'house',           label: 'Township'      },
    { piece: 'hut',             label: 'Settlement'    },
    { piece: 'tree',            label: 'Hamlet'        },
    { piece: 'bush',            label: 'Camp'          },
  ]

  // 建築 tier 值（用於計算村莊等級金幣 = tier 總和 × 50）
  const BUILDING_TIER = {
    bush: 2, tree: 3, hut: 4, house: 5, mansion: 6,
    castle: 7, floating_castle: 8, triple_castle: 9,
    church: 4, cathedral: 6, treasure: 5, large_treasure: 7,
  }

  // 遊戲結束最終清算：所有熊 → 墓碑連鎖（可累積成 church / cathedral 加分）
  function finalizeBoard() {
    const g = grid.map(r => [...r])

    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (g[r][c] === 'ninja_bear' || g[r][c] === 'bear') {
          g[r][c] = 'tombstone'
          processMerges(g, r, c)
        }

    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (grid[r][c] !== g[r][c]) grid[r][c] = g[r][c]
  }

  function computeSettlement() {
    const counts = {}
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++) {
        const p = grid[r][c]
        if (p) counts[p] = (counts[p] || 0) + 1
      }

    // 最高等級（標籤用）
    let rank = { piece: 'grass', label: 'Outpost' }
    for (const r of VILLAGE_RANKS) {
      if (counts[r.piece]) { rank = r; break }
    }

    // 村莊等級金幣 = 場上所有建築的 tier 總和 × 50
    // 原版 "Village rank" 反映整個城鎮的整體發展程度，非單一最高物件
    let tierSum = 0
    for (const [piece, t] of Object.entries(BUILDING_TIER)) {
      if (counts[piece]) tierSum += counts[piece] * t
    }
    const rankCoins = tierSum * 50

    // 各物件分項（只列有金幣價值的）
    const items = []
    for (const [piece, perPiece] of Object.entries(SETTLE_COINS)) {
      if (counts[piece]) {
        items.push({ piece, count: counts[piece], coins: counts[piece] * perPiece })
      }
    }
    items.sort((a, b) => b.coins - a.coins)

    const turnsUsed = TOTAL_TURNS - Math.max(0, turnsLeft.value)
    const historyCoins = turnsUsed  // 每步 1 金幣

    const total = rankCoins + historyCoins + items.reduce((s, i) => s + i.coins, 0)
    coins.value += total

    return { total, rank, rankCoins, historyCoins, turnsUsed, items }
  }

  function init() {
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        grid[r][c] = null
    score.value = 0
    // coins 不重置：金幣為跨局持久貨幣，留在 Store 累積
    gameOver.value = false
    turnsLeft.value = TOTAL_TURNS
    goalReached.value = false
    storedPiece.value = null
    mergedCells.clear()
    premiumCells.clear()
    settlement.value = null
    storeQueue.value = []
    resetStoreStock()   // 商店庫存每局重置（局內不補貨）
    undoState = null
    canUndo.value = false
    lastPlaced.value = null

    placeInitialPieces(grid)  // 初始隨機擺放一些物件

    currentPiece.value = generatePiece()
    nextPiece.value = generatePiece()
    startRegenTimer()
  }

  function placeInitialPieces(g) {
    const initial = [
      'grass', 'grass', 'grass', 'grass', 'grass',
      'bush',  'bush',  'bush',
      'tree',  'tree',
      'hut',
    ]
    const cells = []
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (!(r === 0 && c === 0))  // 跳過盤子格
          cells.push([r, c])
    cells.sort(() => Math.random() - 0.5)
    for (let i = 0; i < initial.length; i++) {
      const [r, c] = cells[i]
      g[r][c] = initial[i]
    }
  }

  // 凍結追蹤：記錄每一步的進入/完成狀態，APP 凍結後重啟可查最後卡在哪
  function trace(phase, extra = '') {
    try {
      localStorage.setItem('tt_trace', `${phase}|${extra}|${new Date().toISOString()}`)
    } catch { /* 追蹤失敗不影響遊戲 */ }
  }

  function placePiece(row, col) {
    if (gameOver.value) return
    if (row === 0 && col === 0) return  // 保留給盤子

    // 點擊 isOpenable 物件（寶箱）→ 開箱拿金幣，不消耗步數
    if (grid[row][col] && PIECES[grid[row][col]]?.isOpenable) {
      coins.value += PIECES[grid[row][col]].coins ?? 0
      grid[row][col] = null
      playCoin()
      return
    }

    if (turnsLeft.value <= 0) {
      noTurns.value++   // 通知 UI 跳出「Out of turns!」視窗（原版行為，避免被誤認為當機）
      return
    }

    // bot 只能放在有物件的格子；其他物件只能放空格
    if (currentPiece.value === 'bot') {
      if (grid[row][col] === null) return  // 空格無效
    } else {
      if (grid[row][col] !== null) return  // 非空格無效
    }

    trace('place-start', `${row},${col},${currentPiece.value}`)

    // Undo 快照：記錄放置前的完整狀態（商店 Undo 還原用；不含 coins）
    undoState = {
      grid: grid.map(r => [...r]),
      score: score.value,
      turnsLeft: turnsLeft.value,
      currentPiece: currentPiece.value,
      nextPiece: nextPiece.value,
      storedPiece: storedPiece.value,
      premium: new Set(premiumCells),
    }
    canUndo.value = true

    mergedCells.clear()
    mergeChain = 0

    // 原版規則：每放置一個物件即得基本分（placeScore）
    score.value += PIECES[currentPiece.value]?.placeScore ?? 0

    const g = grid.map(r => [...r])
    const target = grid[row][col]

    if (currentPiece.value === 'crystal') {
      g[row][col] = resolveCrystal(g, row, col)
      processMerges(g, row, col)
    } else if (currentPiece.value === 'bot') {
      if (target === 'ninja_bear' || target === 'bear') {
        // 熊類 → 墓碑，觸發合成
        g[row][col] = 'tombstone'
        processMerges(g, row, col)
      } else {
        // 其他物件 → 摧毀消失，bot 消耗
        g[row][col] = null
        premiumCells.delete(row * GRID_SIZE + col)  // 被摧毀的高級物件清除標記
      }
    } else {
      g[row][col] = currentPiece.value
      processMerges(g, row, col)
    }
    moveBears(g, row, col)

    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (grid[r][c] !== g[r][c]) grid[r][c] = g[r][c]

    // 音效：有合成放合成音（連鎖越深音越高），否則放置音
    if (mergeChain > 0) playMerge(mergeChain)
    else playPlace()

    // 記錄放置位置：下一張手牌會停放在這格附近
    lastPlaced.value = row * GRID_SIZE + col

    turnsLeft.value--

    if (!goalReached.value && score.value >= GOAL_SCORE) {
      goalReached.value = true
    }

    currentPiece.value = nextPiece.value
    nextPiece.value = generatePiece()

    if (!hasEmptyCell()) {
      gameOver.value = true
      finalizeBoard()            // 最終清算：所有熊 → 墓碑連鎖
      settlement.value = computeSettlement()
      recordHighScore()          // 完場分數寫入排行榜
    }

    trace('idle')  // 本步邏輯全部完成
  }

  // 完場分數寫入排行榜：依分數排序、只留最高 10 筆
  function recordHighScore() {
    const entry = { score: score.value, date: new Date().toISOString().slice(0, 10) }
    const list = [...highScores.value, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
    highScores.value = list
    try { localStorage.setItem(LS_SCORES, JSON.stringify(list)) } catch { /* 寫入失敗不影響遊戲 */ }
  }

  // Crystal 放置時判斷：以 crystal 為橋梁，合併所有直接相鄰的同類連通群
  // 各方向的同類群 union 後總數 >= (required-1) 即可觸發合成
  // 找不到有效目標 → 變成石頭
  function resolveCrystal(g, row, col) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    // 先清除 crystal 格，避免 floodFill 把自己算進去
    g[row][col] = null

    // typeMap: 每個相鄰類型 → 合併所有相鄰連通群的 cell key 集合
    // 關鍵：crystal 可橋接左右兩側不相連的同類群（各自 floodFill 後 union）
    const typeMap = {}
    for (const [dr, dc] of dirs) {
      const nr = row + dr, nc = col + dc
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue
      const t = g[nr][nc]
      if (!t || !MERGE_INTO[t]) continue
      if (!typeMap[t]) typeMap[t] = new Set()
      for (const [r, c] of floodFill(g, nr, nc, t)) {
        typeMap[t].add(r * GRID_SIZE + c)
      }
    }

    // 多組同時可合成時，高階優先：以合成結果的價值（score + coins）排序取最高
    let best = null
    let bestValue = -1
    for (const [t, cells] of Object.entries(typeMap)) {
      const required = MERGE_COUNT[t] ?? 3
      if (cells.size < required - 1) continue
      const result = PIECES[MERGE_INTO[t]]
      const value = (result.score ?? 0) + (result.coins ?? 0)
      if (value > bestValue) {
        best = t
        bestValue = value
      }
    }
    if (best) {
      g[row][col] = best
      return best
    }

    g[row][col] = 'rock'
    return 'rock'
  }

  // 盤子交換：把手上的物件存到盤子（或與盤子物件交換）
  function swapPiece() {
    if (gameOver.value) return
    if (storedPiece.value === null) {
      // 盤子空：存入當前物件，往下取 next
      storedPiece.value = currentPiece.value
      currentPiece.value = nextPiece.value
      nextPiece.value = generatePiece()
    } else {
      // 盤子有物件：交換
      const temp = storedPiece.value
      storedPiece.value = currentPiece.value
      currentPiece.value = temp
    }
  }

  function floodFill(g, row, col, type) {
    const result = []
    const visited = new Set()
    const queue = [[row, col]]
    while (queue.length > 0) {
      const [r, c] = queue.shift()
      const key = r * GRID_SIZE + c
      if (visited.has(key)) continue
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue
      if (g[r][c] !== type) continue
      visited.add(key)
      result.push([r, c])
      queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1])
    }
    return result
  }

  function processMerges(g, row, col) {
    const type = g[row][col]
    if (!type || !MERGE_INTO[type]) return

    const required = MERGE_COUNT[type] ?? 3
    const connected = floodFill(g, row, col, type)
    if (connected.length < required) return

    for (const [r, c] of connected) {
      g[r][c] = null
      mergedCells.add(r * GRID_SIZE + c)
      premiumCells.delete(r * GRID_SIZE + c)  // 被消耗的素材格清除高級標記
    }

    const mergedType = MERGE_INTO[type]
    g[row][col] = mergedType
    mergedCells.delete(row * GRID_SIZE + col)

    // 原版 4+ 合成 bonus：一次合成超過所需數量 → 雙倍分數，
    // 且結果物件換成「閃亮高級版」外觀（有專屬美術的類型才換圖）
    const isBonus = connected.length > required
    if (isBonus && PREMIUM_PIECES.has(mergedType)) {
      premiumCells.add(row * GRID_SIZE + col)
    } else {
      premiumCells.delete(row * GRID_SIZE + col)
    }
    const bonus = isBonus ? 2 : 1
    score.value += PIECES[mergedType].score * bonus
    coins.value += PIECES[mergedType].coins ?? 0  // 寶箱等有金幣獎勵的物件
    mergeChain++

    processMerges(g, row, col)
  }

  function moveBears(g, placedRow = -1, placedCol = -1) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]

    const inBoard = (r, c) =>
      r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !(r === 0 && c === 0)

    // ── 移動階段：所有熊先移動完，困住判定留到之後 ─────────────────
    const bears = []
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (g[r][c] === 'bear' || g[r][c] === 'ninja_bear') bears.push([r, c, g[r][c]])

    bears.sort(() => Math.random() - 0.5)

    for (const [r, c, bearType] of bears) {
      if (g[r][c] !== bearType) continue
      if (r === placedRow && c === placedCol) continue  // 剛放置的熊本回合不動

      if (bearType === 'ninja_bear') {
        // 原版行為：每回合瞬移到棋盤任意空格；無空格時留在原地（交由下方困住判定）
        const empties = []
        for (let nr = 0; nr < GRID_SIZE; nr++)
          for (let nc = 0; nc < GRID_SIZE; nc++)
            if (g[nr][nc] === null && !(nr === 0 && nc === 0)) empties.push([nr, nc])
        if (empties.length > 0) {
          const [nr, nc] = empties[Math.floor(Math.random() * empties.length)]
          g[nr][nc] = 'ninja_bear'
          g[r][c] = null
        }
        continue
      }

      // 普通熊：往隨機相鄰空格走一步（走不了就原地不動）
      const shuffledDirs = [...dirs].sort(() => Math.random() - 0.5)
      for (const [dr, dc] of shuffledDirs) {
        const nr = r + dr, nc = c + dc
        if (inBoard(nr, nc) && g[nr][nc] === null) {
          g[nr][nc] = 'bear'
          g[r][c] = null
          break
        }
      }
    }

    // ── 困住判定（原版規則：以「連通熊群」為單位）───────────────────
    // 熊群＝相鄰普通熊的集合。整個群的周圍完全沒有空格才算困住，全體同時變墓碑；
    // 只要群裡任何一隻熊旁邊還有空格，整群都不算困住（會繼續在空地裡遊蕩）。
    const visited = new Set()
    const trappedCells = []
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (g[r][c] !== 'bear' || visited.has(r * GRID_SIZE + c)) continue
        const group = floodFill(g, r, c, 'bear')
        for (const [gr, gc] of group) visited.add(gr * GRID_SIZE + gc)
        const hasEscape = group.some(([gr, gc]) =>
          dirs.some(([dr, dc]) => inBoard(gr + dr, gc + dc) && g[gr + dr][gc + dc] === null)
        )
        if (!hasEscape) trappedCells.push(...group)
      }
    }

    // 忍者熊只有全盤無空格（瞬移失敗）時才會死
    const boardFull = !g.some((row, r) =>
      row.some((cell, c) => cell === null && !(r === 0 && c === 0))
    )
    if (boardFull) {
      for (let r = 0; r < GRID_SIZE; r++)
        for (let c = 0; c < GRID_SIZE; c++)
          if (g[r][c] === 'ninja_bear') trappedCells.push([r, c])
    }

    // ── 被困的熊：全部「同時」轉墓碑後才觸發合成 ──────────────────
    // 1. 同時轉換讓一次困住 4+ 隻熊能形成 4+ 墓碑合成（享受 bonus），與原版一致
    // 2. 合成起點以玩家剛放置的格子優先，讓 church 出現在放置處（與一般合成行為一致）
    if (trappedCells.length > 0) {
      for (const [r, c] of trappedCells) g[r][c] = 'tombstone'
      trappedCells.sort((a, b) => {
        const pa = (a[0] === placedRow && a[1] === placedCol) ? 0 : 1
        const pb = (b[0] === placedRow && b[1] === placedCol) ? 0 : 1
        return pa - pb
      })
      for (const [r, c] of trappedCells) {
        if (g[r][c] === 'tombstone') processMerges(g, r, c)
      }
    }
  }

  function hasEmptyCell() {
    // 排除 (0,0) 盤子格，它永遠是 null 但不是可放置的格子
    return grid.some((row, r) =>
      row.some((cell, c) => cell === null && !(r === 0 && c === 0))
    )
  }

  const emptyCount = computed(() =>
    grid.reduce((n, row) => n + row.filter(c => c === null).length, 0)
  )

  // ── 手牌智慧停放（原版行為）────────────────────────────────────
  // 手上的牌自動停放在棋盤上：優先停在「放這裡就能完成合成」的空格
  // （提示玩家合成機會），否則停在上一步放置位置附近的空格。
  // 回傳 { cell: 格子index|null, merge: 是否為合成提示點 }

  // 合成潛力計分：把 piece 放在 (row,col) 時，四周同類連通群的聯集大小
  // （2 = 放下就合成；1 = 停在同伴旁邊；0 = 沒有同類）
  // crystal 取所有相鄰可合成類型中的最大值
  function mergePotential(row, col, piece) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    let types
    if (piece === 'crystal') {
      const set = new Set()
      for (const [dr, dc] of dirs) {
        const nr = row + dr, nc = col + dc
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue
        const t = grid[nr][nc]
        if (t && MERGE_INTO[t]) set.add(t)
      }
      types = [...set]
    } else {
      if (!MERGE_INTO[piece]) return 0  // 熊/bot 等不可合成
      types = [piece]
    }

    let best = 0
    for (const t of types) {
      const cells = new Set()
      for (const [dr, dc] of dirs) {
        const nr = row + dr, nc = col + dc
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue
        if (grid[nr][nc] !== t) continue
        for (const [r, c] of floodFill(grid, nr, nc, t)) cells.add(r * GRID_SIZE + c)
      }
      if (cells.size > best) best = cells.size
    }
    return best
  }

  const parked = computed(() => {
    if (gameOver.value || !currentPiece.value) return { cell: null, merge: false }

    const empties = []
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (grid[r][c] === null && !(r === 0 && c === 0)) empties.push([r, c])
    if (empties.length === 0) return { cell: null, merge: false }

    // 參考點：上一步放置的格子；開局用棋盤中心
    const refR = lastPlaced.value !== null ? Math.floor(lastPlaced.value / GRID_SIZE) : 2.5
    const refC = lastPlaced.value !== null ? lastPlaced.value % GRID_SIZE : 2.5

    // 停放優先序：距離優先、潛力其次——
    // 1. 只在「離上一步最近」的空格圈裡選（通常是周圍一步），絕不跳遠
    // 2. 同距離的候選中，挑合成潛力最高的（沒有合成候選也沒關係）
    const dist = ([r, c]) => Math.abs(r - refR) + Math.abs(c - refC)
    let minDist = Infinity
    for (const cell of empties) {
      const d = dist(cell)
      if (d < minDist) minDist = d
    }
    const ring = empties.filter(cell => dist(cell) === minDist)

    let best = ring[0]
    let bestScore = -1
    for (const [r, c] of ring) {
      const score = mergePotential(r, c, currentPiece.value)
      if (score > bestScore) {
        bestScore = score
        best = [r, c]
      }
    }
    return {
      cell: best[0] * GRID_SIZE + best[1],
      merge: bestScore >= 2,   // 放下就會合成 → 跳動提示
    }
  })

  const goalPercent = computed(() =>
    Math.min(100, Math.floor((score.value / GOAL_SCORE) * 100))
  )

  // ── 商店商品定義（原版庫存制）───────────────────────────────────────
  // price = 單價（一次購買 1 個）；stock = 每局庫存上限（store.png 上的 ×N），
  // null = 不限購（步數 / Undo）。庫存不補貨，開新局才重置。
  const STORE_ITEMS = [
    { id: 'turns',   label: '200 Turns',    piece: null,      price:  950, stock: null, qty: 200, effect: 'turns'  },
    { id: 'crystal', label: 'Crystal',      piece: 'crystal', price: 1500, stock: 4,    effect: 'pieces' },
    { id: 'bot',     label: 'Imperial Bot', piece: 'bot',     price: 1000, stock: 4,    effect: 'pieces' },
    { id: 'tree',    label: 'Tree',         piece: 'tree',    price:  400, stock: 7,    effect: 'pieces' },
    { id: 'bush',    label: 'Bush',         piece: 'bush',    price:  150, stock: 7,    effect: 'pieces' },
    { id: 'grass',   label: 'Grass',        piece: 'grass',   price:   50, stock: 7,    effect: 'pieces' },
    { id: 'undo',    label: 'Undo',         piece: null,      price:   75, stock: null, effect: 'undo'   },
  ]

  // 各商品本局剩餘庫存（id → 剩餘數；不限購商品不在表內）
  const storeStock = reactive({})
  function resetStoreStock() {
    for (const item of STORE_ITEMS) {
      if (item.stock !== null) storeStock[item.id] = item.stock
    }
  }

  function buyItem(item) {
    if (gameOver.value) return false
    if (coins.value < item.price) return false
    if (item.stock !== null && storeStock[item.id] <= 0) return false  // 本局庫存售完
    if (item.effect === 'undo' && !undoState) return false  // 沒有可悔棋的步
    coins.value -= item.price
    if (item.stock !== null) storeStock[item.id]--
    if (item.effect === 'turns') {
      turnsLeft.value += item.qty
    } else if (item.effect === 'pieces') {
      // 一次購買 1 個，立刻上手：原手牌與 next 退回佇列（排在購買物件之後），不會消失
      storeQueue.value = [item.piece, currentPiece.value, nextPiece.value, ...storeQueue.value]
      currentPiece.value = storeQueue.value.shift()
      nextPiece.value = storeQueue.value.shift()
    } else if (item.effect === 'undo') {
      // 還原上一步放置前的狀態（coins 不還原，避免寶箱金幣重複領取）
      for (let r = 0; r < GRID_SIZE; r++)
        for (let c = 0; c < GRID_SIZE; c++)
          if (grid[r][c] !== undoState.grid[r][c]) grid[r][c] = undoState.grid[r][c]
      score.value = undoState.score
      turnsLeft.value = undoState.turnsLeft
      currentPiece.value = undoState.currentPiece
      nextPiece.value = undoState.nextPiece
      storedPiece.value = undoState.storedPiece
      mergedCells.clear()
      premiumCells.clear()
      for (const idx of undoState.premium) premiumCells.add(idx)
      undoState = null
      canUndo.value = false
      lastPlaced.value = null
    }
    return true
  }

  // ── 持久化：金幣與最高分寫入 localStorage ───────────────────────────
  watch(coins, v => localStorage.setItem(LS_COINS, String(v)))
  watch(score, v => {
    if (v > bestScore.value) {
      bestScore.value = v
      localStorage.setItem(LS_BEST, String(v))
    }
  })

  init()

  return {
    GRID_SIZE, GOAL_SCORE, PIECES, TOTAL_TURNS, STORE_ITEMS,
    grid, score, bestScore, highScores, coins, turnsLeft, turnsRegenSecs, turnsRegenProgress, goalReached, goalPercent,
    currentPiece, nextPiece, storedPiece, gameOver, emptyCount, canUndo, lastPlaced, parked, noTurns,
    mergedCells, premiumCells, settlement, storeQueue, storeStock,
    placePiece, swapPiece, buyItem, restart: init,
  }
}
