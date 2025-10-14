#!/bin/bash

# VCare Global - Complete System Backup Script
# Created: $(date)
# Description: Creates a comprehensive backup of the entire VCare Global system

echo "🚀 VCare Global - Complete System Backup"
echo "========================================"
echo ""

# Get current date and time for backup naming
BACKUP_DATE=$(date +"%Y%m%d-%H%M%S")
BACKUP_NAME="vcare-global-complete-backup-${BACKUP_DATE}"

# Create backup directory
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

echo "📅 Backup Date: $(date)"
echo "📁 Backup Name: $BACKUP_NAME"
echo "📂 Backup Directory: $BACKUP_DIR"
echo ""

# Function to get file size in human readable format
get_file_size() {
    if [ -f "$1" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            stat -f%z "$1" | numfmt --to=iec
        else
            # Linux
            stat -c%s "$1" | numfmt --to=iec
        fi
    else
        echo "0B"
    fi
}

# Function to create backup with progress
create_backup() {
    local source="$1"
    local backup_file="$2"
    local description="$3"
    
    echo "📦 Creating backup: $description"
    echo "   Source: $source"
    echo "   Target: $backup_file"
    
    # Create tar.gz backup with progress
    if tar -czf "$backup_file" "$source" 2>/dev/null; then
        local size=$(get_file_size "$backup_file")
        echo "   ✅ Success: $size"
    else
        echo "   ❌ Failed to create backup"
        return 1
    fi
    echo ""
}

# 1. Core System Files Backup
echo "🔧 1. Core System Files Backup"
echo "==============================="
create_backup \
    "vcare-complete.html" \
    "$BACKUP_DIR/${BACKUP_NAME}-core-files.tar.gz" \
    "Core HTML files (vcare-complete.html, admin-dashboard.html, user-dashboard.html)"

# 2. Server Code Backup
echo "🖥️  2. Server Code Backup"
echo "========================="
create_backup \
    "server/" \
    "$BACKUP_DIR/${BACKUP_NAME}-server-code.tar.gz" \
    "Server-side code (TypeScript, routes, middleware, database)"

# 3. Client Code Backup
echo "💻 3. Client Code Backup"
echo "========================"
create_backup \
    "client/" \
    "$BACKUP_DIR/${BACKUP_NAME}-client-code.tar.gz" \
    "Client-side code (React components, hooks, pages)"

# 4. Configuration Files Backup
echo "⚙️  4. Configuration Files Backup"
echo "=================================="
create_backup \
    "package.json package-lock.json tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js drizzle.config.ts components.json" \
    "$BACKUP_DIR/${BACKUP_NAME}-config-files.tar.gz" \
    "Configuration files (package.json, tsconfig, vite, tailwind, etc.)"

# 5. Environment and Deployment Files Backup
echo "🚀 5. Environment and Deployment Files Backup"
echo "============================================="
create_backup \
    ".env .env.production.example production.env deploy*.sh setup-vps.sh quick-deploy.sh manual-deploy.sh update-storage-vps.sh" \
    "$BACKUP_DIR/${BACKUP_NAME}-deployment-files.tar.gz" \
    "Environment variables and deployment scripts"

# 6. Documentation Backup
echo "📚 6. Documentation Backup"
echo "=========================="
create_backup \
    "*.md" \
    "$BACKUP_DIR/${BACKUP_NAME}-documentation.tar.gz" \
    "Documentation files (README, guides, features)"

# 7. Shared Schema Backup
echo "🗄️  7. Shared Schema Backup"
echo "==========================="
create_backup \
    "shared/" \
    "$BACKUP_DIR/${BACKUP_NAME}-shared-schema.tar.gz" \
    "Shared database schema and types"

# 8. Public Assets Backup
echo "🎨 8. Public Assets Backup"
echo "=========================="
create_backup \
    "public/" \
    "$BACKUP_DIR/${BACKUP_NAME}-public-assets.tar.gz" \
    "Public assets (favicon, images, static files)"

# 9. Attached Assets Backup
echo "📎 9. Attached Assets Backup"
echo "============================"
create_backup \
    "attached_assets/" \
    "$BACKUP_DIR/${BACKUP_NAME}-attached-assets.tar.gz" \
    "Attached assets (images, documents, resources)"

# 10. Test Files Backup
echo "🧪 10. Test Files Backup"
echo "========================"
create_backup \
    "test-*.html" \
    "$BACKUP_DIR/${BACKUP_NAME}-test-files.tar.gz" \
    "Test HTML files and development utilities"

# 11. Git Repository Backup
echo "📋 11. Git Repository Backup"
echo "============================"
create_backup \
    ".git/" \
    "$BACKUP_DIR/${BACKUP_NAME}-git-repository.tar.gz" \
    "Git repository with complete history"

# 12. Complete System Backup (Everything except node_modules)
echo "🌍 12. Complete System Backup"
echo "============================="
echo "📦 Creating complete system backup (excluding node_modules)..."
COMPLETE_BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}-complete-system.tar.gz"

