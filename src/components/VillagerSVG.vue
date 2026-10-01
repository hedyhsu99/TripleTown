<template>
  <!-- 環境小人：Q 版比例（頭大身小、大眼睛、腮紅），三種身分對應不同建築 -->
  <svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">

    <!-- 地面陰影（共用） -->
    <ellipse cx="20" cy="47.5" rx="9" ry="2.4" fill="rgba(0,0,0,0.16)"/>

    <!-- 神父：深灰長袍 + 白領 + 灰髮圈 -->
    <g v-if="kind === 'priest'">
      <path d="M12 46 Q12 32 20 31 Q28 32 28 46 Q20 48.5 12 46 Z" fill="#4a4a56"/>
      <rect x="16" y="31" width="8" height="4.5" rx="2.2" fill="#f7f7f2"/>
      <circle cx="20" cy="18" r="13.5" fill="#f8d5ae"/>
      <!-- 灰髮：兩側髮圈（中間微禿，可愛老神父） -->
      <path d="M6.5 18 Q6.5 9 13 6.5 Q11 12 12.5 16 Q9 16 6.5 18 Z" fill="#b8b8c0"/>
      <path d="M33.5 18 Q33.5 9 27 6.5 Q29 12 27.5 16 Q31 16 33.5 18 Z" fill="#b8b8c0"/>
      <circle cx="15" cy="19.5" r="2.2" fill="#3a2a1a"/>
      <circle cx="25" cy="19.5" r="2.2" fill="#3a2a1a"/>
      <circle cx="15.8" cy="18.7" r="0.8" fill="#fff"/>
      <circle cx="25.8" cy="18.7" r="0.8" fill="#fff"/>
      <ellipse cx="10.5" cy="24" rx="2.4" ry="1.5" fill="#f5a8a0" opacity="0.75"/>
      <ellipse cx="29.5" cy="24" rx="2.4" ry="1.5" fill="#f5a8a0" opacity="0.75"/>
      <path d="M17.5 25 Q20 27.2 22.5 25" stroke="#c08050" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    </g>

    <!-- 國王：紅袍 + 金皇冠 + 白鬍子 -->
    <g v-else-if="kind === 'royal'">
      <path d="M12 46 Q12 32 20 31 Q28 32 28 46 Q20 48.5 12 46 Z" fill="#c23a3a"/>
      <path d="M16 31.5 L20 34.5 L24 31.5 L24 42 Q20 43.5 16 42 Z" fill="#96201f"/>
      <circle cx="20" cy="18" r="13.5" fill="#f8d5ae"/>
      <!-- 白鬍子 -->
      <path d="M13 24 Q20 33 27 24 Q26 29.5 20 30 Q14 29.5 13 24 Z" fill="#f2f0ea"/>
      <!-- 皇冠 -->
      <path d="M11 8.5 L14.5 2.5 L18 7 L20 1.5 L22 7 L25.5 2.5 L29 8.5 Q20 5.5 11 8.5 Z"
            fill="#f6c93c" stroke="#cf9410" stroke-width="0.9" stroke-linejoin="round"/>
      <circle cx="15" cy="19.5" r="2.2" fill="#3a2a1a"/>
      <circle cx="25" cy="19.5" r="2.2" fill="#3a2a1a"/>
      <circle cx="15.8" cy="18.7" r="0.8" fill="#fff"/>
      <circle cx="25.8" cy="18.7" r="0.8" fill="#fff"/>
      <ellipse cx="10.5" cy="23.5" rx="2.4" ry="1.5" fill="#f5a8a0" opacity="0.75"/>
      <ellipse cx="29.5" cy="23.5" rx="2.4" ry="1.5" fill="#f5a8a0" opacity="0.75"/>
      <path d="M17.8 25 Q20 26.8 22.2 25" stroke="#c08050" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    </g>

    <!-- 平民（預設）：藍衣 + 呆毛咖啡色頭髮 -->
    <g v-else>
      <path d="M12 46 Q12 32 20 31 Q28 32 28 46 Q20 48.5 12 46 Z" fill="#4d94db"/>
      <circle cx="20" cy="18" r="13.5" fill="#f8d5ae"/>
      <!-- 咖啡色瀏海 + 一根呆毛 -->
      <path d="M6.5 18 Q6.5 5.5 20 5.5 Q33.5 5.5 33.5 18 Q30 12.5 25 13.5 Q26.5 10.5 23.5 9 Q22 12 18 12.5 Q12 13 10.5 16 Q8.5 16.5 6.5 18 Z" fill="#7a5230"/>
      <path d="M20 5.5 Q19 2 22.5 1 Q21 3 22 5.5 Z" fill="#7a5230"/>
      <circle cx="15" cy="19.5" r="2.2" fill="#3a2a1a"/>
      <circle cx="25" cy="19.5" r="2.2" fill="#3a2a1a"/>
      <circle cx="15.8" cy="18.7" r="0.8" fill="#fff"/>
      <circle cx="25.8" cy="18.7" r="0.8" fill="#fff"/>
      <ellipse cx="10.5" cy="24" rx="2.4" ry="1.5" fill="#f5a8a0" opacity="0.75"/>
      <ellipse cx="29.5" cy="24" rx="2.4" ry="1.5" fill="#f5a8a0" opacity="0.75"/>
      <path d="M17.5 25 Q20 27.5 22.5 25" stroke="#c08050" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    </g>

  </svg>
</template>

<script setup>
defineProps({
  kind: String,  // 'villager' | 'priest' | 'royal'
})
</script>
