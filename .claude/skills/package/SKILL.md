---
name: package
description: 打包 TripleTown 的三種發佈產物——apk（Android 安裝檔）、local（Windows EXE 安裝檔）、github（網頁版部署到 GitHub Pages）。使用者說「打包」「出 APK」「出 EXE」「更新網頁版」「部署到 GitHub」時使用；參數為 apk / local / github，可多選，省略時先判斷哪些需要重新打包再問。
---

# TripleTown 打包（apk / local / github）

三個目標共用同一份 `npm run build` 產物（`dist/`），差別只在後面怎麼包：

| 參數 | 產物 | 位置 | 發佈方式 |
|---|---|---|---|
| `apk` | Android debug APK | `release/TripleTownCL-v1.0-debug.apk` | 手動傳到手機安裝 |
| `local` | Windows NSIS 安裝檔 | `release/TripleTownCL-Setup-1.0.0.exe` | 本機雙擊安裝 |
| `github` | 網頁版 | `https://hedyhsu99.github.io/TripleTown/` | `git push` → GitHub Actions 自動 build + 部署 |

`vite.config.js` 的 `base: './'` 是三者共用的前提（Electron 用 `file://`、Pages 在 `/TripleTown/` 子路徑），**不可改成絕對路徑**。

---

## 步驟 0：判斷要不要重新打包（每次都先做）

不要憑印象說「改過了要重包」或「不用」——用檔案時間比對。產物的修改時間早於任一**會進 build 的**原始檔，才需要重包。

會進 build 的檔案：`src/**`（`.psd` 除外，程式不 import）、`index.html`、`vite.config.js`、`package.json`、`capacitor.config.json`（僅影響 apk）、`electron/**`（僅影響 local）。

```bash
cd /d/ClaudeLab/TripleTown
ART=release/TripleTownCL-v1.0-debug.apk     # local 用 release/TripleTownCL-Setup-1.0.0.exe
find src index.html vite.config.js package.json capacitor.config.json electron \
     -type f ! -name '*.psd' -newer "$ART" -printf "%TY-%Tm-%Td %TH:%TM  %p\n"
```

- 沒有輸出 → 產物已是最新，告訴使用者「不需要重包」並列出產物時間
- 有輸出 → **逐一說明這些改動會不會影響產物**再決定。例：`vite.config.js` 只改了 `server.port` 屬於開發設定，build 結果相同，可以不重包
- `github` 不看本機產物，改看「本機有沒有未 push 的 commit／未 commit 的改動」（`git status`、`git log origin/main..HEAD`）

---

## apk：Android APK

```powershell
cmd /c build-apk.cmd
```

`build-apk.cmd` 會依序：設 `JAVA_HOME`（可攜版 JDK 21）→ `npm run build` → `npx cap sync android` → `gradlew assembleDebug` → 複製到 `release\`。不需要 Android Studio。第一次 Gradle 會很久，用 `run_in_background` 跑，不要設短 timeout。

**驗證**：

```bash
ls -la --time-style=long-iso release/TripleTownCL-v1.0-debug.apk   # 時間是剛剛、大小約 8MB
```

**回報使用者**：APK 路徑、大小、時間。提醒：
- 手機已安裝舊版時可直接覆蓋安裝（同一台電腦的 debug keystore 簽章一致，遊戲進度保留）
- 換電腦打包的話 debug keystore 不同，覆蓋安裝會失敗，必須先移除舊版（**進度會消失**）

---

## local：Windows EXE

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm run exe
```

⚠️ 在 VSCode / Claude Code 終端機繼承了 `ELECTRON_RUN_AS_NODE=1`，不先移除的話 `npm run electron` 會閃退。`npm run exe`（electron-builder）本身不受影響，但一律先移除，省得之後順手跑 `npm run electron` 驗證時踩到。

**驗證**：

```bash
ls -la --time-style=long-iso release/TripleTownCL-Setup-1.0.0.exe   # 時間是剛剛、大小約 100MB
```

若出現 `EPERM rename`：`npm run dev` 開著時監看到 `release/` 會鎖檔。先關 dev server 再重跑。

**不要自動執行安裝檔**——安裝是使用者的動作。只回報路徑。

---

## github：網頁版部署到 GitHub Pages

### 前置檢查（不通過就停，改走「一次性設定」）

```bash
cd /d/ClaudeLab/TripleTown
git rev-parse --is-inside-work-tree          # 必須是 git repo
git remote get-url origin                    # 必須指向 hedyhsu99/TripleTown
test -f .github/workflows/deploy.yml && echo ok
test -f .gitignore && echo ok
```

