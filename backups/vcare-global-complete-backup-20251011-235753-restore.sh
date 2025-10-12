#!/bin/bash
# VCare Global - Quick Restore Script
# Generated: Sat Oct 11 23:57:59 +07 2025

echo "🚀 VCare Global - Quick Restore"
echo "================================"
echo ""

BACKUP_NAME="vcare-global-complete-backup-20251011-235753"
BACKUP_DIR="./backups"

# Check if backup files exist
if [ ! -f "$BACKUP_DIR/$BACKUP_NAME-complete-system.tar.gz" ]; then
    echo "❌ Backup file not found: $BACKUP_DIR/$BACKUP_NAME-complete-system.tar.gz"
    exit 1
fi

echo "📦 Extracting complete system backup..."
tar -xzf "$BACKUP_DIR/$BACKUP_NAME-complete-system.tar.gz"

echo "📦 Installing dependencies..."
npm install

echo "⚙️  Setting up environment..."
if [ ! -f ".env" ]; then
    cp .env.production.example .env
    echo "📝 Please edit .env file with your configuration"
fi

echo "✅ Restoration completed!"
echo "🚀 Run 'npm run dev' to start development server"
echo "🏭 Run 'npm run build && npm start' for production"
