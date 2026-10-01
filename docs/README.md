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

---

## 目錄結構

```
docs/
├── frd/
│   └── FRD_GameRules.md
├── srd/
│   └── SRD_System_Architecture.md
├── Developer_Guideline.md
└── Operations_Guide.md
```

---

## 修訂歷史

| 日期 | 版本 | 變更說明 |
|---|---|---|
| 2026-07-19 | 1.0 | 初始建立；FRD_GameRules 由 docs/ 根目錄移入 frd/ 子目錄以符合 AISDLC 目錄慣例 |
| 2026-10-01 | 1.1 | 原始碼納入 git／GitHub，網頁版改由 GitHub Actions 部署至 GitHub Pages；更新維運手冊（部署、備份還原、故障排除）、開發指引第 3 章、SRD 第 8／9 章 |
