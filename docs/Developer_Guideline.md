# 開發指南 (Developer Guideline) — Triple Town CL

*本文件依 AISDLC `Developer_Guideline.md` 範本撰寫，作為修改本專案的標準作業程序（SOP）。*

---

## 1. 開發環境設置

### 必要工具

| 工具 | 版本 / 位置 | 用途 |
|------|------------|------|
| Node.js + npm | 未鎖定版本（package.json 無 `engines` 欄位；需支援 Vite 5） | 開發與建置 |
| JDK 21（Temurin zip 可攜版） | `d:\ClaudeLab\android-dev\jdk-21.0.11+10` | Android APK 建置（不需安裝，`build-apk.cmd` 自動設 `JAVA_HOME`） |
| Android SDK（cmdline-tools） | `d:\ClaudeLab\android-dev\sdk`（platforms;android-36、build-tools;36.0.0） | 同上；`android/local.properties` 指向此位置 |

**不需要 Android Studio、不需要全域安裝 Electron**（devDependencies 內含）。

### 環境設置步驟

```bash
cd d:\ClaudeLab\TripleTown
npm install          # 安裝依賴（vue、capacitor、electron、vite）

npm run dev          # 開發伺服器 http://localhost:5173
npm run build        # 正式建置 → dist/
npm run preview      # 預覽 build 結果
npm run apk          # 一鍵建 Android APK → release/TripleTownCL-v1.0-debug.apk
npm run exe          # 建 Windows 安裝檔 → release/TripleTownCL-Setup-1.0.0.exe
npm run electron     # 本機直接開 Electron 視窗（開發測試用）
```

### 環境變數

無需設定任何環境變數。唯一陷阱（除錯用終端機）：

> ⚠️ 在 VSCode / Claude Code 終端機跑 `electron .` 會因繼承 `ELECTRON_RUN_AS_NODE=1` 而立刻閃退（`app` 為 undefined）。先執行 `Remove-Item Env:ELECTRON_RUN_AS_NODE` 再啟動。打包版不受影響。

---

## 2. 編碼規範

### 命名規範

| 對象 | 規範 | 現有範例 |
|------|------|---------|
| Composable | `useXxx` 駝峰式 | `useGame.js`、`useVillagers.js` |
| Vue 元件 | PascalCase | `GameBoard.vue`、`PieceSVG.vue` |
| 物件（piece）key | snake_case 字串 | `floating_castle`、`ninja_bear` |
| 常數表 | UPPER_SNAKE_CASE | `MERGE_INTO`、`SPAWN_POOL`、`STORE_ITEMS` |
| localStorage key | `tripletown_` 前綴（診斷用 `tt_` 前綴） | `tripletown_coins`、`tt_trace` |

### 程式碼風格

- Vue 一律用 **`<script setup>` Composition API**（本專案無 Options API）
- **狀態集中**：遊戲狀態只放 `useGame()`，元件不各自持有；純 UI 開關（overlay 顯示與否）放 App.vue 的 ref
- **靜態常數與邏輯分離**：平衡數值（分數、機率、價格）只改 `pieces.js` 與 `useGame.js` 頂部常數區
- **CSS**：元件內用 `<style scoped>`；App.vue 的全域樣式不加 scoped
- **依賴極簡**：不隨意加 npm 套件；目前 runtime 依賴只有 vue + 3 個 Capacitor 套件

### 註解規範

- 所有註解用**繁體中文**，說明「為什麼這樣做」（如原版行為對照、平台陷阱），不只是翻譯程式
- 區塊註解用 `// ── 標題 ──────` 分隔線樣式（見 `useGame.js`）
- 仿原版行為的邏輯必須註明「原版規則/原版行為」字樣，方便日後對照

### 常見修改情境 SOP

| 想改什麼 | 改哪裡 | 注意事項 |
|---------|--------|---------|
| 物件出現機率 | `pieces.js` → `SPAWN_POOL` 的 weight | 忍者熊無法困住會永久累積，bot 出現率必須明顯高於 ninja_bear |
| 合成分數 / 放置得分 | `pieces.js` → `PIECES` 的 `score` / `placeScore` | `score` 是合成得分、`placeScore` 是放置基本分，別搞混 |
| 新增一種物件 | `pieces.js`（PIECES + MERGE_INTO + 視情況 SPAWN_POOL）→ `PieceSVG.vue`（import 圖檔 + 對應渲染）→ 圖檔放 `src/picts/` | 若參與完場結算，還要加 `useGame.js` 的 `SETTLE_COINS` / `BUILDING_TIER` |
| 商店商品 / 單價 / 庫存 | `useGame.js` → `STORE_ITEMS`（`price`=單價、`stock`=每局庫存，null=不限購）；點擊區在 App.vue → `SHOP_HITS` | 商店 UI 是 `storeV2.png`（無數字乾淨版）圖片 + 透明點擊區疊加，新增商品格需對好座標；庫存數字由 `STOCK_BADGES` 座標動態疊繪於物件圖示右下角 |
| 步數上限 / 回血速度 | `useGame.js` 頂部 `TOTAL_TURNS` / `REGEN_SECONDS` | 回血採牆上時鐘法，別改回每秒累加（會失去背景補血能力） |
| 目標分數 | `useGame.js` 頂部 `GOAL_SCORE` | — |
| 開局初始物件 | `useGame.js` → `placeInitialPieces()` 的 `initial` 陣列 | — |
| 音效 | `sfx.js`（頻率/波形/長度） | 保持 try/catch 靜默失敗原則 |
| 版面 / 樣式 | App.vue `<style>`（全域）或各元件 scoped style | 棋盤背景是 `bg_board.png` 整張圖，格子本身透明 |
| 放置手感（點擊容錯） | `GameBoard.vue` → `SNAP_RATIO`（吸附容錯，格寬比例）、`onBoardUp` 的 `cellSize * 0.75`（滑開取消門檻） | 點擊判定在 **GameBoard 棋盤層級**用座標算格，`GameCell` 是純呈現元件不綁事件；吸附只吸到空格（`isSnapTarget`），機器人/寶箱不做容錯；`touch-action: none` 不可改回 `manipulation`（會產生 pointercancel 導致點擊失效） |

