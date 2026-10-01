對 JournalCL 後端程式碼進行安全性審查，找出潛在漏洞。

## 操作步驟

**第一步：讀取所有後端程式碼**

閱讀以下檔案：
- `src/BackEnd/Controllers/Controllers.cs`
- `src/BackEnd/Repositories/Repositories.cs`
- `src/BackEnd/Repositories/AuthRepository.cs`
- `src/BackEnd/Repositories/JournalRepository.cs`
- `src/BackEnd/appsettings.json`
- `src/BackEnd/Program.cs`

**第二步：逐項檢查以下安全議題**

### SQL Injection
- 搜尋所有 `CommandText` 賦值，確認是否有字串拼接（`+`、`$"...{variable}..."`）
- 所有外部輸入必須透過 `cmd.Parameters.AddWithValue` 傳入
- 回報每一處不安全的 SQL 建構位置（檔案名稱 + 行號）

### 密碼安全
- 確認 `[user]` 資料表的密碼是否仍為明文儲存
- 確認 change-password 端點是否有做 hash
- 確認 login 是否有 hash 比對邏輯或仍為明文比對

### JWT 安全
- 確認 `appsettings.json` 中的 JWT Key 長度是否足夠（建議 64 字元以上）
- 確認 Key 是否有硬碼在程式裡（應只從 Configuration 讀取）
- 確認 Token 驗證參數：ValidateIssuer、ValidateAudience、ValidateLifetime 是否都為 true

### 授權檢查
- 列出所有 Controller Action，確認是否都掛 `[Authorize]`
- 確認 Admin 端點是否有額外的 `isAdmin` 檢查
- 確認資料查詢是否都有 `WHERE userid = ?`（防止越權存取他人資料）

### 前端安全
- 閱讀 `src/FrontEnd/app.js`，確認 Token 儲存方式（localStorage 有 XSS 風險，記錄但不強制修改）
- 確認是否有在前端直接拼接 SQL 或敏感操作

**第三步：產出審查報告**

以優先序分級輸出：

#### 🔴 Critical（立即修復）
- 問題描述
- 所在位置（檔案:行號）
- 修復建議

#### 🟡 Important（近期處理）
- 問題描述
- 所在位置
- 修復建議

#### 🟢 Nice-to-have（未來改善）
- 問題描述
- 改善方向

**第四步：提供修復選項**

詢問使用者是否要立即修復 Critical 項目。
