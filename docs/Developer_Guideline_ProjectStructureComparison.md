# 開發指南 (Developer Guideline) — JournalApp / myStock / TripleTown 目錄結構與打包架構比較

> 本文件範本依 `d:\ClaudeLab\AISDLC\docs_template\Developer_Guideline.md` 撰寫。
> 目的：三個專案（`d:\ClaudeLab\JournalApp`、`d:\ClaudeLab\myStock`、`d:\ClaudeLab\TripleTown`）都採用 Vue 3 + Vite + Capacitor 的共同技術棧，但目錄結構與打包目標不完全相同，開發時容易混淆「這個資料夾在這個專案是不是也需要」。本文件記錄三者的實際差異與原因，供之後新增/比對專案結構時查閱。同一份內容會放在三個專案各自的 `docs/` 目錄，維持三邊一致。

---

## 1. 開發環境設置

### 必要工具

三專案共用同一套可攜式工具鏈，避免每個專案各自安裝一份：

| 工具 | 路徑/來源 | 用途 | 三專案共用？ |
|------|-----------|------|--------------|
| JDK 21 | `d:\ClaudeLab\android-dev\jdk-21.0.11+10` | Gradle 建置需要 | ✅ 共用 |
| Android SDK | `d:\ClaudeLab\android-dev\sdk` | 產出 Android APK，不需安裝 Android Studio | ✅ 共用 |
| electron / electron-builder | 各專案自己的 `node_modules`（`package.json` 內宣告） | 產出 Windows 桌面 EXE | ❌ **僅 myStock、TripleTown**，JournalApp 沒有 |

**為什麼 JournalApp 沒有 Electron？**
JournalApp 是既有 Web 系統（JournalCL）的「手機陪伴 App」，桌面使用者本來就直接用瀏覽器開 JournalCL 網站即可，不需要另外包一個桌面 EXE。myStock（股票追蹤）、TripleTown（遊戲）則是獨立工具，沒有對應的既有網站可以取代桌面情境，所以才需要 Electron 讓使用者在 Windows 上雙擊執行、不必開瀏覽器。

### 環境設置步驟

三專案的開發啟動與打包指令一致（皆由各自的 `build-apk.cmd` / `package.json` scripts 提供）：

```bash
npm install          # 安裝相依套件
npm run dev           # 啟動 Vite dev server（區網手機可連，host: true）
npm run apk            # = build-apk.cmd：build → cap sync android → gradlew assembleDebug → release/*.apk
npm run exe             # 僅 myStock、TripleTown：build → electron-builder --win → release/*.exe
```

### 環境變數
不適用——三專案皆用 `.env.development`/`.env.production`（若有後端 API）或 Vite `base` 設定處理環境差異，非本文件比較重點，各專案的環境變數細節請見各自的 SRD/CLAUDE.md。

---

## 2. 目錄結構比較

*（此章節為本文件核心內容，範本原無此標題層級，因應「三專案目錄結構比較」的主題新增；未省略範本原有任何章節）*

### 頂層目錄總表

| 目錄/檔案 | JournalApp | myStock | TripleTown | 用途 |
|-----------|:---:|:---:|:---:|------|
| `src/` | ✅ | ✅ | ✅ | Vue 原始碼，`import` 引入、Vite 打包處理（檔名會被雜湊改名） |
| `public/` | ✅ | ✅ | ❌ | 見下方「`public/` vs `src/` 的判斷準則」 |
| `electron/` | ❌ | ✅ | ✅ | Electron 桌面版進入點（`main.cjs` 等），僅雙平台專案需要 |
| `android/` | ✅ | ✅ | ✅ | Capacitor 產生的原生 Android 專案（`npx cap sync android` 產物+設定） |
| `build/` | ❌ | ✅ | ✅ | electron-builder 的圖示/安裝程式設定來源（如 `icon.png`、TripleTown 另有 `installer.nsh` 自訂 NSIS 安裝程式） |
| `dist/` | ✅ | ✅ | ✅ | `vite build` 輸出，供 `cap sync`／Electron 讀取，皆為建置產物、不進版控 |
| `release/` | ✅ | ✅ | ✅ | 最終產出的 `.apk`／`.exe` 存放處 |
| `docs/` | ✅ | ✅ | ✅ | AISDLC 文件（`frd/`、`srd/`，myStock 另有 `prd/`） |
| `openspec/` | ✅ | ✅ | ✅ | OpenSpec 變更流程（`changes/`、`specs/`） |
| 額外美術/資料來源 | `resources/`（icon.png/psd） | `assets/`、`data/`、`picts/`（icon/splash 來源、股票 CSV 資料、設計稿） | `art-reference/`（棋子美術設計稿 psd/jpg） | 各專案依需求命名，非共同慣例 |

### `public/` vs `src/` 的判斷準則