**改完程式後必須 `npm run build` 驗證**（若要更新 APK/EXE 再跑 `npm run apk` / `npm run exe`）。

---

## 3. Git 工作流程

> ⚠️ **現況：本專案目前不是 git repository**，所有刪改無法還原。建議儘早初始化：

```bash
cd d:\ClaudeLab\TripleTown
git init
```

建議的 `.gitignore`（依現有目錄結構）：

```gitignore
node_modules/
dist/
release/
android/app/build/
android/.gradle/
android/local.properties    # 指向本機 SDK 路徑，勿提交
```

`art-reference/`（約 100MB 參考圖與 PSD）視需求決定是否納入版控。

### 分支策略

單人專案，尚未定義分支策略；建議：`main` 保持可建置狀態，實驗性改動開 feature 分支。

### Commit 規範

尚未定義；建議格式：`類型：簡述`（繁體中文），如 `功能：新增商店 Undo 商品`、`修正：忍者熊瞬移後困住判定`。

### PR 流程

不適用（單人專案、無遠端 repo）。

---

## 4. 測試規範

### 單元測試

**尚未建立**自動化測試。核心邏輯（`processMerges`、`moveBears`、`resolveCrystal`）為純函式操作草稿盤，是未來加 Vitest 單元測試的首選對象。

### 整合測試（手動試玩檢查清單）

改動遊戲邏輯後，至少手動驗證下列情境：

- [ ] **基本合成**：3 個草相鄰 → bush；連鎖合成正常（bush 完成後若湊滿 3 個 bush 續合成 tree）
- [ ] **4+ 合成 bonus**：一次 4 個同類 → 雙倍分數，bush/tree/hut/castle 出現閃亮高級版外觀
- [ ] **熊行為**：普通熊每步走一格；被完全包圍的「熊群」全體變墓碑並觸發合成；忍者熊每回合瞬移
- [ ] **crystal**：相鄰可合成群 → 合成（多組時取高階）；無效 → 變石頭
- [ ] **bot**：點熊 → 墓碑；點其他物件 → 摧毀；點空格無效
- [ ] **寶箱**：點擊開箱 +5000 金幣、不耗步數
- [ ] **盤子（hold）**：存入 / 交換正常；(0,0) 格不可放置
- [ ] **步數**：用光時點格子跳「Out of turns!」；等 10 秒回 1 步；切背景再回來有補血
- [ ] **商店**：金幣不足或本局庫存售完灰色；物件旁 ×N 數字隨購買遞減、售完顯示 x0；一次購買 1 個物件立即上手、原手牌退回佇列；庫存每局重置、局內不補貨；Undo 還原上一步（金幣不還原）
- [ ] **完場**：棋盤滿 → 熊清算 → Village Complete 結算視窗 → 排行榜寫入（Options → High scores 可見）
- [ ] **持久化**：重新整理頁面後 coins / best / 排行榜仍在
- [ ] **放置手感（實機觸控）**：點在空格與已放物件的交界處 → 仍能放進那個空格；連續快速點擊不漏拍；手指按下後滑開約一格再放開 → 取消不落子；兩指同時點 → 只落一子；長按格子不跳系統選單也不會卡住下一次點擊
- [ ] **放置手感（滑鼠 / EXE 版）**：在棋盤上按住左鍵、拖到棋盤外再放開 → 不落子，且**回來仍可正常點擊**（驗證 `setPointerCapture` 有把 `pointerId` 清乾淨）

### 建置驗證

- Web：`npm run build` 無錯誤、`npm run preview` 可玩
- APK：安裝到實機測試（全螢幕沉浸模式、觸控手感、切背景回血）
- EXE：`npm run electron` 視窗正常（注意第 1 章的 `ELECTRON_RUN_AS_NODE` 陷阱）

---

## 5. 文檔規範

### API 文檔

無 HTTP API。`useGame()` 介面異動時同步更新 [SRD 第 2 章](srd/SRD_System_Architecture.md)。

### 程式碼文檔

- 專案級規則與打包流程寫在根目錄 `CLAUDE.md`（供 Claude Code 與開發者共用），架構或流程改變時**必須同步更新**
- 專案文件一律依 AISDLC 範本（`d:\ClaudeLab\AISDLC\docs_template\`）撰寫，放在 `docs/`
- `.md` 文件中英文並存：中文說明搭配英文術語

---

## 6. 相關連結

- **系統架構**: [SRD_System_Architecture.md](srd/SRD_System_Architecture.md)
- **維運手冊（建置/發佈 SOP）**: [Operations_Guide.md](Operations_Guide.md)
- **專案規則**: [CLAUDE.md](../CLAUDE.md)
- **原版參考素材**: `../art-reference/`（原版截圖 + PSD 源檔）
- **玩法參考文章**: https://char.tw/blog/post/36781128
