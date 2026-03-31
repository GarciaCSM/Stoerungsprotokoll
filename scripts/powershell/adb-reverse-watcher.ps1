<#
scripts/powershell/adb-reverse-watcher.ps1
Auto-sets adb reverse rules for connected, authorized Android devices.
Usage:
  powershell -ExecutionPolicy Bypass -File .\scripts\powershell\adb-reverse-watcher.ps1

Configure ports below (e.g. 3001) and the script will set reverse rules when a device becomes connected.
#>

# Ports to forward from device -> host
$ports = @(3001)

function Get-ConnectedDevices {
  $out = & adb devices 2>$null
  if (-not $out) { return @() }
  $lines = $out -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith("List of devices") }
  $devices = @()
  foreach ($ln in $lines) {
    $parts = $ln -split "\s+"
    if ($parts.Length -ge 2) {
      $devices += [PSCustomObject]@{ serial = $parts[0]; state = $parts[1] }
    }
  }
  return $devices
}

Write-Host ('ADB reverse watcher started. Ports: {0}' -f ($ports -join ', ')) -ForegroundColor Cyan
$known = @{}

while ($true) {
    try {
        $devices = Get-ConnectedDevices
        foreach ($d in $devices) {
            if ($d.state -eq 'device') {
                if (-not $known.ContainsKey($d.serial)) {
                    Write-Host ("Device connected: {0} - setting reverse for ports: {1}" -f $d.serial, ($ports -join ', ')) -ForegroundColor Green
                    foreach ($p in $ports) {
                        $list = & adb -s $d.serial reverse --list 2>$null
                        if ($list -notmatch ("tcp:{0}" -f $p)) {
                            & adb -s $d.serial reverse ("tcp:{0}" -f $p) ("tcp:{0}" -f $p)
                            Write-Host ("  -> adb -s {0} reverse tcp:{1} tcp:{1}" -f $d.serial, $p)
                        } else {
                            Write-Host ("  -> reverse already exists for tcp:{0}" -f $p)
                        }
                    }
                    $known[$d.serial] = $true
                }
            } elseif ($d.state -eq 'unauthorized') {
                Write-Host ("Device {0} is unauthorized. Please confirm USB debugging on device." -f $d.serial) -ForegroundColor Yellow
            }
        }

        # remove disconnected devices from known
        $currentSerials = $devices | ForEach-Object { $_.serial }
        foreach ($k in $known.Keys) {
            if ($currentSerials -notcontains $k) {
                Write-Host ("Device disconnected: {0}" -f $k) -ForegroundColor Gray
                $known.Remove($k) | Out-Null
            }
        }
    } catch {
        Write-Warning ("Error: {0}" -f $_)
    }
    Start-Sleep -Seconds 3
}
