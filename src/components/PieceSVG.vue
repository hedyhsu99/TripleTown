<template>
  <img v-if="imgSrc" :src="imgSrc" :alt="type" class="piece-img" />
  <svg v-else viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">

    <!-- ══ 浮空城堡 Floating Castle ══ -->
    <template v-if="type === 'floating_castle'">
      <ellipse cx="50" cy="88" rx="46" ry="13" fill="white" opacity="0.9"/>
      <circle cx="24" cy="82" r="18" fill="white" opacity="0.9"/>
      <circle cx="76" cy="82" r="18" fill="white" opacity="0.9"/>
      <circle cx="50" cy="76" r="22" fill="white" opacity="0.95"/>
      <rect x="32" y="28" width="36" height="50" fill="#9EAAB8"/>
      <rect x="34" y="30" width="10" height="46" fill="#B8C4D0" opacity="0.4"/>
      <rect x="12" y="36" width="24" height="42" fill="#8898A8"/>
      <rect x="64" y="36" width="24" height="42" fill="#8898A8"/>
      <rect x="30" y="20" width="9"  height="10" fill="#9EAAB8"/>
      <rect x="44" y="20" width="9"  height="10" fill="#9EAAB8"/>
      <rect x="58" y="20" width="9"  height="10" fill="#9EAAB8"/>
      <rect x="38" y="54" width="24" height="24" fill="#1A237E" rx="10" ry="3"/>
      <line x1="50" y1="2" x2="50" y2="20" stroke="#aaa" stroke-width="2.5"/>
      <polygon points="50,3 64,10 50,17" fill="#EF5350"/>
    </template>

    <!-- ══ 三重城堡 Triple Castle ══ -->
    <template v-else-if="type === 'triple_castle'">
      <ellipse cx="50" cy="93" rx="44" ry="6" fill="#3a3a3a" opacity="0.25"/>
      <rect x="12" y="46" width="76" height="48" fill="#F0F4F8" rx="3"/>
      <rect x="6"  y="36" width="26" height="58" fill="#E8EEF4"/>
      <rect x="68" y="36" width="26" height="58" fill="#E8EEF4"/>
      <polygon points="4,38 19,8 34,38"  fill="#1565C0"/>
      <polygon points="4,38 13,38 19,8"  fill="#1E88E5" opacity="0.4"/>
      <polygon points="66,38 81,8 96,38" fill="#1565C0"/>
      <polygon points="66,38 75,38 81,8" fill="#1E88E5" opacity="0.4"/>
      <rect x="38" y="16" width="24" height="32" fill="#D8E4EE"/>
      <polygon points="32,18 50,0 68,18"  fill="#1565C0"/>
      <polygon points="32,18 42,18 50,0" fill="#1E88E5" opacity="0.4"/>
      <circle cx="50" cy="56" r="13" fill="#FFD54F" opacity="0.85"/>
      <circle cx="50" cy="56" r="7"  fill="#F57F17"/>
      <rect x="40" y="68" width="20" height="26" fill="#2E0A00" rx="10" ry="3"/>
    </template>


    <!-- ══ Imperial Bot ══ -->
    <template v-else-if="type === 'bot'">
      <ellipse cx="50" cy="92" rx="28" ry="7" fill="#333" opacity="0.25"/>
      <!-- 身體 -->
      <rect x="26" y="50" width="48" height="38" fill="#4FC3F7" rx="6"/>
      <!-- 胸部面板 -->
      <rect x="34" y="57" width="32" height="22" fill="#29B6F6" rx="4"/>
      <circle cx="44" cy="68" r="5" fill="#EF5350"/>
      <circle cx="56" cy="68" r="5" fill="#FDD835"/>
      <!-- 頭 -->
      <rect x="30" y="18" width="40" height="34" fill="#29B6F6" rx="7"/>
      <!-- 天線 -->
      <line x1="50" y1="8" x2="50" y2="18" stroke="#90CAF9" stroke-width="3"/>
      <circle cx="50" cy="6" r="5" fill="#FDD835"/>
      <!-- 眼睛 -->
      <rect x="35" y="26" width="12" height="9" fill="white" rx="2"/>
      <rect x="53" y="26" width="12" height="9" fill="white" rx="2"/>
      <rect x="38" y="28" width="6" height="5" fill="#1565C0" rx="1"/>
      <rect x="56" y="28" width="6" height="5" fill="#1565C0" rx="1"/>
      <!-- 嘴 -->
      <rect x="38" y="40" width="24" height="5" fill="#1565C0" rx="2"/>
      <!-- 手臂 -->
      <rect x="10" y="52" width="16" height="10" fill="#4FC3F7" rx="5"/>
      <rect x="74" y="52" width="16" height="10" fill="#4FC3F7" rx="5"/>
      <!-- 腳 -->
      <rect x="30" y="88" width="14" height="8" fill="#29B6F6" rx="3"/>
      <rect x="56" y="88" width="14" height="8" fill="#29B6F6" rx="3"/>
    </template>

    <!-- ══ 大寶箱 Large Treasure ══ -->
    <template v-else-if="type === 'large_treasure'">
      <ellipse cx="50" cy="93" rx="40" ry="7" fill="#3a2010" opacity="0.3"/>
      <rect x="7"  y="52" width="86" height="40" fill="#7A4A00" rx="6"/>
      <rect x="9"  y="54" width="16" height="36" fill="#9A5C10" rx="4" opacity="0.4"/>
      <rect x="5"  y="48" width="90" height="9" fill="#E8B820" rx="4"/>
      <rect x="5"  y="84" width="90" height="9" fill="#E8B820" rx="4"/>
      <rect x="7"  y="22" width="86" height="30" fill="#8B5800" rx="6"/>
      <ellipse cx="50" cy="22" rx="43" ry="9" fill="#9A6800"/>
      <rect x="5"  y="18" width="90" height="9" fill="#E8B820" rx="4"/>
      <rect x="38" y="46" width="24" height="16" fill="#E8B820" rx="5"/>
      <ellipse cx="50" cy="46" rx="9" ry="5.5" fill="#E8B820"/>
      <ellipse cx="50" cy="44" rx="5" ry="4" fill="#7A4A00"/>
      <circle cx="22" cy="40" r="5" fill="#FFD700" opacity="0.85"/>
      <circle cx="78" cy="40" r="5" fill="#FFD700" opacity="0.85"/>
      <circle cx="36" cy="16" r="5" fill="#FFD700" opacity="0.85"/>
      <circle cx="64" cy="16" r="5" fill="#FFD700" opacity="0.85"/>
    </template>

  </svg>
