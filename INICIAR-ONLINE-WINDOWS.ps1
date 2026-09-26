$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js não foi encontrado. Instale a versão LTS em https://nodejs.org/'
  exit 1
}
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host 'Instale o Cloudflare Tunnel (cloudflared) e execute novamente.'
  Write-Host 'Exemplo: winget install --id Cloudflare.cloudflared'
  exit 1
}

Write-Host 'Iniciando o Eidryss e criando o link HTTPS temporário...'
$server = Start-Process -FilePath 'node' -ArgumentList 'run.js' -PassThru
try {
  Start-Sleep -Seconds 2
  & cloudflared tunnel --url http://127.0.0.1:8000
} finally {
  if (-not $server.HasExited) { Stop-Process -Id $server.Id -ErrorAction SilentlyContinue }
}
