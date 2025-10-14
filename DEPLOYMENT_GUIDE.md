# 🚀 Hướng Dẫn Deploy Phúc An Dương lên VPS

## 📋 Thông Tin VPS
- **IP Address**: 103.72.96.173
- **SSH Port**: 24700
- **Username**: root
- **OS**: Ubuntu 22.04 LTS

## 🔧 Chuẩn Bị Trước Khi Deploy

### 1. Kiểm Tra SSH Key
```bash
# Kiểm tra SSH key có tồn tại
ls -la ~/.ssh/id_rsa

# Nếu chưa có, tạo SSH key
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

### 2. Thêm SSH Key vào VPS
```bash
# Copy SSH key lên VPS
ssh-copy-id -p 24700 root@103.72.96.173

# Test kết nối
ssh -p 24700 root@103.72.96.173 "echo 'SSH connection successful'"
```

## 🚀 Các Cách Deploy

### Cách 1: Quick Deploy (Khuyến nghị)
```bash
# Chạy script deploy nhanh
./quick-deploy.sh
```

### Cách 2: Full Deploy (Chi tiết)
```bash
# Chạy script deploy đầy đủ
./deploy.sh
```

### Cách 3: Deploy Thủ Công

#### Bước 1: Upload Code
```bash
# Upload toàn bộ source code
rsync -avz -e "ssh -p 24700" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='test-*.html' \
    ./ root@103.72.96.173:/var/www/phucanduong/
```

#### Bước 2: Cài Đặt Dependencies
```bash
# Kết nối VPS
ssh -p 24700 root@103.72.96.173

# Vào thư mục app
cd /var/www/phucanduong

# Cài đặt Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Cài đặt PM2
npm install -g pm2

# Cài đặt dependencies
npm install --production
```

#### Bước 3: Cấu Hình Database
```bash
# Cài đặt PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Tạo database
sudo -u postgres psql -c "CREATE DATABASE phucanduong;"
sudo -u postgres psql -c "CREATE USER phucanduong WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE phucanduong TO phucanduong;"
```

#### Bước 4: Cấu Hình Environment
```bash
# Copy file environment
cp production.env .env

# Chỉnh sửa .env với thông tin thực tế
nano .env
```

#### Bước 5: Khởi Động App
```bash
# Khởi động với PM2
pm2 start server/index.ts --name phucanduong --interpreter tsx
pm2 save
pm2 startup
```

#### Bước 6: Cấu Hình Nginx (Tùy chọn)
```bash
# Cài đặt Nginx
apt install -y nginx

# Tạo config
cat > /etc/nginx/sites-available/phucanduong << EOF
server {
    listen 80;
    server_name 103.72.96.173;
    
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
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/phucanduong /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 🔍 Kiểm Tra Sau Deploy

### 1. Kiểm Tra App Status
```bash
# Kết nối VPS
ssh -p 24700 root@103.72.96.173

# Kiểm tra PM2 status
pm2 status

# Xem logs
pm2 logs phucanduong

# Monitor real-time
pm2 monit
```

### 2. Kiểm Tra Web App
```bash
# Test từ local
curl http://103.72.96.173:3000

# Hoặc mở browser
open http://103.72.96.173:3000
```

### 3. Kiểm Tra Database
```bash
# Kết nối database
psql -h localhost -U phucanduong -d phucanduong

# Kiểm tra tables
\dt
```

## 🛠️ Troubleshooting

### Lỗi SSH Connection
```bash
# Kiểm tra SSH key
ssh-add -l

# Test connection với verbose
ssh -v -p 24700 root@103.72.96.173
```

### Lỗi Node.js Version
```bash
# Cài đặt Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Kiểm tra version
node -v
npm -v
```

### Lỗi Database Connection
```bash
# Kiểm tra PostgreSQL status
systemctl status postgresql

# Restart PostgreSQL
systemctl restart postgresql

# Kiểm tra connection
psql -h localhost -U phucanduong -d phucanduong
```

### Lỗi PM2
```bash
# Xóa process cũ
pm2 delete all

# Khởi động lại
pm2 start server/index.ts --name phucanduong --interpreter tsx

# Xem logs chi tiết
pm2 logs phucanduong --lines 50
```

## 📊 Monitoring

### 1. PM2 Commands
```bash
# Xem status
pm2 status

# Restart app
pm2 restart phucanduong

# Stop app
pm2 stop phucanduong

# Xem logs
pm2 logs phucanduong

# Monitor real-time
pm2 monit
```

### 2. System Monitoring
```bash
# Xem CPU, RAM usage
htop

# Xem disk usage
df -h

# Xem network connections
netstat -tulpn
```

## 🔄 Update Code

### Cách 1: Sử dụng Script
```bash
# Chạy lại quick deploy
./quick-deploy.sh
```

### Cách 2: Manual Update
```bash
# Upload code mới
rsync -avz -e "ssh -p 24700" \
    --exclude='.git' \
    --exclude='node_modules' \
    ./ root@103.72.96.173:/var/www/phucanduong/

# Restart app
ssh -p 24700 root@103.72.96.173 "cd /var/www/phucanduong && pm2 restart phucanduong"
```

## 📝 Notes

- **Backup**: Script tự động tạo backup trước khi deploy
- **Environment**: File `production.env` chứa cấu hình production
- **Logs**: Logs được lưu tại `/var/www/phucanduong/logs/`
- **PM2**: App được quản lý bởi PM2 để tự động restart
- **Nginx**: Có thể cấu hình Nginx để proxy requests

## 🆘 Support

Nếu gặp vấn đề, hãy kiểm tra:
1. SSH connection
2. Node.js version (cần >= 18)
3. Database connection
4. PM2 status
5. Logs trong PM2

Chúc bạn deploy thành công! 🎉

