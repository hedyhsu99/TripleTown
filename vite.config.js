import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // 相對路徑：讓 Electron 以 file:// 載入 dist/index.html 也能找到資源
  // （Capacitor 的 https://localhost 與 Web 部署用相對路徑同樣正常）
  base: './',
  server: {
    // 明確指定 port，不用預設的 5173。
    // ⚠️ localStorage 綁在 origin（含 port）上——多個專案都用 5173 時會共用同一份儲存。
    // 本專案只存 tt_trace（當機追蹤）與 myStock 的 mystock_* 前綴不衝突，所以沒出過事，
    // 但那是命名巧合而非設計。myStock 留在 5173（使用者的帳務資料在那裡，不能搬），
    // 本專案改用 5177。各 App 的 port 配置見 d:\ClaudeLab\APP_ARCHITECTURE.md
    port: 5177,
    watch: {
      // 排除打包輸出目錄：dev server 開著時若監看 release/，
      // 會鎖住 electron-builder 解壓的檔案，導致 EPERM rename 失敗
      ignored: ['**/release/**', '**/android/**', '**/dist/**', '**/electron/**'],
    },
  },
})
