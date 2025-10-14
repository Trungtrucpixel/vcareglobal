#!/bin/bash

# VCare Global - Simple Complete Backup
echo "🚀 VCare Global - Simple Complete Backup"
echo "======================================="

# Get current date
BACKUP_DATE=$(date +"%Y%m%d-%H%M%S")
BACKUP_NAME="vcare-global-simple-backup-${BACKUP_DATE}"

echo "📅 Date: $(date)"
echo "📁 Name: $BACKUP_NAME"
echo ""

# Create backup directory
mkdir -p backups

# Create complete backup excluding node_modules
echo "📦 Creating complete backup..."
tar -czf "backups/${BACKUP_NAME}.tar.gz" \
    --exclude='node_modules' \
    --exclude='.git/objects' \
    --exclude='backups' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    --exclude='*.tmp' \
    .

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "backups/${BACKUP_NAME}.tar.gz" | cut -f1)
    echo "✅ Backup completed successfully!"
    echo "📁 File: backups/${BACKUP_NAME}.tar.gz"
    echo "💾 Size: $BACKUP_SIZE"
    echo ""
    echo "🚀 To restore:"
    echo "   tar -xzf backups/${BACKUP_NAME}.tar.gz"
    echo "   npm install"
    echo "   npm run dev"
    echo ""
    echo "✨ Backup ready for deployment! ✨"
else
    echo "❌ Backup failed!"
    exit 1
fi

