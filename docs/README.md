# Triple Town CL 文件導覽

本目錄依 AISDLC 框架（`d:\ClaudeLab\AISDLC\AISDLC_INIT.md`）範本撰寫，是了解遊戲規則、系統架構與維運方式的入口。

---

## 快速入口

| 我想... | 看這份 |
|---|---|
| 了解合成表、機率池、熊的 AI 行為、商店數值 | [`frd/FRD_GameRules.md`](frd/FRD_GameRules.md) |
| 了解技術架構（Vue/Electron/Capacitor 怎麼串起來） | [`srd/SRD_System_Architecture.md`](srd/SRD_System_Architecture.md) |
| 設置開發環境、遵循編碼規範 | [`Developer_Guideline.md`](Developer_Guideline.md) |
| 打包 APK / EXE、部署網頁版到 GitHub Pages、備份與還原、故障排除 | [`Operations_Guide.md`](Operations_Guide.md) |
| git 日常流程、什麼進版控、不能做的事 | [`Developer_Guideline.md` 第 3 章](Developer_Guideline.md#3-git-工作流程) |
| 開發規範全貌、待開發清單 | [`../CLAUDE.md`](../CLAUDE.md) |

---

## 文件清單

### FRD（功能需求）

| 文件 | 內容 |
|---|---|
| [FRD_GameRules](frd/FRD_GameRules.md) | 合成鏈、放置判定、水晶橋接、熊 AI 與困住判定、抽牌機率池、商店經濟系統、結算與村莊等級 |

### SRD（系統設計）

| 文件 | 內容 |
|---|---|
| [SRD_System_Architecture](srd/SRD_System_Architecture.md) | 架構圖、技術選型、遊戲核心序列圖、資料模型、部署（Web/APK/EXE 三平台）、技術債 |

### 支援指南

| 文件 | 內容 |
|---|---|
| [Developer_Guideline](Developer_Guideline.md) | 環境設置、編碼規範、Git 流程、測試 SOP、文檔規範 |
| [Operations_Guide](Operations_Guide.md) | 部署程序、故障排除、維護計劃 |
| [開發指南_專案目錄結構比較](開發指南_專案目錄結構比較.md) | JournalApp／myStock／TripleTown／myLife 四專案的目錄結構與打包管線差異（四專案各放一份，內容逐字相同） |

---

## 專案目錄結構（頂層全部項目）

git 遠端為 GitHub **公開** repo `hedyhsu99/TripleTown`（網頁版經 GitHub Pages 發佈）。因為是公開 repo，**原版遊戲素材刻意不上傳**；「不進 git」的項目在 GitHub 上沒有備份，其中不能重新產生的要自行另存。

圖例：✅ 進 git ／ 🟡 部分進 git ／ ❌ 不進 git

| 目錄／檔案 | 用途 | git | 不進 git 的原因／備註 |
|---|---|:---:|---|
| `src/` | Vue 原始碼（`game/` 遊戲邏輯、`picts/` 棋子圖、`components/`） | ✅ | |
| `build/` | Electron 打包圖示（`icon.png`）與 NSIS 安裝程式腳本（`installer.nsh`） | ✅ | |
| `electron/` | Electron 桌面版進入點（`main.cjs`） | ✅ | |
| `android/` | Capacitor 原生 Android 專案 | 🟡 | 排除建置產物（`build/`、`.gradle/`）、`cap sync` 複製來的網頁資產、`local.properties`（本機 SDK 路徑，各機不同） |
| `docs/` | AISDLC 文件（本目錄：`frd/`、`srd/`、開發指引、維運手冊等） | ✅ | |
| `.github/` | GitHub Actions：部署網頁版到 GitHub Pages | ✅ | |
| `.claude/` | Claude Code 專案設定、commands 與 skills | ✅ | |
| `art-reference/` | 原版截圖與 PSD 美術源檔（不參與建置） | ❌ | **公開 repo 不放原版遊戲素材**。無法重新產生，需自行另存 |
| `openspec/` | （空目錄） | ❌ | 裡面沒有任何檔案，git 不追蹤空目錄。**刻意保留**：下次有新需求時以 SDD（OpenSpec）開發，屆時產生的檔案會正常進 git |
| `dist/` | `vite build` 輸出 | ❌ | 建置產物（GitHub Pages 由 Actions 在雲端另行 build） |
| `release/` | 打包好的 APK／EXE | ❌ | 建置產物（大型二進位檔），重新打包即可 |
| `node_modules/` | npm 套件 | ❌ | 依 `package-lock.json` 以 `npm install` 重建 |
| `CLAUDE.md` | 開發規範、待開發清單 | ✅ | |
| `README.md` | GitHub repo 首頁說明 | ✅ | |
| `package.json`／`package-lock.json` | 相依套件、scripts、electron-builder 設定 | ✅ | |
| `vite.config.js` | 建置設定（`base: './'` 為相容 Electron 與 Pages） | ✅ | |
| `capacitor.config.json` | Capacitor 設定 | ✅ | |
| `index.html` | Vite 進入點 | ✅ | |
| `build-apk.cmd` | 一鍵打包 APK | ✅ | |
| `.gitignore` | 版控排除規則（另排除 `*.psd`、`*.apk`、`*.exe`） | ✅ | |

---

## 修訂歷史

| 日期 | 版本 | 變更說明 |
|---|---|---|
| 2026-07-19 | 1.0 | 初始建立；FRD_GameRules 由 docs/ 根目錄移入 frd/ 子目錄以符合 AISDLC 目錄慣例 |
| 2026-10-01 | 1.1 | 原始碼納入 git／GitHub，網頁版改由 GitHub Actions 部署至 GitHub Pages；更新維運手冊（部署、備份還原、故障排除）、開發指引第 3 章、SRD 第 8／9 章 |
| 2026-10-04 | 1.2 | 文件清單列入「開發指南_專案目錄結構比較」（原檔名 `Developer_Guideline_ProjectStructureComparison.md`，改為中文並加入 myLife）；「目錄結構」由只列 `docs/` 擴充為專案頂層全部項目，並標示是否進 git 與原因 |
