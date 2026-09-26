#!/data/data/com.termux/files/usr/bin/bash
# Arquivos de campanha ficam fora da pasta do código para sobreviver a git pull, ZIPs e novas versões.
PROJECT_DIR="${EIDRYSS_PROJECT_DIR:-$PWD}"
PERSISTENT_DIR="${EIDRYSS_DATA_DIR:-$HOME/.eidryss}"
mkdir -p "$PERSISTENT_DIR"
chmod 700 "$PERSISTENT_DIR" 2>/dev/null || true

copy_if_missing() {
  local target="$1"
  shift
  [ -s "$target" ] && return 0
  for source in "$@"; do
    if [ -s "$source" ]; then
      cp -p "$source" "$target"
      chmod 600 "$target" 2>/dev/null || true
      echo "Dados antigos migrados: $source -> $target"
      return 0
    fi
  done
}

copy_if_missing "$PERSISTENT_DIR/eidryss.json" \
  "$PROJECT_DIR/data/eidryss.json" \
  "$PROJECT_DIR/data/germinal.json"
copy_if_missing "$PERSISTENT_DIR/server.key" "$PROJECT_DIR/data/server.key"
copy_if_missing "$PERSISTENT_DIR/system-status.json" "$PROJECT_DIR/data/system-status.json"

export EIDRYSS_DATA_DIR="$PERSISTENT_DIR"
export DATA_FILE="${DATA_FILE:-$PERSISTENT_DIR/eidryss.json}"
export VAULT_KEY_FILE="${VAULT_KEY_FILE:-$PERSISTENT_DIR/server.key}"
export SYSTEM_STATUS_FILE="${SYSTEM_STATUS_FILE:-$PERSISTENT_DIR/system-status.json}"

echo "Dados persistentes: $PERSISTENT_DIR"
