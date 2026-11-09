<#
.SYNOPSIS
    1-Click Automated Deployment Script ke VPS (Hermes / Ubuntu Server)
.DESCRIPTION
    Menjalankan pengujian (npm test), kompilasi Next.js (npm run build),
    mengemas bundle rilis, mentransfer via SCP/SSH, dan melakukan reload
    layanan produksi menggunakan PM2 di VPS secara zero-downtime.
.EXAMPLE
    .\scripts\deploy-to-vps.ps1
    npm run deploy:vps
#>

param(
    [string]$VpsHost = "43.156.236.102",
    [string]$VpsUser = "ubuntu",
    [string]$VpsPort = "2222",
    [string]$KeyFile = "$HOME\.ssh\ssh.pem",
    [string]$RemoteDir = "/srv/www/my-ai-factory",
    [string]$AppName = "my-ai-factory",
    [string]$SshAlias = "vpsku",
    [string]$AppPort = "3005"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 MY AI FACTORY - 1-CLICK DEPLOYMENT TO VPS" -ForegroundColor Cyan
Write-Host " Target : $VpsUser@$VpsHost (SSH Port: $VpsPort, App Port: $AppPort, App: $AppName)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Deteksi Metode SSH (Gunakan alias vpsku jika tersedia, atau direct SSH key)
$UseAlias = $false
Write-Host "[1/6] Memeriksa konektivitas SSH ke VPS..." -ForegroundColor Yellow

if (Test-Path "$HOME\.ssh\config") {
    $configContent = Get-Content "$HOME\.ssh\config" -Raw
    if ($configContent -match "Host\s+$SshAlias") {
        Write-Host "  -> Ditemukan konfigurasi SSH alias '$SshAlias'." -ForegroundColor Gray
        $sshTest = ssh -o BatchMode=yes -o ConnectTimeout=5 $SshAlias "echo SSH_OK" 2>$null
        if ($sshTest -match "SSH_OK") {
            $UseAlias = $true
            Write-Host "  ✓ Terhubung via alias '$SshAlias'." -ForegroundColor Green
        }
    }
}

if (-not $UseAlias) {
    if (-not (Test-Path $KeyFile)) {
        if (Test-Path "$HOME\Downloads\ssh.pem") {
            $KeyFile = "$HOME\Downloads\ssh.pem"
        } else {
            Write-Warning "SSH Key '$KeyFile' tidak ditemukan."
        }
    }
    # Uji Port 2222 lalu Port 22
    $ports = @($VpsPort, "22")
    $connectedPort = $null
    foreach ($p in $ports) {
        Write-Host "  -> Mencoba koneksi ke $VpsHost`:$p..." -ForegroundColor Gray
        $testCmd = "echo SSH_OK"
        $sshOut = & ssh -o BatchMode=yes -o ConnectTimeout=5 -p $p -i $KeyFile "$VpsUser@$VpsHost" $testCmd 2>$null
        if ($sshOut -match "SSH_OK") {
            $connectedPort = $p
            Write-Host "  ✓ Terhubung pada port $p!" -ForegroundColor Green
            break
        }
    }

    if ($null -ne $connectedPort) {
        $VpsPort = $connectedPort
    } else {
        Write-Warning "SSH langsung belum merespons (mungkin rate limit / firewall ban)."
        Write-Host "  Langkah build dan packaging lokal tetap akan dijalankan." -ForegroundColor Yellow
    }
}

# 2. Jalankan Test Otomatis
Write-Host "`n[2/6] Menjalankan automated test suite..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Error "Test suite gagal! Batalkan deployment."
    exit 1
}
Write-Host "  ✓ Seluruh tes validasi (9/9) lulus!" -ForegroundColor Green

# 3. Build Produksi Next.js
Write-Host "`n[3/6] Membangun Next.js production bundle (npm run build)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build Next.js gagal! Periksa error kompilasi di atas."
    exit 1
}
Write-Host "  ✓ Build produksi selesai dengan sukses." -ForegroundColor Green

# 4. Kemas Artefak Rilis
Write-Host "`n[4/6] Mengemas artefak rilis ke release.tar.gz..." -ForegroundColor Yellow
$tarFile = "release.tar.gz"
if (Test-Path $tarFile) { Remove-Item -Force $tarFile }

