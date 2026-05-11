@echo off
REM Mappt den Projektordner auf Laufwerk S: (kurzer Pfad ohne Leerzeichen).
REM Android NDK / ndk-build bricht oft ab unter "...\VS Code\..." – daher vor Gradle immer ausfuehren.
REM Nach Neustart oder wenn S: woanders hing: diese Datei erneut starten.

SETLOCAL ENABLEDELAYEDEXPANSION
SET "ROOT=%~dp0"
IF "%ROOT:~-1%"=="\" SET "ROOT=%ROOT:~0,-1%"

subst S: /d >nul 2>&1
subst S: "%ROOT%"
IF ERRORLEVEL 1 (
  echo Fehler: Konnte S: nicht setzen. Ist S: schon belegt? Schliesse Programme auf S: und versuche erneut.
  pause
  ENDLOCAL & EXIT /b 1
)

echo OK: S:\ zeigt jetzt auf:
echo    %ROOT%
echo.
echo Naechster Schritt:
echo    cd /d S:\android
echo    gradlew.bat assembleRelease
echo.
ENDLOCAL
