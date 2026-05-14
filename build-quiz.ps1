# build-quiz.ps1
# รัน: .\build-quiz.ps1  (ใน PowerShell ที่ root folder)

Write-Host "Building quiz system..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\quiz-system"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed!" -ForegroundColor Red; exit 1 }

Write-Host "Copying to quiz/ folder..." -ForegroundColor Cyan
$dst = "$PSScriptRoot\quiz"
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
Copy-Item "$PSScriptRoot\quiz-system\dist" $dst -Recurse

Set-Location $PSScriptRoot
Write-Host "Done! Open index.html with Live Server." -ForegroundColor Green
