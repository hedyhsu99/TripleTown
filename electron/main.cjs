// Electron 主程序：載入 Vite build 出來的 dist/index.html
// 註：package.json 有 "type": "module"，主程序用 .cjs 副檔名維持 CommonJS
const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    // 遊戲是直式手機版面（max-width 420），視窗做成手機比例
    width: 470,
    height: 940,
    minWidth: 380,
    minHeight: 700,
    title: 'Triple Town CL',
    autoHideMenuBar: true,          // 隱藏選單列
    backgroundColor: '#2d1b00',
    webPreferences: {
      contextIsolation: true,       // 遊戲純前端，不需要 node 整合
    },
  })
  Menu.setApplicationMenu(null)     // 移除預設選單（File/Edit/...）
  win.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(createWindow)

// 所有視窗關閉即結束（Windows 慣例）
app.on('window-all-closed', () => app.quit())