三專案對「圖片該放 `src/` 還是 `public/`」的判斷一致，只是實際需求不同導致有無 `public/` 資料夾：

- **放 `src/`、用 `import` 引入**：檔案路徑在 build 時就已確定，Vite 會處理雜湊檔名與最佳化。
  例：TripleTown 的遊戲棋子圖（`src/picts/1.grass.png` 等）全部用 `import`，因此**完全不需要 `public/`**。
- **放 `public/`、用執行期組出來的字串路徑引用**：路徑在執行期才由變數決定（例如使用者選擇的頭像檔名），無法用 `import` 靜態引入，需要穩定、不被雜湊改名的網址。
  例：JournalApp／myStock 的頭像圖（`` `/avatars/${name}.svg` ``）、`index.html` 的 `<link rel="icon">` 直接寫死引用的 favicon 檔案。

  **檢查方式**：`public/` 底下的檔案在 `vite build` 時會被**原封不動**複製進 `dist/`；若專案有打包 Android/Electron 流程，`dist/` 內容又會被複製進下一次的 App 資產——這代表 `public/` 是「最終一定會進到 App 本體」的內容，只適合放真正需要的靜態資源，**不要把建置產物（如 APK 檔）暫時放進去**（見下方「⚠️ 已知教訓」）。

### `electron/` 與 `build/` 的關聯

`electron/`（進入點程式碼）與 `build/`（electron-builder 設定來源，如圖示、安裝程式腳本）是配對出現的：有 `electron/` 就會有 `build/`，兩者只存在於同時支援桌面版的 myStock、TripleTown，JournalApp 兩者都沒有。

### ⚠️ 已知教訓：不要把建置產物複製進 `public/`

2026-07 於 JournalApp 開發過程中，曾為了方便手機下載側載安裝，把打包好的 APK 複製進 `public/JournalApp-v1.0-debug.apk`。但如上所述，`public/` 內容會被 `vite build` 複製進 `dist/`，`npx cap sync android` 又把 `dist/` 整包複製進**下一次**要打包的 Android app 資產——等於「上一版 APK 被包進這一版 APK」，每 build 一次體積就疊加一層舊 APK，實測從 26MB 一路長到 41MB 才被發現。

**修法**（已套用於 JournalApp）：`vite.config.js` 新增一個僅 `vite dev` 生效的自訂 middleware，直接從 `release/` 資料夾讀檔提供 `/release/*.apk` 下載路徑，完全不經過 `public/`／`dist/`。

**檢查過 myStock、TripleTown 的建置腳本（`build-apk.cmd`）與目前 `public/` 資料夾內容，兩者皆無此問題**——`build-apk.cmd` 只把 APK 複製到 `release/`，從未寫入 `public/`；這是 JournalApp 這次開發過程中的臨時操作失誤，不是範本腳本本身的通病。**日後任兩個新專案要比照 Capacitor + 手機下載側載安裝流程時，記得直接沿用 JournalApp 這個 middleware 寫法，不要重蹈覆轍。**

---

## 3. 編碼規範
不適用——本文件聚焦於三專案目錄結構與打包管線比較，非單一專案的程式碼命名/風格規範；各專案的編碼慣例請見各自 `CLAUDE.md`。

---

## 4. Git 工作流程
不適用——同上，各專案的分支/Commit/PR 慣例不在本文件比較範圍內。

---

## 5. 測試規範
不適用——同上。

---

## 6. 文檔規範
不適用——同上；三專案的文件皆遵循 workspace `CLAUDE.md` 規定，統一使用 `d:\ClaudeLab\AISDLC\docs_template\` 範本。

---

## 7. 相關連結
- TripleTown 架構文件：[`docs/srd/SRD_System_Architecture.md`](srd/SRD_System_Architecture.md)
- TripleTown 開發指南（原有）：[`docs/Developer_Guideline.md`](Developer_Guideline.md)
- JournalApp 架構文件：[`docs/srd/SRD_JournalApp.md`](../../JournalApp/docs/srd/SRD_JournalApp.md)（或 `d:\ClaudeLab\JournalApp\docs\srd\SRD_JournalApp.md`）
- myStock 架構文件：[`docs/srd/SRD_System_Architecture.md`](../../myStock/docs/srd/SRD_System_Architecture.md)（或 `d:\ClaudeLab\myStock\docs\srd\SRD_System_Architecture.md`）
- 工作區全域規則：`d:\ClaudeLab\CLAUDE.md`

---

## 修訂歷史

| 日期 | 版本 | 作者 | 變更說明 |
|------|------|------|----------|
| 2026-07-30 | 1.0 | Claude + Hedy | 初版，記錄 JournalApp / myStock / TripleTown 目錄結構差異、`public/` 判斷準則、electron 打包目標差異，以及 APK 誤放 `public/` 的教訓 |
