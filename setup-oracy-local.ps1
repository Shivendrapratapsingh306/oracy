$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "`n=== Oracy local setup ===" -ForegroundColor Cyan

foreach ($cmd in @('python', 'node', 'npm', 'docker')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        throw "$cmd is not installed or not on PATH. Install it, reopen PowerShell, and rerun this script. Docker Desktop: https://docs.docker.com/desktop/setup/install/windows-install/"
    }
}

if (-not (Test-Path "$Root\.env")) {
    Copy-Item "$Root\.env.example" "$Root\.env"
    Write-Host "Created root .env"
}
if (-not (Test-Path "$Root\backend\.env")) {
    Copy-Item "$Root\.env.example" "$Root\backend\.env"
    Write-Host "Created backend\.env"
}

# Ensure backend gets a fresh local-only signing secret, without overwriting it on reruns.
$BackendEnv = "$Root\backend\.env"
$EnvText = Get-Content $BackendEnv -Raw
if ($EnvText -match '(?m)^AUTH_SECRET=replace-with-a-random-secret-at-least-32-characters-long\s*$' -or $EnvText -notmatch '(?m)^AUTH_SECRET=') {
    $Secret = python -c "import secrets; print(secrets.token_hex(32))"
    if ($EnvText -match '(?m)^AUTH_SECRET=.*$') {
        $EnvText = [regex]::Replace($EnvText, '(?m)^AUTH_SECRET=.*$', "AUTH_SECRET=$Secret")
    } else {
        $EnvText += "`r`nAUTH_SECRET=$Secret`r`n"
    }
    Set-Content -Path $BackendEnv -Value $EnvText -NoNewline
    Write-Host "Generated local AUTH_SECRET in backend\.env"
}

Write-Host "`nStarting PostgreSQL container..." -ForegroundColor Cyan
docker compose up -d postgres
docker compose ps

Write-Host "`nSetting up backend Python environment..." -ForegroundColor Cyan
Set-Location "$Root\backend"
if (-not (Test-Path '.venv\Scripts\python.exe')) {
    python -m venv .venv
}
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt

Write-Host "`nChecking database readiness..." -ForegroundColor Cyan
$Ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        docker compose -f "$Root\docker-compose.yml" exec -T postgres pg_isready -U oracy -d oracy | Out-Null
        if ($LASTEXITCODE -eq 0) { $Ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (-not $Ready) { throw "PostgreSQL did not become ready. Run: docker compose logs postgres" }

Write-Host "`nCreating database tables..." -ForegroundColor Cyan
& .\.venv\Scripts\python.exe -m app.scripts.init_db
Write-Host "`nRunning backend tests..." -ForegroundColor Cyan
& .\.venv\Scripts\python.exe -m pytest -q
if ($LASTEXITCODE -ne 0) { throw "Backend tests failed; review the output above." }

Write-Host "`nInstalling frontend dependencies..." -ForegroundColor Cyan
Set-Location "$Root\frontend"
npm ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm ci failed; check internet access and npm output." }
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "Frontend typecheck failed; review the output above." }

Write-Host "`nSetup checks passed. Starting backend and frontend in separate PowerShell windows..." -ForegroundColor Green
$BackendCmd = "Set-Location '$Root\backend'; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
$FrontendCmd = "Set-Location '$Root\frontend'; npm run dev"
Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $BackendCmd
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $FrontendCmd

Write-Host "`nBackend docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "Frontend:     http://localhost:3000" -ForegroundColor Green
Write-Host "PostgreSQL:   localhost:5432" -ForegroundColor Green
