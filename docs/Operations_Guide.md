# 維運指南 (Operations Guide) — Triple Town CL

*本文件依 AISDLC `Operations_Guide.md` 範本撰寫，作為建置、發佈與問題排除的標準作業程序（SOP）。*
*專案性質：單機遊戲（Web / Android APK / Windows EXE），無伺服器；範本中以「伺服器維運」為前提的章節標註「不適用」並改述對應事項。*

---

## 1. 部署程序

### 環境清單

| 環境 | 形式 | 產出 / 位置 |
|------|------|------------|
| 開發 | Vite dev server | `npm run dev` → http://localhost:5177 |
| Web（正式） | GitHub Pages，由 GitHub Actions 從原始碼建置 | https://hedyhsu99.github.io/TripleTown/ |
| Android | debug APK（試玩分發） | `release/TripleTownCL-v1.0-debug.apk`（約 8MB） |
| Windows | NSIS 安裝檔 | `release/TripleTownCL-Setup-1.0.0.exe`（約 100MB） |

三種產物都來自同一次 `npm run build` 的 `dist/`，差別只在後續怎麼包裝。Claude Code 裡可直接用 `/package apk`、`/package local`（= Windows EXE）、`/package github`，流程定義在 `.claude/skills/package/SKILL.md`。

### 三個「位置」的關係（local / git / 部署）

```
本機工作目錄 d:\ClaudeLab\TripleTown        ← 唯一的開發場所（改程式、打包 APK/EXE）
   │  git commit                            ← 存進本機 .git（可還原的版本歷史）
   ▼
本機 git repo（.git/）
   │  git push origin main                  ← 備份到 GitHub＋觸發網頁版部署
   ▼
GitHub repo  hedyhsu99/TripleTown          ← 只放原始碼，不放任何建置產物
   │  GitHub Actions：npm ci → npm run build（.github/workflows/deploy.yml）
   ▼
GitHub Pages  hedyhsu99.github.io/TripleTown/   ← 網站內容 = Actions 建出的 dist/
```

| 產物 | 從哪裡發佈 | 跟 GitHub 有關嗎 |
|------|-----------|-----------------|
| APK / EXE | 本機 `release/` | **無關**。打包不需要先 commit，`release/` 也不進版控 |
| 網頁版 | GitHub Actions | **只能**透過 push 更新，沒有其他路徑 |

### 部署步驟

#### 網頁版 GitHub Pages（SOP）

```bash
npm run build                 # 1. 本機先建置一次，確認會過（CI 失敗比本機難查）
git status                    # 2. 檢查要提交的檔案，不可出現 release/、dist/、*.apk、*.exe、*.psd
git add -A
git commit -m "功能：…"        # 3. 提交
git push origin main          # 4. 推送 → 自動觸發 Actions「Deploy to GitHub Pages」
```

5. 到 https://github.com/hedyhsu99/TripleTown/actions 等 build、deploy 兩個 job 都打勾（約 1～2 分鐘）
6. 開 https://hedyhsu99.github.io/TripleTown/ 確認。瀏覽器若仍顯示舊版，按 Ctrl+F5

**GitHub 端的固定設定（已完成，不要改）**：Settings → Pages → Source = **GitHub Actions**。
改回 "Deploy from a branch" 的話，Pages 會原樣發佈 repo 根目錄的原始碼 `index.html`（它引用 `/src/main.js`，瀏覽器無法執行）→ 白畫面。

> ⚠️ **不要在 GitHub 網頁用「Add file → Upload files」上傳 build 產物**（2026-07 首次上架是這樣做的，已淘汰）：
> 1. `dist/index.html` 會蓋掉根目錄的原始碼 `index.html`，之後 Actions 會拿成品當入口建置，網站不是 build 失敗就是永遠停在上傳的那版
> 2. 根目錄會多出帶 hash 檔名的 `assets/`，每傳一次累積一組，Actions 根本不會用到
> 3. 網頁上傳也是一個 commit，本機沒有，下次本機 push 會被拒絕（`! [rejected] … (fetch first)`），需先 `git pull`
>
> 在 GitHub 網頁上**編輯原始碼**（例如 README）是可以的，但回到本機改東西前要先 `git pull`。



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

- **網頁版**：`git revert <有問題的 commit>` → `git push`，Actions 會自動以還原後的原始碼重新部署。**不要用 `git push --force` 改寫歷史**
- **APK / EXE**：無自動回滾機制。`release/` 內保留舊版安裝檔/APK 即為回滾手段：重新安裝舊版即可；也可 `git checkout <舊 commit>` 後重新打包
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

2026-10-01 起原始碼納入 git，並推送到 GitHub（`hedyhsu99/TripleTown`，公開 repo）。

