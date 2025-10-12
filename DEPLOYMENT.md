# VPS Deployment Guide - PhucAnDuongCMS-3

## VPS Information
- **Server IP**: 103.72.96.173
- **OS**: Ubuntu 22.04
- **Database**: PostgreSQL 14
- **App Port**: 5000

## Database Configuration
- **Host**: localhost
- **Port**: 5432
- **Database**: phuanduong_db
- **User**: postgres
- **Password**: PhucAn2025!

## Admin Credentials
- **Email**: admin@phuan.com
- **Password**: admin123

---

## Automated Deployment (Recommended)

### Prerequisites
1. SSH access to VPS (root@103.72.96.173)
2. PostgreSQL 14 already installed and running
3. Database `phuanduong_db` created

### Deploy Command
```bash
./deploy-vps.sh
```

This script will:
- ✅ Package the application
- ✅ Upload to VPS
- ✅ Install Node.js 20 and PM2
- ✅ Install dependencies
- ✅ Build the application
- ✅ Push database schema
- ✅ Start with PM2 (auto-restart on reboot)

### Post-Deployment
Access your application at: **http://103.72.96.173:5000**

---

## Manual Deployment (Alternative)

If automated deployment fails, follow these steps:

### 1. Package Application
```bash
tar -czf phucAnduong.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  .
```

### 2. Upload to VPS
```bash
scp phucAnduong.tar.gz root@103.72.96.173:/opt/
```

### 3. SSH to VPS
```bash
ssh root@103.72.96.173
```

### 4. Extract and Setup
```bash
cd /opt
mkdir -p phucAnduong
tar -xzf phucAnduong.tar.gz -C phucAnduong
cd phucAnduong
```

### 5. Create .env File
```bash
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
```

### 6. Install Dependencies
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install app dependencies
npm install
```

### 7. Build Application
```bash
npm run build
```

### 8. Push Database Schema
```bash
# Push schema changes (adds new tables/columns without dropping existing data)
npm run db:push

# If this is your FIRST deployment and database is empty, you can force:
# npm run db:push -- --force
```

### 9. Start with PM2
```bash
pm2 start npm --name phucAnduong-cms -- start
pm2 save
pm2 startup systemd
```

---

## PM2 Management Commands

```bash
# View status
pm2 status

# View logs
pm2 logs phucAnduong-cms

# View real-time logs
pm2 logs phucAnduong-cms --lines 100

# Restart application
pm2 restart phucAnduong-cms

# Stop application
pm2 stop phucAnduong-cms

# Delete from PM2
pm2 delete phucAnduong-cms
```

---

## Features Deployed

✅ **PAD Token System**
- Automatic calculation: 100 PAD = 1 triệu VNĐ
- Displayed on Dashboard and Cards

✅ **Multi-Role System**
- 7 roles: Sáng lập, Thiên thần, Phát triển, Đồng hành, Góp tài sản, Sweat Equity, Khách hàng
- Auto-upgrade: Customer → Shareholder when total cards > 101M VNĐ

✅ **Cards & Benefits**
- Connection commission: 8%
- VIP support: 5%
- Profit share: 49%
- Consultation sessions: 12-24 lượt/2 năm (based on card tier)

✅ **Dashboard Analytics**
- PAD Token value display
- 6mo/1yr/3yr/5yr predictions
- Profit allocation chart (30% capital vs 19% labor)
- ROI prediction table

✅ **Branch KPI Management**
- Branch performance tracking
- Staff equity distribution
- Cash flow monitoring

---

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs phucAnduong-cms

# Check if port 5000 is available
netstat -tuln | grep 5000

# Manually test
npm start
```

### Database connection issues
```bash
# Test PostgreSQL connection
psql -U postgres -d phuanduong_db -c "SELECT version();"

# Check if PostgreSQL is running
systemctl status postgresql
```

### View full application logs
```bash
pm2 logs phucAnduong-cms --lines 500
```

---

## Firewall Configuration

If you need to open port 5000:
```bash
# UFW
ufw allow 5000/tcp

# Or iptables
iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
```

---

## Backup & Restore

### Backup Database
```bash
pg_dump -U postgres phuanduong_db > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
psql -U postgres phuanduong_db < backup_20250102.sql
```
