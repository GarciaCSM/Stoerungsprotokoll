PowerShell scripts for ADB and local development

Files:
- `adb-reverse-watcher.ps1` — Watches for connected Android devices and automatically sets `adb reverse tcp:PORT tcp:PORT` for the configured ports.

How to run:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\powershell\adb-reverse-watcher.ps1
```

Configuration:
- Edit the `$ports` array at the top of `adb-reverse-watcher.ps1` to add/remove ports.

Notes:
- Device must be authorized (USB debugging allowed) for reverse rules to be set.
- The script runs until you stop it (Ctrl+C). You can add it to a startup task if desired.
