# run.ps1

# 1. Proje dizinine geç
Set-Location -Path $PSScriptRoot

# 2. Server'ı arka planda başlat
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.js"

# 3. index.html'yi varsayılan tarayıcıda aç
Start-Process "$PSScriptRoot\index.html"

Write-Host "🌍 Server başlatıldı ve index.html açıldı!" -ForegroundColor Green
