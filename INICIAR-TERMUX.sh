#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale com: pkg install nodejs-lts -y"
  exit 1
fi
if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"; then
  echo "Use Node.js 20 ou superior. Reinstale com: pkg install nodejs-lts -y"
  exit 1
fi
node run.js
