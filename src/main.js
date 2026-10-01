import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import App from './App.vue'

// ── APP 版全螢幕（JS 層保險）───────────────────────────────────
// 原生層 MainActivity 已做沉浸模式，但部分機型會被系統還原；
// 這裡用官方 StatusBar 外掛在 WebView 載入後再隱藏一次。
if (Capacitor.isNativePlatform()) {
  import('@capacitor/status-bar').then(({ StatusBar }) => {
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
    StatusBar.hide().catch(() => {})
    // App 從背景切回時再套用一次
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) StatusBar.hide().catch(() => {})
    })
  }).catch(() => {})
}

// ── 全域錯誤攔截（除錯用）───────────────────────────────────────
// APP 版曾發生畫面凍結且無法互動的問題；壓力測試證實遊戲邏輯無誤，
// 因此攔截 runtime 錯誤直接顯示在畫面上，方便測試者截圖回報。
function showCrashOverlay(message) {
  try {
    let box = document.getElementById('crash-overlay')
    if (!box) {
      box = document.createElement('div')
      box.id = 'crash-overlay'
      box.style.cssText =
        'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;' +
        'background:rgba(120,0,0,0.92);color:#fff;font-size:11px;line-height:1.4;' +
        'padding:10px;border-radius:8px;word-break:break-all;white-space:pre-wrap;' +
        'max-height:40vh;overflow:auto;font-family:monospace;'
      box.addEventListener('click', () => box.remove())
      document.body.appendChild(box)
    }
    box.textContent = '⚠ App Error（點擊關閉）\n' + message
  } catch { /* overlay 失敗就算了，不影響遊戲 */ }
}

window.addEventListener('error', (e) => {
  showCrashOverlay(`${e.message}\n${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack ?? ''}`.slice(0, 1500))
})
window.addEventListener('unhandledrejection', (e) => {
  showCrashOverlay(`Unhandled Promise Rejection:\n${e.reason?.stack ?? e.reason}`.slice(0, 1500))
})

// 啟動時檢查上次是否凍結在遊戲邏輯中途（useGame 的 trace 標記）
try {
  const trace = localStorage.getItem('tt_trace')
  if (trace && trace.startsWith('place-start')) {
    showCrashOverlay('上次遊戲疑似凍結在邏輯執行中：\n' + trace + '\n（請截圖回報）')
    localStorage.setItem('tt_trace', 'idle-recovered')
  }
} catch { /* ignore */ }

const app = createApp(App)
// Vue 元件內的錯誤也導到同一個 overlay
app.config.errorHandler = (err, _instance, info) => {
  showCrashOverlay(`Vue error (${info}):\n${err?.stack ?? err}`.slice(0, 1500))
}
app.mount('#app')
