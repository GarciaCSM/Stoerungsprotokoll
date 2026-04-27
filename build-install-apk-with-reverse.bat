@echo off
REM Baut die Release-APK neu, installiert sie auf dem Tablet und richtet adb reverse ein.
SETLOCAL
cd /d "%~dp0"

REM Gradle-Wrapper prüfen
IF NOT EXIST "android\gradlew.bat" (
  echo Fehler: gradlew.bat nicht gefunden. Stelle sicher, dass du im Projektstamm bist.
  pause
  exit /b 1
)

echo Baue die Release-APK (kann einige Minuten dauern)...
cd android
call gradlew.bat assembleRelease
IF ERRORLEVEL 1 (
  echo Fehler beim Bauen der APK.
  pause
  exit /b 1
)
cd ..

SET "APK_PATH=android\app\build\outputs\apk\release\app-release.apk"
IF NOT EXIST "%APK_PATH%" (
  echo Fehler: APK nicht gefunden nach dem Build: %APK_PATH%
  pause
  exit /b 1
)

echo Installiere die frisch gebaute APK: %APK_PATH%
adb install -r "%APK_PATH%"
IF ERRORLEVEL 1 (
  echo Fehler beim Installieren der APK.
  pause
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

echo Drücke eine Taste zum Beenden.
pause
