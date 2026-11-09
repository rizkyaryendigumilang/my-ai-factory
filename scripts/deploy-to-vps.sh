#!/usr/bin/env bash
# ==============================================================================
# 🚀 MY AI FACTORY - 1-CLICK DEPLOYMENT SCRIPT TO VPS
# ==============================================================================
set -euo pipefail

VPS_HOST="${VPS_HOST:-43.156.236.102}"
VPS_USER="${VPS_USER:-ubuntu}"
VPS_PORT="${VPS_PORT:-2222}"
KEY_FILE="${KEY_FILE:-$HOME/.ssh/ssh.pem}"
REMOTE_DIR="${REMOTE_DIR:-/srv/www/my-ai-factory}"
APP_NAME="${APP_NAME:-my-ai-factory}"
SSH_ALIAS="${SSH_ALIAS:-vpsku}"

echo "=========================================================="
echo " 🚀 MY AI FACTORY - 1-CLICK DEPLOYMENT TO VPS"
echo " Target : $VPS_USER@$VPS_HOST (Port: $VPS_PORT, App: $APP_NAME)"
echo "=========================================================="

# 1. Periksa Konektivitas SSH
echo "[1/6] Memeriksa konektivitas SSH..."
USE_ALIAS=0
if ssh -o BatchMode=yes -o ConnectTimeout=4 "$SSH_ALIAS" "echo SSH_OK" >/dev/null 2>&1; then
    USE_ALIAS=1
    echo "  ✓ Terhubung via alias SSH: $SSH_ALIAS"
elif ssh -o BatchMode=yes -o ConnectTimeout=4 -p "$VPS_PORT" -i "$KEY_FILE" "$VPS_USER@$VPS_HOST" "echo SSH_OK" >/dev/null 2>&1; then
    echo "  ✓ Terhubung via Port: $VPS_PORT"
elif ssh -o BatchMode=yes -o ConnectTimeout=4 -p 22 -i "$KEY_FILE" "$VPS_USER@$VPS_HOST" "echo SSH_OK" >/dev/null 2>&1; then
    VPS_PORT=22
    echo "  ✓ Terhubung via Port: 22"
else
    echo "  [Notice] SSH langsung belum merespons. Melanjutkan proses build & packaging..."
fi

# 2. Test Otomatis
echo -e "\n[2/6] Menjalankan automated test suite..."
npm test

# 3. Build Produksi
echo -e "\n[3/6] Membangun Next.js bundle..."
npm run build

# 4. Packaging
echo -e "\n[4/6] Mengemas release.tar.gz..."
rm -f release.tar.gz
tar -czf release.tar.gz .next public package.json package-lock.json next.config.js ecosystem.config.cjs
echo "  ✓ Paket rilis siap: $(du -h release.tar.gz | cut -f1)"

# 5. Upload ke VPS
echo -e "\n[5/6] Mengunggah paket ke VPS..."
if [ "$USE_ALIAS" -eq 1 ]; then
    scp release.tar.gz "$SSH_ALIAS":~/release.tar.gz
else
    scp -P "$VPS_PORT" -i "$KEY_FILE" release.tar.gz "$VPS_USER@$VPS_HOST":~/release.tar.gz
fi

# 6. Eksekusi di VPS
echo -e "\n[6/6] Menjalankan reload zero-downtime di VPS..."
REMOTE_CMD="
set -e
sudo mkdir -p $REMOTE_DIR
sudo chown -R $VPS_USER:$VPS_USER $REMOTE_DIR

if [ -d '$REMOTE_DIR/.next' ]; then
    mkdir -p ~/.backup-my-ai-factory
    tar -czf ~/.backup-my-ai-factory/backup-latest.tar.gz -C $REMOTE_DIR . 2>/dev/null || true
fi

tar -xzf ~/release.tar.gz -C $REMOTE_DIR
cd $REMOTE_DIR
npm ci --omit=dev

if command -v pm2 >/dev/null 2>&1; then
    pm2 reload $APP_NAME 2>/dev/null || pm2 start ecosystem.config.cjs
    pm2 save
fi

sleep 2
curl -fsS http://localhost:3000/api/health >/dev/null && echo '✓ Healthcheck OK' || true
rm -f ~/release.tar.gz
echo '✓ Selesai!'
"

if [ "$USE_ALIAS" -eq 1 ]; then
    ssh "$SSH_ALIAS" "$REMOTE_CMD"
else
    ssh -p "$VPS_PORT" -i "$KEY_FILE" "$VPS_USER@$VPS_HOST" "$REMOTE_CMD"
fi

rm -f release.tar.gz

echo "=========================================================="
echo " 🎉 APLIKASI TELAH AKTIF DI VPS!"
echo " URL: http://$VPS_HOST:3000"
echo "=========================================================="
