#!/bin/bash

# Deploy script for Phúc An Dương web app
# VPS: 103.72.96.173:24700

set -e

# Configuration
VPS_IP="103.72.96.173"
VPS_PORT="24700"
VPS_USER="root"
APP_DIR="/var/www/phucanduong"
BACKUP_DIR="/var/backups/phucanduong"

echo "🚀 Starting deployment to VPS..."

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "❌ SSH key not found. Please generate one first:"
    echo "ssh-keygen -t rsa -b 4096 -C 'your_email@example.com'"
    exit 1
fi

# Test SSH connection
echo "🔍 Testing SSH connection..."
if ! ssh -p $VPS_PORT -o ConnectTimeout=10 $VPS_USER@$VPS_IP "echo 'SSH connection successful'"; then
    echo "❌ Cannot connect to VPS. Please check:"
    echo "1. VPS is running"
    echo "2. SSH key is added to VPS"
    echo "3. Firewall allows port $VPS_PORT"
    exit 1
fi

echo "✅ SSH connection successful"

# Create backup on VPS
echo "📦 Creating backup on VPS..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "
    mkdir -p $BACKUP_DIR
    if [ -d $APP_DIR ]; then
        cp -r $APP_DIR $BACKUP_DIR/backup-\$(date +%Y%m%d-%H%M%S)
        echo 'Backup created successfully'
    else
        echo 'No existing app directory found'
    fi
"

# Create app directory if it doesn't exist
echo "📁 Creating app directory..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "
    mkdir -p $APP_DIR
    mkdir -p $APP_DIR/logs
"

# Upload source code
echo "📤 Uploading source code..."
rsync -avz -e "ssh -p $VPS_PORT" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='test-*.html' \
    --exclude='.local' \
    --exclude='.replit' \
    ./ $VPS_USER@$VPS_IP:$APP_DIR/

# Install dependencies and setup on VPS
echo "🔧 Setting up application on VPS..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "
    cd $APP_DIR
    
    # Update system packages
    apt update -y
    
    # Install Node.js 18 if not installed
    if ! command -v node &> /dev/null || [[ \$(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
        echo 'Installing Node.js 18...'
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt install -y nodejs
    fi
    
    # Install PM2 globally if not installed
    if ! command -v pm2 &> /dev/null; then
        echo 'Installing PM2...'
        npm install -g pm2
    fi
    
    # Install project dependencies
    echo 'Installing project dependencies...'
    npm install --production
    
    # Create environment file if not exists
    if [ ! -f .env ]; then
        echo 'Creating .env file...'
        cat > .env << EOF
DATABASE_URL=postgresql://username:password@localhost:5432/phucanduong
SESSION_SECRET=your-session-secret-here
PORT=3000
JWT_SECRET=your-jwt-secret-here
NODE_ENV=production
EOF
    fi
    
    # Set proper permissions
    chown -R www-data:www-data $APP_DIR
    chmod -R 755 $APP_DIR
"

# Setup database (if needed)
echo "🗄️ Setting up database..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "
    cd $APP_DIR
    
    # Install PostgreSQL if not installed
    if ! command -v psql &> /dev/null; then
        echo 'Installing PostgreSQL...'
        apt install -y postgresql postgresql-contrib
        systemctl start postgresql
        systemctl enable postgresql
    fi
    
    # Create database and user (adjust as needed)
    sudo -u postgres psql -c \"CREATE DATABASE phucanduong;\" 2>/dev/null || echo 'Database might already exist'
    sudo -u postgres psql -c \"CREATE USER phucanduong WITH PASSWORD 'your_password';\" 2>/dev/null || echo 'User might already exist'
    sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE phucanduong TO phucanduong;\" 2>/dev/null || echo 'Privileges might already granted'
"

# Start/restart application
echo "🚀 Starting application..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "
    cd $APP_DIR
    
    # Stop existing PM2 processes
    pm2 stop phucanduong 2>/dev/null || echo 'No existing process to stop'
    pm2 delete phucanduong 2>/dev/null || echo 'No existing process to delete'
    
    # Start application with PM2
    pm2 start server/index.ts --name phucanduong --interpreter tsx
    pm2 save
    pm2 startup
"

# Setup Nginx (if needed)
echo "🌐 Setting up Nginx..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "
    # Install Nginx if not installed
    if ! command -v nginx &> /dev/null; then
        echo 'Installing Nginx...'
        apt install -y nginx
        systemctl start nginx
        systemctl enable nginx
    fi
    
    # Create Nginx configuration
    cat > /etc/nginx/sites-available/phucanduong << EOF
server {
    listen 80;
    server_name $VPS_IP;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /static {
        alias $APP_DIR/client/public;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/phucanduong /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    nginx -t && systemctl reload nginx
"

# Setup SSL with Let's Encrypt (optional)
echo "🔒 Setting up SSL (optional)..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "
    # Install Certbot if not installed
    if ! command -v certbot &> /dev/null; then
        echo 'Installing Certbot...'
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Uncomment the following lines if you have a domain name
    # certbot --nginx -d your-domain.com
"

# Check application status
echo "✅ Checking application status..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "
    pm2 status
    pm2 logs phucanduong --lines 10
"

echo "🎉 Deployment completed successfully!"
echo "🌐 Application should be available at: http://$VPS_IP"
echo "📊 Monitor with: ssh -p $VPS_PORT $VPS_USER@$VPS_IP 'pm2 monit'"
echo "📝 View logs with: ssh -p $VPS_PORT $VPS_USER@$VPS_IP 'pm2 logs phucanduong'"