</template>

<script setup>
import { computed } from 'vue'
import grassImg      from '../picts/1.grass.png'
import bushImg       from '../picts/2.bush.png'
import bushPlusImg   from '../picts/2.bush+.png'
import treeImg       from '../picts/3.tree.png'
import treePlusImg   from '../picts/3.tree+.png'
import bearImg       from '../picts/4.bear.png'
import hutImg        from '../picts/5.hut.png'
import hutPlusImg    from '../picts/5.hut+.png'
import houseImg      from '../picts/6.house.png'
import rockImg       from '../picts/7.rock.png'
import tombstoneImg  from '../picts/8.tombstone.png'
import crystalImg    from '../picts/9.crystal.png'
import churchImg     from '../picts/10.church.png'
import cathedralImg  from '../picts/11.cathedral.png'
import ninjaBearImg  from '../picts/12.ninja_bear.png'
import botImg        from '../picts/19.imperial_bot.png'
import mansionImg        from '../picts/13.mansion.png'
import castleImg         from '../picts/14.castle.png'
import castlePlusImg     from '../picts/14.castle+.png'
import mountainImg       from '../picts/16.mountain.png'
import floatingCastleImg from '../picts/17.floating_castle.png'
import treasureImg       from '../picts/18.treasure.png'

const PIECE_IMAGES = {
  grass:           grassImg,
  bush:            bushImg,
  tree:            treeImg,
  bear:            bearImg,
  hut:             hutImg,
  house:           houseImg,
  rock:            rockImg,
  tombstone:       tombstoneImg,
  crystal:         crystalImg,
  church:          churchImg,
  cathedral:       cathedralImg,
  ninja_bear:      ninjaBearImg,
  mansion:         mansionImg,
  castle:          castleImg,
  mountain:        mountainImg,
  floating_castle: floatingCastleImg,
  treasure:        treasureImg,
  bot:             botImg,
}

// 高級版（4+ 合成的閃亮版）圖檔
const PREMIUM_IMAGES = {
  bush:   bushPlusImg,
  tree:   treePlusImg,
  hut:    hutPlusImg,
  castle: castlePlusImg,
}

const props = defineProps({
  type: String,
  premium: Boolean,   // 高級版：4 個以上一次合成產生的閃亮物件
})
const imgSrc = computed(() =>
  (props.premium && PREMIUM_IMAGES[props.type]) || PIECE_IMAGES[props.type] || null
)
</script>

<style scoped>
svg { width: 100%; height: 100%; display: block; }
.piece-img { width: 100%; height: 100%; object-fit: contain; display: block; }
</style>