| 項目 | 備份方式 | 不見的話 |
|------|---------|---------|
| 原始碼（`src/`、`android/`、`electron/`、`docs/`、設定檔） | **GitHub**（push 即備份） | `git clone` 取回。⚠️ 只有 **push 過**的版本；本機未 commit／未 push 的改動不在 GitHub 上 |
| `art-reference/`（約 148MB 原版截圖與 PSD） | **刻意不進 git**（公開 repo 不放原版素材），需自行備份到 OneDrive／外接硬碟 | 若無另外備份則**無法恢復**——這是素材唯一可編輯來源 |
| Android debug 簽章 `C:\Users\hedyh\.android\debug.keystore` | 不在 repo 內，建議另外備份 | 新簽章打的 APK 無法覆蓋安裝舊版，玩家須先移除舊版（**遊戲進度消失**） |
| `release/`、`dist/`、`node_modules/`、`android/app/build/` | 不需備份 | 由 `npm run apk`／`npm run exe`／`npm run build`／`npm install` 重生 |
| `android/local.properties` | 不需備份（本機路徑） | 手動建立，內容一行：`sdk.dir=d:\\ClaudeLab\\android-dev\\sdk` |
| 玩家資料 | localStorage 存於各玩家裝置，開發端無需備份 | — |

### 恢復程序

**原始碼遺失或換電腦**：

```bash
cd d:\ClaudeLab
git clone https://github.com/hedyhsu99/TripleTown.git
cd TripleTown
npm install          # 重新下載套件
npm run dev          # 可開始開發
```

要打包 APK 還需：可攜版工具（見下方「災難恢復」）＋手動建立 `android/local.properties`＋從備份放回 `art-reference/`（僅美術調整需要，不影響建置）。

- 玩家資料遺失（清除 App 資料/換機）：無雲端同步，無法恢復（已知限制）。網頁版、APK、EXE 三者進度各自獨立，不互通

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
| 網頁版白畫面（GitHub Pages） | Pages 的 Source 被改回 "Deploy from a branch"，發佈的是未建置的原始碼 `index.html` | Settings → Pages → Source 改回 **GitHub Actions**，到 Actions 對「Deploy to GitHub Pages」按 Run workflow |
| push 後網頁版沒更新 | Actions 執行失敗，或瀏覽器快取 | 看 Actions 頁面該次 run 的紅色步驟 log；成功的話按 Ctrl+F5 |
| `git push` 被拒絕：`! [rejected] … (fetch first)` | GitHub 上有本機沒有的 commit（例如在網頁上編輯過檔案） | `git pull` 合併後再 push；**不要** `--force` |
| 切背景很久回來步數沒回滿 | — | 屬正常設計外的異常：回血採牆上時鐘法，`visibilitychange` 會補算；若未補，檢查 WebView 是否被系統回收重啟 |

### 診斷工具

- Web / Electron 開發：瀏覽器 DevTools（`npm run dev` 後 F12）
- localStorage 檢視：DevTools → Application → Local Storage（key：`tripletown_coins`、`tripletown_best`、`tripletown_highscores`、`tt_trace`）
- Android：`chrome://inspect` 可連 WebView（debug build）
- 網頁版部署狀態：https://github.com/hedyhsu99/TripleTown/actions ；或不登入以 API 查最近一次 run：
  `curl -s "https://api.github.com/repos/hedyhsu99/TripleTown/actions/runs?per_page=1"`（看 `status`／`conclusion`）

### 升級流程

單人專案，無升級鏈；問題記錄於根目錄 `CLAUDE.md` 的「待開發功能」段落。

---

## 5. 維護計劃

### 定期維護

無例行任務。建議每次開發週期開始時檢查 `npm outdated`。

### 版本更新

- 依賴更新採保守策略（依賴極簡原則，見開發指引）；Capacitor / Electron 大版本升級前先確認 APK 與 EXE 建置管線可用
- 發版 checklist：同步三處版本號（見第 1 章）→ `npm run apk` + `npm run exe` → 實機/本機試玩驗證 → 分發 `release/` 產物 → commit＋push（同時更新網頁版與 GitHub 備份）

### 容量規劃

不適用。產物大小參考：APK 約 8MB、EXE 安裝檔約 100MB（Electron runtime 佔大宗）。GitHub 單檔上限 100MB，這也是 `release/` 不能進版控的原因之一。

---

## 6. 相關文檔

- **系統架構**: [SRD_System_Architecture.md](srd/SRD_System_Architecture.md)
- **部署架構**: [SRD 第 8 章](srd/SRD_System_Architecture.md#8-部署架構-deployment-architecture)
- **開發指引**: [Developer_Guideline.md](Developer_Guideline.md)
- **專案規則與打包細節**: [CLAUDE.md](../CLAUDE.md)
