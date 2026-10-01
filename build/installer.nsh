; 自訂 NSIS 巨集（electron-builder 官方鉤子）
;
; 背景：更新安裝時 electron-builder 會先執行「舊版」的解除安裝程式，
; 但已散布出去的舊版 uninstaller 內建的程序偵測有誤判 bug，
; 會導致更新卡在「無法關閉」對話框（靜默模式則卡在無靜默處理的錯誤框）。
;
; 修法：
; 1. customInit：安裝前清掉舊的 Uninstall 登錄項，讓安裝程式視同全新安裝，
;    跳過執行舊版 uninstaller（同目錄整包覆蓋，本來就不需要先移除；
;    安裝完成後登錄項會重新寫入）。
; 2. customCheckAppRunning：取代內建的「找程序→關閉→再確認」誤判迴圈，
;    直接強制關閉遊戲（進度即時存檔，無資料損失）。

!macro customInit
  DeleteRegKey HKCU "${UNINSTALL_REGISTRY_KEY}"
  DeleteRegKey HKCU "${INSTALL_REGISTRY_KEY}"
!macroend

!macro customCheckAppRunning
  nsExec::Exec `"$SYSDIR\cmd.exe" /C taskkill /IM "${APP_EXECUTABLE_FILENAME}"`
  Sleep 1000
  nsExec::Exec `"$SYSDIR\cmd.exe" /C taskkill /F /IM "${APP_EXECUTABLE_FILENAME}"`
  Sleep 500
!macroend
