# TFC local daily backup — run manually or via Windows Task Scheduler
# Usage: .\backup.ps1
# Schedule: see RESTORE.md § "Enable daily backups on Windows"

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Stamp = Get-Date -Format 'yyyy-MM-dd'
$BackupRoot = Join-Path $Root 'backups'
$Dest = Join-Path $BackupRoot $Stamp
$Archive = Join-Path $BackupRoot "tfc-backup-$Stamp.zip"

New-Item -ItemType Directory -Force -Path $Dest | Out-Null

$Paths = @(
  'index.html', 'serve.py', 'vercel.json', 'start.ps1', 'start.bat', 'RESTORE.md',
  'about-us.html', 'blogs.html', 'contact.html', 'crew.html', 'faqs.html',
  'films.html', 'films-search.html', 'pricing.html', 'workshop.html',
  'tales-from-the-culture.html',
  'js', 'css', 'films'
)

foreach ($rel in $Paths) {
  $src = Join-Path $Root $rel
  if (-not (Test-Path $src)) { continue }
  $target = Join-Path $Dest $rel
  if (Test-Path $src -PathType Container) {
    Copy-Item -Path $src -Destination $target -Recurse -Force
  } else {
    $parent = Split-Path $target -Parent
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    Copy-Item -Path $src -Destination $target -Force
  }
}

$manifestPath = Join-Path $Dest 'backup-manifest.json'
Push-Location $Root
node scripts/build-backup-manifest.js $manifestPath
Pop-Location

if (Test-Path $Archive) { Remove-Item $Archive -Force }
Compress-Archive -Path (Join-Path $Dest '*') -DestinationPath $Archive -Force

# Keep last 14 daily folders
Get-ChildItem $BackupRoot -Directory |
  Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' } |
  Sort-Object Name -Descending |
  Select-Object -Skip 14 |
  ForEach-Object { Remove-Item $_.FullName -Recurse -Force }

Write-Host ""
Write-Host "  TFC backup complete" -ForegroundColor Green
Write-Host "  Folder: $Dest" -ForegroundColor Cyan
Write-Host "  Archive: $Archive" -ForegroundColor Cyan
Write-Host ""