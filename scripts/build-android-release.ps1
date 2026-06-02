# build-android-release.ps1
#
# ndk-build (make-based) cannot handle paths with spaces.
# This script creates a directory junction at C:\StBuild (no spaces),
# builds the APK from there, then copies the output APK back.
#
# Run from the project root:  .\scripts\build-android-release.ps1

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$JunctionPath = "C:\StBuild"
$ApkOut = "$ProjectRoot\android\app\build\outputs\apk\release"

Write-Host "=== Android Release Build (Space-Path Workaround) ===" -ForegroundColor Cyan
Write-Host "Project : $ProjectRoot"
Write-Host "Junction: $JunctionPath"
Write-Host ""

# Remove old junction if it exists
if (Test-Path $JunctionPath) {
    Write-Host "Removing old junction..." -ForegroundColor Yellow
    Remove-Item $JunctionPath -Force -Recurse
}

# Create junction
Write-Host "Creating junction $JunctionPath -> $ProjectRoot ..." -ForegroundColor Yellow
New-Item -ItemType Junction -Path $JunctionPath -Value $ProjectRoot | Out-Null
Write-Host "Junction created." -ForegroundColor Green

# Run Gradle from junction path (no spaces!)
$AndroidDir = "$JunctionPath\android"
Write-Host ""
Write-Host "Starting Gradle assembleRelease from $AndroidDir ..." -ForegroundColor Cyan
Write-Host ""

Push-Location $AndroidDir
try {
    & ".\gradlew.bat" clean assembleRelease
    $ExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

Write-Host ""
if ($ExitCode -eq 0) {
    Write-Host "BUILD SUCCESSFUL" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK location:" -ForegroundColor Cyan
    Get-ChildItem "$ApkOut\*.apk" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  $_" -ForegroundColor White
    }
} else {
    Write-Host "BUILD FAILED (exit code $ExitCode)" -ForegroundColor Red
}

# Clean up junction
Write-Host ""
Write-Host "Cleaning up junction..." -ForegroundColor Yellow
Remove-Item $JunctionPath -Force -Recurse -ErrorAction SilentlyContinue
Write-Host "Done." -ForegroundColor Green
