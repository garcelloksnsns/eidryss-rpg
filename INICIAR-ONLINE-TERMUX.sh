#!/data/data/com.termux/files/usr/bin/bash
# Abre o Eidryss localmente e cria um link HTTPS temporário para amigos fora do Wi-Fi.
set -eu

cd "$(dirname "$0")"
EIDRYSS_PROJECT_DIR="$PWD"
. "./scripts/termux-persistence.sh"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale com: pkg install nodejs-lts -y"
  exit 1
fi
if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"; then
  echo "Use Node.js 20 ou superior. Reinstale com: pkg install nodejs-lts -y"
  exit 1
fi
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Para abrir o link online, instale uma única vez:"
  echo "  pkg update && pkg install cloudflared -y"
  echo "Depois execute este arquivo novamente."
  exit 1
fi

server_pid=""
cleanup() {
  if [ -n "$server_pid" ] && kill -0 "$server_pid" 2>/dev/null; then
    kill "$server_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Iniciando o Eidryss no celular servidor..."
node run.js &
server_pid="$!"

ready="0"
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if node -e "fetch('http://127.0.0.1:8000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" >/dev/null 2>&1; then
    ready="1"
    break
  fi
  sleep 1
done
if [ "$ready" != "1" ]; then
  echo "O servidor local não respondeu. Veja as mensagens acima."
  exit 1
fi

echo
echo "Criando um link HTTPS temporário..."
echo "Quando aparecer https://alguma-coisa.trycloudflare.com, envie esse link e o código da sala aos amigos."
echo "Para encerrar a sessão, pressione Ctrl+C. O banco continua salvo em data/."
echo
cloudflared tunnel --url http://127.0.0.1:8000
