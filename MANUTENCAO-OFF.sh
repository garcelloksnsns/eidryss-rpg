#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
node scripts/maintenance.js off
node scripts/maintenance.js bump
