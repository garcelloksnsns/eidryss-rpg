@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado. Instale a versao LTS em https://nodejs.org/
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
  echo O Eidryss requer Node.js 20 ou superior. Instale a versao LTS.
  pause
  exit /b 1
)
node run.js
pause
