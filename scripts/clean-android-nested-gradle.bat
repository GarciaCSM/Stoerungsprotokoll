@echo off
REM Entfernt android\.gradle und android\build unter node_modules (Expo / RN).
REM Wird oft angelegt, wenn einzelne Pakete in Android Studio geoeffnet wurden —
REM dann passt der Cache (z. B. Gradle 8.x) nicht zum Projekt-Wrapper (z. B. 7.5.1)
REM und der Build bricht mit z. B. packageReleaseResources: "!directory.isDirectory" ab.

SETLOCAL
cd /d "%~dp0\.."
echo Projekt: %CD%
echo.

for /d %%D in (node_modules\*) do (
  if exist "%%D\android\.gradle" (
    echo Loesche %%D\android\.gradle
    rmdir /s /q "%%D\android\.gradle"
  )
  if exist "%%D\android\build" (
    echo Loesche %%D\android\build
    rmdir /s /q "%%D\android\build"
  )
)

echo.
echo Optional: Root-Android-Build-Caches (android\.gradle, android\build, app\build)?
echo Die werden beim naechsten gradlew neu erzeugt.
if exist "android\.gradle" rmdir /s /q "android\.gradle"
if exist "android\build" rmdir /s /q "android\build"
if exist "android\app\build" rmdir /s /q "android\app\build"

echo.
echo Fertig. Danach: cd android ^& gradlew.bat clean assembleRelease
ENDLOCAL