# Create a temporary file list excluding node_modules and backup directory
find . -type f \
    ! -path "./node_modules/*" \
    ! -path "./.git/objects/*" \
    ! -path "./backups/*" \
    ! -name ".DS_Store" \
    ! -name "*.log" \
    ! -name "*.tmp" \
    > /tmp/vcare_backup_files.txt

if tar -czf "$COMPLETE_BACKUP_FILE" -T /tmp/vcare_backup_files.txt 2>/dev/null; then
    local size=$(get_file_size "$COMPLETE_BACKUP_FILE")
    echo "   ✅ Complete system backup: $size"
else
    echo "   ❌ Failed to create complete system backup"
fi

# Clean up temporary file
rm -f /tmp/vcare_backup_files.txt
echo ""

# 13. Create Backup Manifest
echo "📋 13. Creating Backup Manifest"
echo "==============================="
MANIFEST_FILE="$BACKUP_DIR/${BACKUP_NAME}-manifest.txt"
{
    echo "VCare Global - Complete System Backup Manifest"
    echo "=============================================="
    echo "Backup Date: $(date)"
    echo "Backup Name: $BACKUP_NAME"
    echo "System: $(uname -s) $(uname -m)"
    echo "Hostname: $(hostname)"
    echo "User: $(whoami)"
    echo ""
    echo "Backup Files:"
    echo "============="
    ls -lh "$BACKUP_DIR/${BACKUP_NAME}"-*.tar.gz | while read -r line; do
        echo "$line"
    done
    echo ""
    echo "File Count:"
    echo "==========="
    ls -1 "$BACKUP_DIR/${BACKUP_NAME}"-*.tar.gz | wc -l | xargs echo "Total backup files:"
    echo ""
    echo "Total Size:"
    echo "==========="
    du -sh "$BACKUP_DIR/${BACKUP_NAME}"-*.tar.gz | tail -1 | awk '{print "Total backup size: " $1}'
    echo ""
    echo "System Information:"
    echo "==================="
    echo "Node.js Version: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "NPM Version: $(npm --version 2>/dev/null || echo 'Not installed')"
    echo "Git Version: $(git --version 2>/dev/null || echo 'Not installed')"
    echo ""
    echo "Project Information:"
    echo "==================="
    if [ -f "package.json" ]; then
        echo "Project Name: $(grep '"name"' package.json | cut -d'"' -f4)"
        echo "Project Version: $(grep '"version"' package.json | cut -d'"' -f4)"
        echo "Node Version: $(grep '"engines"' package.json -A 1 | grep '"node"' | cut -d'"' -f4 || echo 'Not specified')"
    fi
    echo ""
    echo "Backup Contents:"
    echo "==============="
    echo "1. Core System Files - Main HTML files"
    echo "2. Server Code - Backend TypeScript code"
    echo "3. Client Code - Frontend React components"
    echo "4. Configuration Files - Package.json, configs"
    echo "5. Environment Files - .env and deployment scripts"
    echo "6. Documentation - README and guides"
    echo "7. Shared Schema - Database schema and types"
    echo "8. Public Assets - Static files and favicon"
    echo "9. Attached Assets - Images and resources"
    echo "10. Test Files - Development test files"
    echo "11. Git Repository - Complete version history"
    echo "12. Complete System - Everything except node_modules"
    echo ""
    echo "Restoration Instructions:"
    echo "========================"
    echo "1. Extract the complete system backup:"
    echo "   tar -xzf ${BACKUP_NAME}-complete-system.tar.gz"
    echo ""
    echo "2. Install dependencies:"
    echo "   npm install"
    echo ""
    echo "3. Set up environment variables:"
    echo "   cp .env.production.example .env"
    echo "   # Edit .env with your configuration"
    echo ""
    echo "4. Start the development server:"
    echo "   npm run dev"
    echo ""
    echo "5. Or start the production server:"
    echo "   npm run build"
    echo "   npm start"
    echo ""
    echo "Backup completed successfully! 🎉"
} > "$MANIFEST_FILE"

