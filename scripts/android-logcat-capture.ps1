# Vollständiges Android-Logcat mitschreiben (Release/Debug), bis Strg+C.
# Ausgabe: %TEMP%\stoerungsprotokoll-logcat-<Zeitstempel>.txt
param(
    [switch]$NoClear
)

$adb = if (Test-Path "C:\platform-tools\adb.exe") { "C:\platform-tools\adb.exe" } else { "adb" }

Write-Host "Geräte:" -ForegroundColor Cyan
& $adb devices
Write-Host ""

if (-not $NoClear) {
    Write-Host "Logcat-Puffer wird geleert (--NoClear zum Überspringen)." -ForegroundColor Yellow
    & $adb logcat -c | Out-Null
}

$out = Join-Path $env:TEMP "stoerungsprotokoll-logcat-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
Write-Host "Schreibt nach: $out" -ForegroundColor Green
Write-Host "Tablet: Problem reproduzieren. Dann hier Strg+C drücken." -ForegroundColor Yellow
Write-Host ""

try {
    & $adb logcat -v threadtime 2>&1 | Tee-Object -FilePath $out
}
finally {
    Write-Host ""
    Write-Host "Datei: $out" -ForegroundColor Green
    Write-Host "In Datei suchen nach: FATAL EXCEPTION, AndroidRuntime, SIGSEGV, stoerungsprotokoll, Low memory, ANR" -ForegroundColor Cyan
}
