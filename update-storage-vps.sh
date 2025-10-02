#!/bin/bash
# Script để update storage từ MemStorage sang PostgresStorage
# Chạy script này trên VPS

set -e
cd /root/PhucAnDuongCMS-3

echo "📦 Step 1: Backup file storage.ts cũ..."
cp server/storage.ts server/storage.ts.mem.backup

echo "📝 Step 2: Update server/storage.ts để export PostgresStorage..."
cat > server/storage-new.ts << 'STORAGE_END'
export { PostgresStorage as storage } from "./postgres-storage";
export type { IStorage } from "./postgres-storage";
STORAGE_END

# Replace old storage export
tail -n +211 server/storage.ts > server/storage-interface.ts
cat server/storage-new.ts > server/storage.ts
cat server/storage-interface.ts >> server/storage.ts
rm server/storage-new.ts server/storage-interface.ts

echo "✅ Step 3: File storage.ts đã được update!"

echo "📤 Step 4: Download postgres-storage.ts..."
echo "   Copy nội dung từ Replit và paste vào file:"
echo "   nano server/postgres-storage.ts"
echo ""
read -p "Nhấn Enter sau khi đã tạo file postgres-storage.ts..."

echo "🗄️  Step 5: Push database schema..."
npm run db:push || npm run db:push -- --force

echo "🔄 Step 6: Restart PM2..."
pm2 restart phuan-app

echo "📊 Step 7: Check logs..."
pm2 logs phuan-app --lines 20

echo "✅ Deploy hoàn tất!"