echo "   ✅ Manifest created: $MANIFEST_FILE"
echo ""

# 14. Create Backup Summary
echo "📊 14. Backup Summary"
echo "====================="
TOTAL_FILES=$(ls -1 "$BACKUP_DIR/${BACKUP_NAME}"-*.tar.gz | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR/${BACKUP_NAME}"-*.tar.gz | tail -1 | awk '{print $1}')

echo "📈 Backup Statistics:"
echo "   • Total backup files: $TOTAL_FILES"
echo "   • Total backup size: $TOTAL_SIZE"
echo "   • Backup location: $BACKUP_DIR"
echo "   • Manifest file: $MANIFEST_FILE"
echo ""

# 15. Create Quick Restore Script
echo "🔧 15. Creating Quick Restore Script"
echo "===================================="
RESTORE_SCRIPT="$BACKUP_DIR/${BACKUP_NAME}-restore.sh"
{
    echo "#!/bin/bash"
    echo "# VCare Global - Quick Restore Script"
    echo "# Generated: $(date)"
    echo ""
    echo "echo \"🚀 VCare Global - Quick Restore\""
    echo "echo \"================================\""
    echo "echo \"\""
    echo ""
    echo "BACKUP_NAME=\"$BACKUP_NAME\""
    echo "BACKUP_DIR=\"./backups\""
    echo ""
    echo "# Check if backup files exist"
    echo "if [ ! -f \"\$BACKUP_DIR/\$BACKUP_NAME-complete-system.tar.gz\" ]; then"
    echo "    echo \"❌ Backup file not found: \$BACKUP_DIR/\$BACKUP_NAME-complete-system.tar.gz\""
    echo "    exit 1"
    echo "fi"
    echo ""
    echo "echo \"📦 Extracting complete system backup...\""
    echo "tar -xzf \"\$BACKUP_DIR/\$BACKUP_NAME-complete-system.tar.gz\""
    echo ""
    echo "echo \"📦 Installing dependencies...\""
    echo "npm install"
    echo ""
    echo "echo \"⚙️  Setting up environment...\""
    echo "if [ ! -f \".env\" ]; then"
    echo "    cp .env.production.example .env"
    echo "    echo \"📝 Please edit .env file with your configuration\""
    echo "fi"
    echo ""
    echo "echo \"✅ Restoration completed!\""
    echo "echo \"🚀 Run 'npm run dev' to start development server\""
    echo "echo \"🏭 Run 'npm run build && npm start' for production\""
} > "$RESTORE_SCRIPT"

chmod +x "$RESTORE_SCRIPT"
echo "   ✅ Restore script created: $RESTORE_SCRIPT"
echo ""

# Final Summary
echo "🎉 BACKUP COMPLETED SUCCESSFULLY!"
echo "================================="
echo ""
echo "📁 Backup Location: $BACKUP_DIR"
echo "📋 Total Files: $TOTAL_FILES"
echo "💾 Total Size: $TOTAL_SIZE"
echo "📄 Manifest: $MANIFEST_FILE"
echo "🔧 Restore Script: $RESTORE_SCRIPT"
echo ""
echo "🚀 To restore this backup:"
echo "   1. cd to target directory"
echo "   2. Run: ./$RESTORE_SCRIPT"
echo "   3. Or manually extract: tar -xzf $COMPLETE_BACKUP_FILE"
echo ""
echo "✨ VCare Global backup is ready for deployment! ✨"

