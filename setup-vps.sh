#!/bin/bash
# Script chạy trên VPS để setup app
# Script này được gọi tự động từ deploy-to-vps.sh

set -e

APP_PATH="/root/PhucAnDuongCMS-3"

echo "📂 Di chuyển vào thư mục app..."
cd $APP_PATH

echo "📦 Cài đặt dependencies (nếu cần)..."
if [ ! -d "node_modules" ]; then
  npm install --production
else
  echo "   node_modules đã tồn tại, bỏ qua..."
fi

echo "🔍 Kiểm tra file .env..."
if [ ! -f ".env" ]; then
  echo "⚠️  CẢNH BÁO: File .env chưa tồn tại!"
  echo "   Tạo file .env với nội dung sau:"
  echo ""
  echo "DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/phuanduong_db"
  echo "SESSION_SECRET=$(openssl rand -hex 32)"
  echo "NODE_ENV=production"
  echo ""
  read -p "Nhấn Enter sau khi đã tạo file .env..."
else
  echo "✅ File .env đã tồn tại"
fi

echo "🗄️  Push database schema..."
npm run db:push --force || {
  echo "⚠️  Lỗi khi push database schema"
  echo "   Kiểm tra kết nối database trong file .env"
  exit 1
}

echo "🔄 Restart PM2..."
pm2 restart phuan-app || pm2 start dist/index.js --name phuan-app

echo "📊 Trạng thái PM2:"
pm2 list

echo ""
echo "✅ Setup hoàn tất!"
echo "📝 Xem logs: pm2 logs phuan-app"
echo "🌐 App đang chạy tại: http://103.72.96.173:5000"
