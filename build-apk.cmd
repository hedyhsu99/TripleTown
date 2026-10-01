@echo off
REM ---- One-click Android APK build ----
REM Portable JDK / Android SDK in d:\ClaudeLab\android-dev (no Android Studio needed)
REM Output: release\TripleTownCL-v1.0-debug.apk (與 Electron EXE 產出同目錄)

set JAVA_HOME=d:\ClaudeLab\android-dev\jdk-21.0.11+10
set PATH=%JAVA_HOME%\bin;%PATH%

pushd "%~dp0"

call npm run build
if errorlevel 1 popd & exit /b 1

call npx cap sync android
if errorlevel 1 popd & exit /b 1

pushd "%~dp0android"
call .\gradlew.bat assembleDebug
if errorlevel 1 popd & popd & exit /b 1
popd

if not exist "%~dp0release" mkdir "%~dp0release"
copy /y "%~dp0android\app\build\outputs\apk\debug\app-debug.apk" "%~dp0release\TripleTownCL-v1.0-debug.apk"
echo.
echo APK ready: release\TripleTownCL-v1.0-debug.apk
popd
