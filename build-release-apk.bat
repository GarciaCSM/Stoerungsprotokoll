@echo off
REM SUBST S: auf Projekt, dann Release-APK bauen (fuer Pfade mit Leerzeichen / NDK).
SETLOCAL
cd /d "%~dp0"
call "%~dp0map-projekt-als-s.bat"
IF ERRORLEVEL 1 GOTO :end

cd /d S:\android
call gradlew.bat assembleRelease
IF ERRORLEVEL 1 (
  echo APK-Build fehlgeschlagen.
  pause
  GOTO :end
)

echo Fertig. APK: S:\android\app\build\outputs\apk\release\app-release.apk
pause
:end
ENDLOCAL
