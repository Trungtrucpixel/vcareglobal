#!/bin/bash

# Manual Deploy Script - Chạy từng bước
# Sử dụng khi SSH chưa được thiết lập

set -e

VPS_IP="103.72.96.173"
VPS_PORT="24700"
VPS_USER="root"
APP_DIR="/var/www/phucanduong"

echo "🚀 Manual Deploy Script for Phúc An Dương"
echo "=========================================="

# Bước 1: Upload files
echo "📤 Bước 1: Upload files..."
echo "Chạy lệnh sau để upload files:"
echo ""
echo "rsync -avz -e \"ssh -p $VPS_PORT\" \\"
echo "    --exclude='.git' \\"
echo "    --exclude='node_modules' \\"
echo "    --exclude='.env' \\"
echo "    --exclude='*.log' \\"
echo "    --exclude='test-*.html' \\"
echo "    --exclude='.local' \\"
echo "    --exclude='.replit' \\"
echo "    --exclude='*.zip' \\"
echo "    ./ $VPS_USER@$VPS_IP:$APP_DIR/"
echo ""

read -p "Đã upload files chưa? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Vui lòng upload files trước khi tiếp tục"
    exit 1
fi

# Bước 2: Setup trên VPS
echo "🔧 Bước 2: Setup trên VPS..."
echo "Kết nối VPS và chạy các lệnh sau:"
echo ""
echo "ssh -p $VPS_PORT $VPS_USER@$VPS_IP"
echo "cd $APP_DIR"
echo ""
echo "# Cài đặt Node.js 18"
echo "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -"
echo "apt install -y nodejs"
echo ""
echo "# Cài đặt PM2"
echo "npm install -g pm2"
echo ""
echo "# Cài đặt dependencies"
echo "npm install --production"
echo ""
echo "# Tạo .env file"
echo "cp production.env .env"
echo "nano .env  # Chỉnh sửa thông tin database"
echo ""

read -p "Đã setup trên VPS chưa? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Vui lòng setup trên VPS trước khi tiếp tục"
    exit 1
fi

# Bước 3: Database setup
echo "🗄️ Bước 3: Database setup..."
echo "Trên VPS, chạy các lệnh sau:"
echo ""
echo "# Cài đặt PostgreSQL"
echo "apt install -y postgresql postgresql-contrib"
echo "systemctl start postgresql"
echo "systemctl enable postgresql"
echo ""
echo "# Tạo database"
echo "sudo -u postgres psql -c \"CREATE DATABASE phucanduong;\""
echo "sudo -u postgres psql -c \"CREATE USER phucanduong WITH PASSWORD 'your_password';\""
echo "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE phucanduong TO phucanduong;\""
echo ""

read -p "Đã setup database chưa? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Vui lòng setup database trước khi tiếp tục"
    exit 1
fi

# Bước 4: Start app
echo "🚀 Bước 4: Start application..."
echo "Trên VPS, chạy các lệnh sau:"
echo ""
echo "cd $APP_DIR"
echo "pm2 stop phucanduong 2>/dev/null || true"
echo "pm2 delete phucanduong 2>/dev/null || true"
echo "pm2 start server/index.ts --name phucanduong --interpreter tsx"
echo "pm2 save"
echo "pm2 startup"
echo ""

read -p "Đã start app chưa? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Vui lòng start app trước khi tiếp tục"
    exit 1
fi

# Bước 5: Test
echo "✅ Bước 5: Test application..."
echo "Kiểm tra app:"
echo ""
echo "# Kiểm tra PM2 status"
echo "pm2 status"
echo ""
echo "# Xem logs"
echo "pm2 logs phucanduong"
echo ""
echo "# Test web app"
echo "curl http://localhost:3000"
echo ""

echo "🎉 Deploy hoàn thành!"
echo "🌐 App should be running at: http://$VPS_IP:3000"
echo "📊 Monitor with: pm2 monit"

