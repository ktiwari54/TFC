# Register Windows Task Scheduler job for TFC daily backup (run as Administrator)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/register-daily-backup-task.ps1

$TaskName = 'TFC-Daily-Backup'
$BackupScript = Join-Path (Split-Path $PSScriptRoot -Parent) 'backup.ps1'

if (-not (Test-Path $BackupScript)) {
  Write-Error "backup.ps1 not found at $BackupScript"
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$BackupScript`""

$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Description 'Daily backup of TFC static site (HTML, CSS, JS, films)' | Out-Null

Write-Host "Registered scheduled task: $TaskName (daily at 02:00)" -ForegroundColor Green
Write-Host "Script: $BackupScript"