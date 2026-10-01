# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 📋 **與其他三個 Capacitor App（JournalApp／myStock／myLife）的架構對照見
> [`d:\ClaudeLab\APP_ARCHITECTURE.md`](../APP_ARCHITECTURE.md)。**
> 本專案是四個裡唯一的**滿版遊戲**（`SystemBars: hidden`），
> 因此 `viewport-fit=cover` 的處理與 myStock／myLife **完全相反**——
> 改 `index.html` 的 viewport 設定前務必先讀那份。

## 開發指令

```bash
# 啟動開發伺服器（port 5177）
npm run dev

# 建置正式版
npm run build

# 預覽 build 結果
npm run preview

# 建置 Android APK（= build-apk.cmd，見下方「Android APK 打包」）
npm run apk
```

## 專案背景

仿製手機遊戲 **Triple Town** 的 Web 版。`src/picts/` 只放程式實際 import 的遊戲素材 PNG；原版參考截圖與 PSD 美術源檔放在 `art-reference/`（不參與建置）。目標是外觀盡量貼近原版，打包為 Android APK（Capacitor，✅）與 Windows EXE（Electron NSIS 安裝檔，✅）。

## Android APK 打包（Capacitor）

**不需要 Android Studio**。建置工具是可攜版，放在 `d:\ClaudeLab\android-dev\`：

| 工具 | 路徑 |
|------|------|
| JDK 21（Temurin zip 版） | `d:\ClaudeLab\android-dev\jdk-21.0.11+10` |
| Android SDK（cmdline-tools 安裝） | `d:\ClaudeLab\android-dev\sdk`（platforms;android-36、build-tools;36.0.0） |

**相關檔案：**
- `capacitor.config.json` — appId `tw.hedy.tripletown`、webDir `dist`
- `android/` — Capacitor 產生的原生專案（`npx cap add android` 產物）
- `android/local.properties` — 指向可攜版 SDK 位置（勿提交版控）
- `build-apk.cmd` — 一鍵建置：設 JAVA_HOME → `npm run build` → `npx cap sync android` → `gradlew assembleDebug` → 複製 APK 到 `release\`

**重新產 APK：** 改完程式後執行 `build-apk.cmd`（或 `npm run apk`），輸出：
- `android/app/build/outputs/apk/debug/app-debug.apk`
- 複製為 `release\TripleTownCL-v1.0-debug.apk`（約 6.4MB，直接傳給測試者安裝；與 Windows EXE 產出同目錄）

**注意：** debug APK 用 debug keystore 簽章，只供試玩分發；要上 Google Play 需另做 release 簽章（keystore + `assembleRelease`）。

## Windows EXE 打包（Electron）

```bash
npm run exe        # vite build → electron-builder --win，產出 NSIS 安裝檔
npm run electron   # 本機直接跑 Electron 視窗（開發測試用）
```

**相關檔案：**
- `electron/main.cjs` — Electron 主程序（載入 `dist/index.html`；因 package.json 有 `"type": "module"`，必須用 .cjs）
- `package.json` 的 `"build"` 欄位 — electron-builder 設定（NSIS oneClick、per-user 安裝）
- `build/icon.png` — 256×256 APP 圖示（由 `art-reference/0.APP.png` 放大而來）
- `vite.config.js` 的 `base: './'` — **必要**：Electron 以 `file://` 載入，資源路徑必須是相對路徑（Capacitor 與 Web 部署不受影響）

**產出：** `release/TripleTownCL-Setup-1.0.0.exe`（約 105MB，NSIS 安裝檔，雙擊安裝後自動建立桌面/開始選單捷徑）。`release/` 目錄勿提交版控。

**開發環境陷阱：** 在 VSCode / Claude Code 的終端機跑 `electron .` 會因繼承 `ELECTRON_RUN_AS_NODE=1` 而立刻閃退（`app` 為 undefined）。先執行 `Remove-Item Env:ELECTRON_RUN_AS_NODE` 再啟動。打包版不受影響（electron-builder 預設關閉 RunAsNode fuse，同時也會擋掉 `--remote-debugging-port` 等偵錯參數）。

## 專案文件（docs/，依 AISDLC 範本撰寫）

