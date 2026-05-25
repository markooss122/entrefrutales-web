<#
.SYNOPSIS
  Publica los cambios de Entrefrutales: add + commit + push a main.
  Vercel esta conectado al repo de GitHub y despliega solo al recibir el push.

.DESCRIPTION
  Driver de la skill deploy-entrefrutales. Pasos:
    1. Comprueba que estamos en un repo git y en la rama esperada (main).
    2. Muestra el estado y los archivos que se van a publicar.
    3. git add -A  (los .preview*.png y .claude local ya estan en .gitignore).
    4. git commit -m <mensaje>.
    5. git push origin main.
    6. Informa del commit y de que Vercel desplegara automaticamente.

  NO usa $ErrorActionPreference='Stop' porque git escribe progreso por stderr;
  en su lugar comprueba $LASTEXITCODE despues de cada paso.

.PARAMETER Message  Mensaje de commit (obligatorio).
.PARAMETER Branch   Rama destino (por defecto main).
.PARAMETER DryRun   Muestra que haria, sin commitear ni hacer push.

.EXAMPLE
  .\.claude\skills\deploy-entrefrutales\deploy.ps1 -Message "Actualizar textos del hero"

.EXAMPLE
  .\.claude\skills\deploy-entrefrutales\deploy.ps1 -Message "wip" -DryRun
#>
param(
  [Parameter(Mandatory = $true)][string]$Message,
  [string]$Branch = "main",
  [switch]$DryRun
)

# Raiz del repo = tres niveles por encima de esta carpeta de skill.
$repo = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
Set-Location $repo

function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# 1. ¿repo git?
git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) { Fail "No es un repositorio git: $repo" }

# 2. rama
$current = (git rev-parse --abbrev-ref HEAD).Trim()
if ($current -ne $Branch) {
  Write-Host "Aviso: estas en '$current', no en '$Branch'." -ForegroundColor Yellow
  Write-Host "Se hara push a '$current'. Cancela (Ctrl-C) si no es lo que quieres." -ForegroundColor Yellow
  $Branch = $current
}

# 3. ¿hay cambios?
$changes = git status --porcelain
if ([string]::IsNullOrWhiteSpace($changes)) {
  Write-Host "No hay cambios que publicar. Arbol limpio." -ForegroundColor Green
  exit 0
}

Write-Host "=== Cambios a publicar ===" -ForegroundColor Cyan
git status -s

if ($DryRun) {
  Write-Host ""
  Write-Host "[DryRun] Haria: git add -A; git commit -m `"$Message`"; git push origin $Branch" -ForegroundColor Yellow
  exit 0
}

# 4. add
git add -A
if ($LASTEXITCODE -ne 0) { Fail "git add fallo." }

# 5. commit
git commit -m $Message
if ($LASTEXITCODE -ne 0) { Fail "git commit fallo." }
$hash = (git rev-parse --short HEAD).Trim()

# 6. push
Write-Host ""
Write-Host "Haciendo push a origin/$Branch ..." -ForegroundColor Cyan
git push origin $Branch
if ($LASTEXITCODE -ne 0) { Fail "git push fallo (revisa credenciales o conexion). El commit $hash quedo en local." }

$remote = (git remote get-url origin).Trim()
Write-Host ""
Write-Host "OK: commit $hash publicado en $Branch." -ForegroundColor Green
Write-Host "GitHub: $remote" -ForegroundColor Green
Write-Host "Vercel desplegara automaticamente este push (revisa el dashboard de Vercel)." -ForegroundColor Green
