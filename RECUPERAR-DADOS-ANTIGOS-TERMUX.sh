#!/data/data/com.termux/files/usr/bin/bash
set -eu
TARGET="${EIDRYSS_DATA_DIR:-$HOME/.eidryss}"
mkdir -p "$TARGET"

echo "Procurando bancos antigos no seu Termux..."
mapfile -t CANDIDATES < <(find "$HOME" -maxdepth 6 -type f \( -name 'eidryss.json' -o -name 'germinal.json' \) ! -path "$TARGET/*" 2>/dev/null | sort -u)
if [ "${#CANDIDATES[@]}" -eq 0 ]; then
  echo "Nenhum banco antigo encontrado automaticamente."
  exit 1
fi

for i in "${!CANDIDATES[@]}"; do
  file="${CANDIDATES[$i]}"
  size=$(wc -c < "$file" 2>/dev/null || echo '?')
  echo "$((i+1))) $file  (${size} bytes)"
done

echo
printf "Digite o número do banco que deseja restaurar (ou 0 para cancelar): "
read -r CHOICE
[ "$CHOICE" = "0" ] && exit 0
case "$CHOICE" in (*[!0-9]*|'') echo "Escolha inválida."; exit 1;; esac
INDEX=$((CHOICE-1))
[ "$INDEX" -ge 0 ] && [ "$INDEX" -lt "${#CANDIDATES[@]}" ] || { echo "Escolha inválida."; exit 1; }
SOURCE="${CANDIDATES[$INDEX]}"
SOURCE_DIR="$(dirname "$SOURCE")"
STAMP="$(date +%Y%m%d-%H%M%S)"

[ -f "$TARGET/eidryss.json" ] && cp -p "$TARGET/eidryss.json" "$TARGET/eidryss.json.backup-$STAMP"
[ -f "$TARGET/server.key" ] && cp -p "$TARGET/server.key" "$TARGET/server.key.backup-$STAMP"
cp -p "$SOURCE" "$TARGET/eidryss.json"
if [ -s "$SOURCE_DIR/server.key" ]; then
  cp -p "$SOURCE_DIR/server.key" "$TARGET/server.key"
  echo "A chave do cofre correspondente também foi restaurada."
else
  echo "Aviso: esse banco não tinha server.key ao lado. Campanhas/contas funcionam, mas chaves de IA antigas podem precisar ser cadastradas novamente."
fi
chmod 600 "$TARGET/eidryss.json" "$TARGET/server.key" 2>/dev/null || true

echo "Restaurado em: $TARGET/eidryss.json"
echo "Agora inicie o Eidryss normalmente."
