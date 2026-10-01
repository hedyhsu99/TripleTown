# 維運指南 (Operations Guide) — Triple Town CL

*本文件依 AISDLC `Operations_Guide.md` 範本撰寫，作為建置、發佈與問題排除的標準作業程序（SOP）。*
*專案性質：單機遊戲（Web / Android APK / Windows EXE），無伺服器；範本中以「伺服器維運」為前提的章節標註「不適用」並改述對應事項。*

---

## 1. 部署程序

### 環境清單

| 環境 | 形式 | 產出 / 位置 |
|------|------|------------|
| 開發 | Vite dev server | `npm run dev` → http://localhost:5173 |
| Web | 靜態檔案 | `npm run build` → `dist/`（可放任何 web server） |
| Android | debug APK（試玩分發） | `release/TripleTownCL-v1.0-debug.apk`（約 6.4MB） |
| Windows | NSIS 安裝檔 | `release/TripleTownCL-Setup-1.0.0.exe`（約 105MB） |

### 部署步驟

#### Android APK（SOP）

```bash
npm run apk        # = build-apk.cmd
```

`build-apk.cmd` 依序執行：設 `JAVA_HOME`（可攜版 JDK 21）→ `npm run build` → `npx cap sync android` → `gradlew assembleDebug` → 複製 APK 到 `release\`。

發佈：把 `release/TripleTownCL-v1.0-debug.apk` 直接傳給測試者。手機端需允許「安裝未知來源應用程式」（debug 簽章，非商店安裝）。

#### Windows EXE（SOP）

```bash
npm run exe        # = vite build → electron-builder --win
```

發佈：把 `release/TripleTownCL-Setup-1.0.0.exe` 傳給使用者，雙擊安裝（oneClick、per-user，不需系統管理員），自動建立桌面/開始選單捷徑。

#### 版本號更新（發新版前必做）

版本號目前分散三處，需手動同步：

1. `package.json` → `"version"`（EXE 檔名 `${version}` 來源）
2. `build-apk.cmd` → 輸出檔名中的 `v1.0`
3. `src/App.vue` → Options 視窗的 `<span class="opt-version">v1.0.0</span>`

### 回滾程序

- 無自動回滾機制。`release/` 內保留舊版安裝檔/APK 即為回滾手段：重新安裝舊版即可
- 玩家資料存在裝置端 localStorage（金幣/最高分/排行榜），重裝**同一 appId** 的 APK 不會清除（除非使用者清除 App 資料）；Windows 版資料存於 Electron 使用者資料目錄，重裝亦保留

---

## 2. 監控與告警

**不適用**（無伺服器）。用戶端內建診斷機制如下：

### 監控指標（用戶端診斷）

| 機制 | 位置 | 行為 |
|------|------|------|
| Crash overlay | `src/main.js` | runtime 錯誤 / Promise rejection / Vue 錯誤 → 畫面紅色錯誤框，供測試者截圖回報 |
| 凍結追蹤 `tt_trace` | `src/game/useGame.js` + `main.js` | 每步落子寫入進入/完成標記；啟動時偵測上次是否凍結在邏輯中途並提示 |

### 告警規則 / 告警處理

不適用。測試者回報流程：看到紅色錯誤框 → 截圖 → 回報開發者（錯誤框含 stack trace 前 1500 字元）。

---

## 3. 備份與恢復

### 備份策略

- **原始碼**：⚠️ 專案目前無 git 版控——這是最大風險。建議 `git init`（見開發指引第 3 章）或定期手動備份整個專案目錄
- **美術源檔**：`art-reference/` 內的 PSD 是素材唯一可編輯來源，務必納入備份
- **玩家資料**：localStorage 存於各玩家裝置，開發端無需備份

### 恢復程序

- 原始碼損毀：從備份還原；`node_modules/`、`dist/`、`android/app/build/` 可隨時由 `npm install` / `npm run build` / `npm run apk` 重生，不需備份
- 玩家資料遺失（清除 App 資料/換機）：無雲端同步，無法恢復（已知限制）

### 災難恢復

可攜版建置工具（`d:\ClaudeLab\android-dev\`）若遺失，需重新下載 JDK 21（Temurin zip）與 Android cmdline-tools 並安裝 platforms;android-36、build-tools;36.0.0，再更新 `android/local.properties` 路徑。

---

## 4. 故障排除

### 常見問題

| 症狀 | 原因 | 解法 |
|------|------|------|
| 終端機跑 `electron .` 立刻閃退（`app` undefined） | VSCode / Claude Code 終端機繼承 `ELECTRON_RUN_AS_NODE=1` | `Remove-Item Env:ELECTRON_RUN_AS_NODE` 後再跑；打包版不受影響 |
| APK 建置失敗：找不到 Java / SDK | `JAVA_HOME` 未設或 `android/local.properties` 路徑錯 | 用 `build-apk.cmd` 建置（自動設定）；確認 `d:\ClaudeLab\android-dev\` 存在 |
| Electron 開啟後白畫面 | `dist/` 不存在或資源路徑錯誤 | 先 `npm run build`；確認 `vite.config.js` 有 `base: './'`（file:// 載入必要） |
| 手機安裝 APK 被阻擋 | debug 簽章非商店來源 | 手機設定允許「安裝未知來源應用程式」 |
| EXE 打包失敗：`EPERM: rename win-unpacked.tmp` | dev server（vite）開著時檔案監看器鎖住 `release/` 內剛解壓的檔案 | 已在 `vite.config.js` 的 `server.watch.ignored` 排除 `release/` 等打包目錄；若仍發生，先停掉 dev server 再打包 |
| 遊戲沒有聲音 | 行動瀏覽器 AudioContext 需使用者互動後 resume | 已內建處理（`sfx.js` 自動 resume）；仍無聲檢查 Options → Sound 是否 Off |
| 畫面出現紅色錯誤框 | runtime 錯誤被 crash overlay 攔截 | 截圖回報；框內含錯誤位置與 stack trace，點擊可關閉 |
| 啟動時提示「上次遊戲疑似凍結」 | localStorage `tt_trace` 停在 `place-start`（上次落子邏輯未跑完） | 截圖回報 trace 內容；此為歷史凍結問題的診斷機制（root cause 未定論） |
| 切背景很久回來步數沒回滿 | — | 屬正常設計外的異常：回血採牆上時鐘法，`visibilitychange` 會補算；若未補，檢查 WebView 是否被系統回收重啟 |

### 診斷工具

- Web / Electron 開發：瀏覽器 DevTools（`npm run dev` 後 F12）
- localStorage 檢視：DevTools → Application → Local Storage（key：`tripletown_coins`、`tripletown_best`、`tripletown_highscores`、`tt_trace`）
- Android：`chrome://inspect` 可連 WebView（debug build）

### 升級流程

單人專案，無升級鏈；問題記錄於根目錄 `CLAUDE.md` 的「待開發功能」段落。

---

## 5. 維護計劃

### 定期維護

無例行任務。建議每次開發週期開始時檢查 `npm outdated`。

### 版本更新

- 依賴更新採保守策略（依賴極簡原則，見開發指引）；Capacitor / Electron 大版本升級前先確認 APK 與 EXE 建置管線可用
- 發版 checklist：同步三處版本號（見第 1 章）→ `npm run apk` + `npm run exe` → 實機/本機試玩驗證 → 分發 `release/` 產物

### 容量規劃

不適用。產物大小參考：APK 約 6.4MB、EXE 安裝檔約 105MB（Electron runtime 佔大宗）。

---

## 6. 相關文檔

- **系統架構**: [SRD_System_Architecture.md](srd/SRD_System_Architecture.md)
- **部署架構**: [SRD 第 8 章](srd/SRD_System_Architecture.md#8-部署架構-deployment-architecture)
- **開發指引**: [Developer_Guideline.md](Developer_Guideline.md)
- **專案規則與打包細節**: [CLAUDE.md](../CLAUDE.md)
