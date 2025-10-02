#!/bin/bash
# Script deploy từ máy local lên VPS
# Chạy script này trên máy tính của bạn (không phải trên VPS)

set -e

echo "🚀 Bắt đầu deploy lên VPS..."

VPS_HOST="103.72.96.173"
VPS_PORT="24700"
VPS_USER="root"
VPS_PATH="/root/PhucAnDuongCMS-3"

echo "📦 Đang build code..."
npm run build

echo "📤 Upload code lên VPS..."
rsync -avz --delete -e "ssh -p $VPS_PORT" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  ./dist/ $VPS_USER@$VPS_HOST:$VPS_PATH/dist/

echo "📤 Upload package files..."
scp -P $VPS_PORT package.json package-lock.json $VPS_USER@$VPS_HOST:$VPS_PATH/

echo "🔧 Chạy setup trên VPS..."
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "bash -s" < setup-vps.sh

echo "✅ Deploy hoàn tất!"
echo "🌐 Truy cập: http://$VPS_HOST:5000"
