#!/bin/bash
# Script deploy PostgresStorage lên VPS
# Copy toàn bộ script này và paste vào VPS terminal

cd /root/PhucAnDuongCMS-3

echo "📦 Backup storage.ts cũ..."
cp server/storage.ts server/storage.ts.backup

echo "📝 Tạo file postgres-storage.ts..."
cat > server/postgres-storage.ts << 'POSTGRES_END'
CONTENT_HERE
POSTGRES_END

echo "🔄 Update storage.ts..."
cat > server/storage.ts << 'STORAGE_END'
export { PostgresStorage as storage } from "./postgres-storage";
export type { IStorage } from "./postgres-storage";
STORAGE_END

echo "🗄️ Push database schema..."
npm run db:push --force

echo "🔄 Restart PM2..."
pm2 restart phuan-app

echo "✅ Deploy hoàn tất!"
pm2 logs phuan-app --lines 30
