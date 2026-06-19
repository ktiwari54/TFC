# Launch TFC website locally
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "  TFC Films - Tales From the Culture" -ForegroundColor Cyan
Write-Host "  Starting server at http://localhost:8080/" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "  Python not found. Install Python 3 from https://python.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Start-Process "http://localhost:8080/"
python serve.py