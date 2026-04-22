@echo off
REM Startet den lokalen Node-Server für das Stoerungsprotokoll-Projekt.
REM Dieses Skript soll von der Windows Aufgabenplanung ausgeführt werden.

SETLOCAL
cd /d "%~dp0"

REM Prüfen, ob ein Node-Installationspfad bekannt ist.
SET "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
IF NOT EXIST "%NODE_EXE%" SET "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
IF NOT EXIST "%NODE_EXE%" SET "NODE_EXE=node"

REM Log-Verzeichnis sicherstellen.
IF NOT EXIST "%~dp0logs" mkdir "%~dp0logs"

REM Server starten und stdout/stderr in die Logdatei schreiben.
"%NODE_EXE%" server.js >> "%~dp0logs\server.log" 2>&1