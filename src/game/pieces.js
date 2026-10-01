// 物件定義：name=英文名稱（與手機版一致）、tier、score=合併得分
// placeScore=放置時的基本得分（原版每放一個物件就得分，僅手牌可能出現的物件需要）
// article: 'some' 用於不可數名詞（grass），其餘省略表示用 'a'
export const PIECES = {
  // ── 建築合成鏈（grass → triple castle）──────────────────────────
  grass:          { name: 'grass',          article: 'some', tier: 1,  score: 20,    placeScore: 5   },
  bush:           { name: 'bush',                            tier: 2,  score: 60,    placeScore: 20  },
  tree:           { name: 'tree',                            tier: 3,  score: 200,   placeScore: 100 },
  hut:            { name: 'hut',                             tier: 4,  score: 600,   placeScore: 500 },
  house:          { name: 'house',                           tier: 5,  score: 2000   },
  mansion:        { name: 'mansion',                         tier: 6,  score: 6000   },
  castle:         { name: 'castle',                          tier: 7,  score: 20000  },
  floating_castle:{ name: 'floating castle',                 tier: 8,  score: 60000  },
  triple_castle:  { name: 'triple castle',                   tier: 9,  score: 300000 },

  // ── 墓碑合成鏈（tombstone → large treasure）─────────────────────
  tombstone:      { name: 'tombstone',                       tier: 0,  score: 0      },
  church:         { name: 'church',                          tier: 0,  score: 10000  },
  cathedral:      { name: 'cathedral',                       tier: 0,  score: 30000  },
  treasure:       { name: 'treasure',                        tier: 0,  score: 0,     coins: 5000, isOpenable: true },
  large_treasure: { name: 'large treasure',                  tier: 0,  score: 10000  },

  // ── 石頭合成鏈 ───────────────────────────────────────────────────
  rock:           { name: 'rock',                            tier: 0,  score: 0,     placeScore: 10  },
  mountain:       { name: 'mountain',                        tier: 0,  score: 5000   },

  // ── 敵人 ─────────────────────────────────────────────────────────
  bear:           { name: 'bear',                            tier: 0,  score: 0,     placeScore: 40,  isEnemy: true },
  ninja_bear:     { name: 'ninja bear',                      tier: 0,  score: 0,     placeScore: 100, isEnemy: true, isNinja: true },

  // ── 特殊物件 ─────────────────────────────────────────────────────
  crystal:        { name: 'crystal',                         tier: 0,  score: 500,   placeScore: 20, isSpecial: true },
  bot:            { name: 'Imperial Bot',                    tier: 0,  score: 0,     placeScore: 25, isBot: true },
}

// 合併結果對照表（達到所需數量後變成的物件）
export const MERGE_INTO = {
  // 建築鏈
  grass:          'bush',
  bush:           'tree',
  tree:           'hut',
  hut:            'house',
  house:          'mansion',
  mansion:        'castle',
  castle:         'floating_castle',
  floating_castle:'triple_castle',

  // 墓碑鏈
  tombstone:      'church',
  church:         'cathedral',
  cathedral:      'treasure',
  // treasure 只能點擊開啟取金幣，Standard Map 不合成 large_treasure

  // 石頭鏈（3 顆大石頭 → 寶箱，可透過 crystal 觸發）
  rock:           'mountain',
  mountain:       'treasure',

  // 熊不會互相合成：被困住變墓碑，再由墓碑合成 church
}

// 特殊合成數量（預設為 3，此表列出例外；原版 Standard Map 無例外）
export const MERGE_COUNT = {}

// 高級版物件（4+ 合成的閃亮版）：目前有專屬美術的類型
// 例：4 顆草一次合成 → bush 用 bush+ 圖；4 個 bush → tree 用 tree+ 圖
// castle 為高階鏈的第一個高級版（4 座 mansion 一次合成 → castle+ 圖）
export const PREMIUM_PIECES = new Set(['bush', 'tree', 'hut', 'castle'])

// 玩家放置物件的出現機率池
// 原版 Standard Map 規則：熊/忍者熊/bot 也是抽牌池的一員，加權隨機出現（不可預測）
// 石頭不在池中：僅由 crystal 合成失敗產生
// 平衡重點：忍者熊無法被困住、會永久累積，清除手段（bot）的
// 出現頻率必須明顯高於忍者熊，否則場上忍者熊會越積越多
export const SPAWN_POOL = [
  { type: 'grass',      weight: 44 },
  { type: 'bush',       weight: 20 },
  { type: 'bear',       weight: 13 },
  { type: 'tree',       weight: 10 },
  { type: 'hut',        weight: 5  },
  { type: 'crystal',    weight: 4  },
  { type: 'bot',        weight: 3  },  // 平均每 33 張出一隻
  { type: 'ninja_bear', weight: 1  },  // 平均每 100 張出一隻
]

export function weightedRandom(pool) {
  const total = pool.reduce((sum, item) => sum + item.weight, 0)
  let rand = Math.random() * total
  for (const item of pool) {
    rand -= item.weight
    if (rand <= 0) return item.type
  }
  return pool[pool.length - 1].type
}