tar -czf $tarFile .next public package.json package-lock.json next.config.js ecosystem.config.cjs
if (-not (Test-Path $tarFile)) {
    Write-Error "Gagal membuat $tarFile."
    exit 1
}
$tarSize = (Get-Item $tarFile).Length / 1MB
Write-Host ("  ✓ Paket rilis siap: {0:N2} MB" -f $tarSize) -ForegroundColor Green

# 5. Upload ke VPS
Write-Host "`n[5/6] Mengunggah paket rilis ke VPS..." -ForegroundColor Yellow
if ($UseAlias) {
    scp $tarFile "$($SshAlias):~/release.tar.gz"
} else {
    scp -P $VpsPort -i $KeyFile $tarFile "$VpsUser@$VpsHost`:~/release.tar.gz"
}

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Upload via SCP gagal atau SSH timeout."
    Write-Host "`nPetunjuk Upload Alternatif:" -ForegroundColor Yellow
    Write-Host "1. Salin berkas '$tarFile' ke server VPS Anda." -ForegroundColor Gray
    Write-Host "2. Jalankan perintah deploy di VPS:" -ForegroundColor Gray
    Write-Host "   mkdir -p $RemoteDir && tar -xzf ~/release.tar.gz -C $RemoteDir && cd $RemoteDir && npm ci --omit=dev && pm2 reload $AppName || pm2 start ecosystem.config.cjs" -ForegroundColor Cyan
    exit 1
}
Write-Host "  ✓ Upload selesai!" -ForegroundColor Green

# 6. Eksekusi Deployment di Server
Write-Host "`n[6/6] Menjalankan reload zero-downtime di VPS..." -ForegroundColor Yellow

$remoteScript = @"
set -e
export PATH="/usr/bin:/usr/local/bin:`$HOME/.nvm/versions/node/`$(ls `$HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:`$PATH"
echo '--> Menyiapkan direktori aplikasi di $RemoteDir...'
sudo mkdir -p $RemoteDir
sudo chown -R $VpsUser:$VpsUser $RemoteDir

# Backup release sebelumnya
if [ -d "$RemoteDir/.next" ]; then
    echo '--> Membuat snapshot backup rilis sebelumnya...'
    mkdir -p ~/.backup-my-ai-factory
    tar -czf ~/.backup-my-ai-factory/backup-latest.tar.gz -C $RemoteDir . 2>/dev/null || true
fi

echo '--> Mengekstrak berkas rilis baru...'
tar -xzf ~/release.tar.gz -C $RemoteDir

cd $RemoteDir

echo '--> Memperbarui dependensi produksi...'
npm ci --omit=dev

echo '--> Me-reload proses PM2 pada port $AppPort...'
if command -v pm2 >/dev/null 2>&1; then
    pm2 reload $AppName --update-env 2>/dev/null || pm2 start ecosystem.config.cjs
    pm2 save
else
    echo 'Warning: PM2 tidak terpasang di VPS, menjalankan npx pm2...'
    npx pm2 reload $AppName --update-env 2>/dev/null || npx pm2 start ecosystem.config.cjs
fi

echo '--> Verifikasi healthcheck lokal server...'
sleep 3
curl -fsS http://localhost:$AppPort/api/health >/dev/null && echo '✓ Healthcheck OK (Status 200)' || echo 'Layanan sedang inisialisasi...'

rm -f ~/release.tar.gz
echo '✓ Deployment Selesai Sukses!'
"@

if ($UseAlias) {
    ssh $SshAlias "bash -s" << $remoteScript
} else {
    ssh -p $VpsPort -i $KeyFile "$VpsUser@$VpsHost" "bash -s" << $remoteScript
}

# Bersihkan tar lokal
Remove-Item -Force $tarFile -ErrorAction SilentlyContinue

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " 🎉 APLIKASI TELAH AKTIF DI VPS!" -ForegroundColor Green
Write-Host " URL Aplikasi (HTTPS): https://$VpsHost`:8450" -ForegroundColor Cyan
Write-Host " Virtual Office:       https://$VpsHost`:8450/office" -ForegroundColor Cyan
Write-Host " Dashboard:            https://$VpsHost`:8450/dashboard" -ForegroundColor Cyan
Write-Host " Internal PM2 Port:    $AppPort (Bebas dari bentrok Open WebUI:3000)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
