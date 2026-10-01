import { ref, watch, onUnmounted } from 'vue'

// ── 環境小人（純裝飾）─────────────────────────────────────────────
// 原版小人只在綠草地上活動，不會站在棋盤的沙色走道格上，
// 因此小人活動範圍是「棋盤下方的綠地帶」，在那裡散步、跳動。
// 數量跟著場上建築增減：蓋出對應建築才會出現對應小人。

// 小人種類 → 來源建築
const KIND_SOURCE = {
  royal:    ['castle', 'floating_castle', 'triple_castle'],
  priest:   ['church', 'cathedral'],
  villager: ['house', 'mansion'],
}
const KIND_MAX  = { royal: 1, priest: 2, villager: 2 }  // 各種類上限
const MAX_TOTAL = 4       // 全場小人總數上限，避免太吵
const TICK_MS   = 1600    // 行動間隔（毫秒）

export function useVillagers(grid, GRID_SIZE) {
  const villagers = ref([])
  let nextId = 1

  function countKind(kind) {
    let n = 0
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (KIND_SOURCE[kind].includes(grid[r][c])) n++
    return n
  }

  // 依場上建築同步小人數量（royal > priest > villager 優先佔名額）
  function sync() {
    let budget = MAX_TOTAL
    for (const kind of Object.keys(KIND_SOURCE)) {
      const desired = Math.min(countKind(kind), KIND_MAX[kind], budget)
      const cur = villagers.value.filter(v => v.kind === kind)

      // 建築變少 → 移除多出來的小人（淡出）
      for (const extra of cur.slice(desired)) {
        villagers.value = villagers.value.filter(v => v.id !== extra.id)
      }
      // 建築變多 → 補小人（淡入，隨機位置）
      for (let i = cur.length; i < desired; i++) {
        villagers.value.push({
          id: nextId++,
          kind,
          x: 6 + Math.random() * 86,   // 綠地帶內水平位置（%）
          y: Math.random() * 50,       // 綠地帶內垂直位置（%）
          bounce: (0.9 + Math.random() * 0.6).toFixed(2),  // 各自的跳動節奏（秒）
        })
      }
      budget -= desired
    }
  }

  // 定時散步：隨機發呆或往附近走一小段（CSS transition 讓移動平滑）
  function tick() {
    for (const v of villagers.value) {
      if (Math.random() < 0.4) continue  // 發呆（跳動動畫持續）
      v.x = Math.min(92, Math.max(4, v.x + (Math.random() * 26 - 13)))
      v.y = Math.min(50, Math.max(0, v.y + (Math.random() * 30 - 15)))
    }
  }

  // 棋盤變化（合成/摧毀建築）→ 重新同步小人數量
  watch(
    () => grid.flat().map(x => x ?? '.').join(''),
    sync,
    { immediate: true }
  )

  const timer = setInterval(tick, TICK_MS)
  onUnmounted(() => clearInterval(timer))

  return { villagers }
}
