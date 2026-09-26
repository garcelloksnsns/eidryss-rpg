#!/data/data/com.termux/files/usr/bin/bash
set -eu
cd "$(dirname "$0")/.."
mkdir -p .signing
OUT=".signing/eidryss-release.jks"
if [ -f "$OUT" ]; then
  echo "A chave já existe em $OUT. Não vou sobrescrever."
  exit 1
fi
if ! command -v keytool >/dev/null 2>&1; then
  echo "Instale o Java no Termux primeiro: pkg install openjdk-21 -y"
  exit 1
fi
printf 'Senha da chave (guarde bem): '
stty -echo; read -r STOREPASS; stty echo; echo
if [ ${#STOREPASS} -lt 8 ]; then echo 'Use pelo menos 8 caracteres.'; exit 1; fi
keytool -genkeypair -v -keystore "$OUT" -alias eidryss -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$STOREPASS" -keypass "$STOREPASS" -dname "CN=Eidryss Android, O=Eidryss, C=BR"
echo
echo "Criado: $OUT"
echo "NUNCA envie esse arquivo em chat público nem faça commit dele."
echo "Para o GitHub Secret ANDROID_KEYSTORE_BASE64, execute:"
echo "  base64 -w 0 $OUT"
echo "Alias: eidryss"
