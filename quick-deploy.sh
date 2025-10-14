#!/bin/bash

# Quick Deploy Script for Phúc An Dương
# Usage: ./quick-deploy.sh

set -e

# VPS Configuration
VPS_IP="103.72.96.173"
VPS_PORT="24700"
VPS_USER="root"
APP_DIR="/var/www/phucanduong"

echo "🚀 Quick Deploy to VPS: $VPS_IP:$VPS_PORT"

# Check if we can connect to VPS
echo "🔍 Testing connection..."
if ! ssh -p $VPS_PORT -o ConnectTimeout=10 -o BatchMode=yes $VPS_USER@$VPS_IP "echo 'Connected'"; then
    echo "❌ Cannot connect to VPS. Please check SSH key setup."
    echo "💡 Run: ssh-copy-id -p $VPS_PORT $VPS_USER@$VPS_IP"
    exit 1
fi

echo "✅ Connection successful"

# Create backup
echo "📦 Creating backup..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "
    if [ -d $APP_DIR ]; then
        mkdir -p /var/backups/phucanduong
        cp -r $APP_DIR /var/backups/phucanduong/backup-\$(date +%Y%m%d-%H%M%S)
        echo 'Backup created'
    fi
"

# Upload files
echo "📤 Uploading files..."
rsync -avz -e "ssh -p $VPS_PORT" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='test-*.html' \
    --exclude='.local' \
    --exclude='.replit' \
    --exclude='*.zip' \
    ./ $VPS_USER@$VPS_IP:$APP_DIR/

# Setup and start
echo "🔧 Setting up application..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "
    cd $APP_DIR
    
    # Install Node.js 18 if needed
    if ! command -v node &> /dev/null || [[ \$(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt install -y nodejs
    fi
    
    # Install PM2 if needed
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    # Install dependencies
    npm install --production
    
    # Create .env if not exists
    if [ ! -f .env ]; then
        cp production.env .env
        echo 'Environment file created'
    fi
    
    # Stop and restart app
    pm2 stop phucanduong 2>/dev/null || true
    pm2 delete phucanduong 2>/dev/null || true
    pm2 start server/index.ts --name phucanduong --interpreter tsx
    pm2 save
"

echo "✅ Deployment completed!"
echo "🌐 App should be running at: http://$VPS_IP:3000"
echo "📊 Check status: ssh -p $VPS_PORT $VPS_USER@$VPS_IP 'pm2 status'"