- `docs/srd/SRD_System_Architecture.md` — 系統架構（模組關係、placePiece 序列圖、資料模型、三平台建置管線）
- `docs/Developer_Guideline.md` — 開發指引 SOP（環境設置、編碼規範、常見修改情境對照表、手動測試清單）
- `docs/Operations_Guide.md` — 維運手冊 SOP（APK/EXE 發佈步驟、版本號同步、故障排除）

架構或流程改變時，需同步更新上述文件與本檔。

## 架構

### 資料流

```
App.vue
  └─ useGame()          ← 唯一的遊戲狀態來源（Vue Composable）
       └─ pieces.js     ← 靜態常數，不含狀態
       └─ sfx.js        ← WebAudio 合成音效（放置/合成/金幣），無外部音檔
  └─ GameBoard.vue      ← 接收 grid / currentPiece，emit 'place'
                          點擊判定集中在此：pointer 綁 .board，用座標算 row/col
                          並允許往鄰近空格吸附（不必精準點到格子中心）
       └─ GameCell.vue  ← 單格渲染（純呈現，不綁事件）
            └─ PieceSVG.vue  ← 純 SVG，無狀態，根據 type prop 渲染
       └─ useVillagers()     ← 環境小人（純裝飾）：依場上建築生滅，在棋盤下方綠地帶散步
            └─ VillagerSVG.vue ← 小人 SVG（平民/神父/國王）
```

### `useGame.js` 核心邏輯

每次 `placePiece(row, col)` 的執行順序：
1. 複製 grid 為 `g`（不直接操作 reactive grid）
2. `processMerges(g, row, col)` — BFS flood-fill 找連通同類物件，達數量則合成（遞迴處理連鎖）
3. `moveBears(g)` — 每步後所有熊移動一格；被包圍的熊變墓碑並觸發合成
4. 逐格比對 `g` 與 `grid`，只更新有變化的格子（避免全盤動畫觸發）

### `pieces.js` 資料結構

- `MERGE_INTO`：合成結果對照表（key→value 即 A 合成出 B）
- `MERGE_COUNT`：例外合成數量，預設 3（原版 Standard Map 無例外，目前為空表）
- `SPAWN_POOL`：玩家取得物件的加權機率（不含石頭，石頭僅由 crystal 合成失敗產生）

### 觸控手感（手機實測調校）

- 點擊判定在 `GameBoard.vue`：按下時記錄座標與 `pointerId`，放開才落子（位移超過 0.75 格視為滑開取消）
- **邊界吸附**：算出的格子若不可放置，會找周圍最近的**空格**（距離 ≤ `SNAP_RATIO` = 0.35 格）補救，解決「點在兩格交界卻放不上去」
- 吸附刻意只吸空格；機器人（摧毀）與寶箱（開箱）要求精準點擊，避免誤觸造成無法挽回的一步
- 按下時 `setPointerCapture()` + `lostpointercapture` 保險：滑鼠沒有觸控的隱含捕獲，按在棋盤上拖到棋盤外放開會讓 `pointerId` 卡住、棋盤點不動（EXE 版才會遇到）
- `.board` / `.cell` / `.piece-plate` 使用 `touch-action: none`，**不可改回 `manipulation`**——後者保留捲動判定，Android WebView 會把觸控判成捲動並送出 `pointercancel`，`pointerup` 不再送達，玩家看到的就是「點了沒反應」

### 視覺設計原則（對照原版截圖）

- 棋盤：`gap: 0`、`border-radius: 22px; overflow: hidden`，整片土地呈圓角有機形狀
- 格子：沙棕色 `#b0956a`，`border-radius: 0`，無縫拼接
- 物件：`piece-wrap` 78% 大小，CSS `filter: drop-shadow(0 0 2.5px white)` 模擬白色外框
- 物件 SVG：`viewBox="0 0 100 100"`，物件形狀集中在 viewBox 中下方，讓棕色底面露出

### 參考資料
- https://char.tw/blog/post/36781128

### 待開發功能

- 物件美術微調（`art-reference/` 有原版截圖與 PSD 源檔可參考）
- APK 正式版簽章（release keystore，上架 Google Play 才需要）
- Android APP 圖示與啟動畫面（目前是 Capacitor 預設圖示；Windows 版已用 `build/icon.png`）

註：原版 Standard Map 為完整 6×6 矩形，不需做有機外形。
