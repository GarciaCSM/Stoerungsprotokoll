@echo off
REM Installiert die Release-APK und richtet adb reverse automatisch ein.
SETLOCAL
cd /d "%~dp0"

SET "APK_PATH=android\app\build\outputs\apk\release\app-release.apk"
IF NOT EXIST "%APK_PATH%" (
  echo Fehler: APK nicht gefunden: %APK_PATH%
  echo Bitte zuerst die APK bauen oder den Pfad in dieser Datei anpassen.
  pause
  exit /b 1
)

echo Installiere APK: %APK_PATH%
adb install -r "%APK_PATH%"
IF ERRORLEVEL 1 (
  echo Fehler beim Installieren der APK.
  exit /b 1
)
echo APK erfolgreich installiert.

echo Richte adb reverse Verbindungen ein...
adb reverse tcp:19000 tcp:19000
adb reverse tcp:19001 tcp:19001
adb reverse tcp:3001 tcp:3001
adb reverse tcp:3000 tcp:3000

echo Fertig. ADB reverse ist konfiguriert.
adb reverse --list

echo Druecke eine Taste zum Beenden.
pause