### 每次部署

1. **本機先 build 一次**確認會過：`npm run build`。CI 失敗比本機失敗難查
2. `git status` 列出改動，**把要 commit 的檔案清單給使用者看**。特別檢查清單裡**不能出現**：`release/`、`node_modules/`、`dist/`、`android/local.properties`、`android/app/build/`、任何 `.exe` / `.apk` / `.psd`
3. 使用者確認後才 `git add` + `git commit`（結尾附 Co-Authored-By）
4. **push 前再確認一次**（推到公開 repo 是對外動作，不可逆）→ `git push origin main`
5. 追蹤部署（不需要 gh CLI，本機沒裝；repo 是公開的，匿名 API 即可）：

   ```bash
   curl -s "https://api.github.com/repos/hedyhsu99/TripleTown/actions/runs?per_page=1" \
     | grep -E '"status"|"conclusion"|"html_url"' | head -3
   ```

   `status: completed` + `conclusion: success` 後再驗網址：

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://hedyhsu99.github.io/TripleTown/   # 200
   ```

   失敗時把 run 的 `html_url` 給使用者，請他在網頁上看 log。

**禁止**：`git push --force`、改寫已 push 的歷史、把 Pages 來源改回 "Deploy from a branch"。

### 一次性設定（前置檢查不通過時）

> ✅ **已於 2026-10-01 完成**（commit `42a9aff`）。正常情況前置檢查會通過、不會走到這裡。
> 會走到這裡的情境只剩「換電腦後沒有用 `git clone` 而是複製資料夾」——此時優先改用 `git clone`（見 `docs/Operations_Guide.md` 第 3 章），不要重做下面的步驟。

本機資料夾原本不是 git repo，GitHub 上的 TripleTown 只有一次網頁上傳的舊 build（2026-07-02 的 `index.html` + `assets/`）。設定目標：**原始碼進版控，Pages 改由 Actions 從原始碼 build**。

**動手前先問使用者兩件事**（不要自行決定）：
- `art-reference/`（約 148MB 原版截圖與 PSD）要不要上傳？建議不上——不參與 build，且公開 repo 不宜放原版遊戲素材
- `src/picts/` 下有沒有不該在那的檔案？依 CLAUDE.md，該目錄只放程式實際 import 的 PNG（曾出現誤放的 `myLify.psd`）

**1. `.gitignore`**

```gitignore
node_modules/
dist/
release/
*.apk
*.exe
*.psd
.vscode/
# Android：產物與本機路徑
android/local.properties
android/.gradle/
android/build/
android/app/build/
android/app/src/main/assets/public/
android/capacitor-cordova-android-plugins/build/
# 依使用者決定是否加入：
# art-reference/
```

**2. `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false   # 後到的部署排隊，不取消進行中的（true 會讓被取消的那次在 commit 旁留下 ✗）

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      # devDependencies 有 electron，postinstall 會下載 ~100MB 執行檔；網頁版用不到
      ELECTRON_SKIP_BINARY_DOWNLOAD: '1'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**3. 接上既有歷史（不 force push）**

```bash
git init -b main
git remote add origin https://github.com/hedyhsu99/TripleTown.git
git fetch origin
git reset origin/main          # 只移 HEAD，不動工作目錄的檔案
git rm -r --cached assets index.html 2>/dev/null   # 舊的 build 產物（index.html 會在下一步以原始碼版本重新加入）
git add -A
git status                     # ← 把清單給使用者看，確認沒有該排除的檔案
```

確認後 commit、再確認一次後 push（同「每次部署」第 3、4 步）。

**4. 請使用者手動改 GitHub 設定**（Claude 做不到）：
Settings → Pages → Build and deployment → Source 改為 **GitHub Actions**。
沒改的話 Pages 仍從 main 根目錄直接發佈，會發出未 build 的 `index.html`（引用 `/src/main.js`）→ 白畫面。

改好後若第一次 run 已經跑過但沒部署，到 Actions 分頁對 "Deploy to GitHub Pages" 按 **Run workflow**（`workflow_dispatch` 就是為這個留的）。

---

## 收尾

- 打包完只回報產物路徑／網址、大小、時間，**不要**自動複製到其他地方、不要自動安裝
- 網頁版、APK、EXE 的遊戲進度各自獨立（各自的 localStorage），不會互通——使用者問起時說明
- 打包流程有變動時，同步更新 `CLAUDE.md` 與 `docs/Operations_Guide.md`
