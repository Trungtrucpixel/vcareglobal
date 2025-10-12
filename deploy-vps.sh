#!/bin/bash

# Deployment script for PhucAnDuongCMS-3 to VPS
# VPS: Ubuntu 22.04 at 103.72.96.173

set -e

echo "🚀 Starting deployment to VPS..."

# Configuration
VPS_USER="root"
VPS_HOST="103.72.96.173"
VPS_PORT="22"
APP_DIR="/opt/phucAnduong"
APP_NAME="phucAnduong-cms"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Creating deployment package...${NC}"
# Exclude node_modules, .git, and other unnecessary files
tar -czf deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='.env.local' \
  --exclude='deploy.tar.gz' \
  --exclude='*.log' \
  .

echo -e "${BLUE}Step 2: Uploading to VPS...${NC}"
scp -P ${VPS_PORT} deploy.tar.gz ${VPS_USER}@${VPS_HOST}:/tmp/

echo -e "${BLUE}Step 3: Installing on VPS...${NC}"
ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_HOST} << 'ENDSSH'

# Exit on error
set -e

APP_DIR="/opt/phucAnduong"
APP_NAME="phucAnduong-cms"

echo "📦 Setting up application directory..."
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# Extract application
echo "📂 Extracting application..."
tar -xzf /tmp/deploy.tar.gz -C ${APP_DIR}
rm /tmp/deploy.tar.gz

# Create .env file with VPS database credentials
echo "🔧 Creating environment configuration..."
SESSION_SECRET=$(openssl rand -base64 32)
cat > .env << EOF
NODE_ENV=production
DATABASE_URL=postgresql://postgres:PhucAn2025!@localhost:5432/phuanduong_db
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=PhucAn2025!
PGDATABASE=phuanduong_db
PORT=5000
SESSION_SECRET=${SESSION_SECRET}
EOF

# Install Node.js 20 if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    npm install -g pm2
fi

# Install dependencies
echo "📥 Installing dependencies..."
npm install --production=false

# Build the application
echo "🔨 Building application..."
npm run build

# Push database schema
echo "🗄️  Pushing database schema..."
if npm run db:push; then
    echo "✅ Schema pushed successfully"
else
    echo "⚠️  Schema push failed. If this is a fresh database, you can force push with:"
    echo "   npm run db:push -- --force"
    echo "   WARNING: Only use --force on empty databases!"
    exit 1
fi

# Stop existing PM2 process if running
echo "🛑 Stopping existing process..."
pm2 delete ${APP_NAME} 2>/dev/null || true

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start npm --name ${APP_NAME} -- start
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

echo "✅ Deployment complete!"
echo "📊 Application status:"
pm2 status

echo ""
echo "🌐 Application should be running on: http://103.72.96.173:5000"
echo "👤 Admin login: admin@phuan.com / admin123"
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status          - Check status"
echo "  pm2 logs ${APP_NAME}  - View logs"
echo "  pm2 restart ${APP_NAME} - Restart app"
echo "  pm2 stop ${APP_NAME}    - Stop app"

ENDSSH

# Clean up local deployment package
rm deploy.tar.gz

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}🌐 Access your app at: http://103.72.96.173:5000${NC}"
echo -e "${GREEN}👤 Admin: admin@phuan.com / admin123${NC}"
