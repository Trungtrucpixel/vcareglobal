# 🔑 Hướng Dẫn Thiết Lập SSH cho VPS

## 📋 Thông Tin VPS
- **IP**: 103.72.96.173
- **Port**: 24700
- **User**: root

## 🔑 SSH Key đã được tạo

Public key của bạn:
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDbGQE05UtEflAf95TQSp07Ut/y4OCf2HZkJZ9m5G4UHaKNrtp4QMCw/RoITFDCFNPhp9BBczQCwAIeYSOMUmK30Lpnd6FdY4RORWo0arnc/5Z8nVGlf4n403hCHc4QMdms3MvVal2uO8kIh1o21qxTLmj4oEoeZSjaeDo5eeylB3wn9G92VHEwhA3F/6Q1gqGvr1Z57rn5nMhlG+EDD0kOb/hsfbySw89jCOu+0g6bG2nt/WOq7nleGp3jcetbH5EwOthBRgnuByQ17ECwsW98D6Od7KC77rjsmtNPZCmgbS2uxncYuzxvw/iUGE6uOao3VQQzMsc/+/KtFtb71/CbkLU2m11kVFW4w4M5v5GG3YbQyN9X5KEpNfwJCsOASST/h/fk7lRgkqqsL42W8mmtuA8dc/I+dyeO05rAUdofL9kPi+T/KwnXVJqFXtdOjXUytPmBU5L4uaJMK7k3PczZ8LACUHFNkHDxDQgk2Kc7+M80VZWRbPbkbubjV0SxLdW6mO4hP+C6P2W1qq92i1gyDMcfTHmkx6OSJoVo7F14XUCOIf/KAlNsDnAkKwmFp+fk/9LtcHHFjuqYuHTLtifo7HHZylYIOe+B+eoWaimCZrluMG7NCQ7KW1QMTqnxfWj81revtWeMmuqHI/3kIeFflKGfQ+STOp0EmIC7Xc64ww== phucanduong@deploy
```

## 🚀 Các Bước Thiết Lập

### Bước 1: Thêm SSH Key vào VPS

**Cách 1: Sử dụng ssh-copy-id (Khuyến nghị)**
```bash
ssh-copy-id -p 24700 root@103.72.96.173
```

**Cách 2: Thêm thủ công**
```bash
# Kết nối VPS bằng password
ssh -p 24700 root@103.72.96.173

# Tạo thư mục .ssh nếu chưa có
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Thêm public key vào authorized_keys
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDbGQE05UtEflAf95TQSp07Ut/y4OCf2HZkJZ9m5G4UHaKNrtp4QMCw/RoITFDCFNPhp9BBczQCwAIeYSOMUmK30Lpnd6FdY4RORWo0arnc/5Z8nVGlf4n403hCHc4QMdms3MvVal2uO8kIh1o21qxTLmj4oEoeZSjaeDo5eeylB3wn9G92VHEwhA3F/6Q1gqGvr1Z57rn5nMhlG+EDD0kOb/hsfbySw89jCOu+0g6bG2nt/WOq7nleGp3jcetbH5EwOthBRgnuByQ17ECwsW98D6Od7KC77rjsmtNPZCmgbS2uxncYuzxvw/iUGE6uOao3VQQzMsc/+/KtFtb71/CbkLU2m11kVFW4w4M5v5GG3YbQyN9X5KEpNfwJCsOASST/h/fk7lRgkqqsL42W8mmtuA8dc/I+dyeO05rAUdofL9kPi+T/KwnXVJqFXtdOjXUytPmBU5L4uaJMK7k3PczZ8LACUHFNkHDxDQgk2Kc7+M80VZWRbPbkbubjV0SxLdW6mO4hP+C6P2W1qq92i1gyDMcfTHmkx6OSJoVo7F14XUCOIf/KAlNsDnAkKwmFp+fk/9LtcHHFjuqYuHTLtifo7HHZylYIOe+B+eoWaimCZrluMG7NCQ7KW1QMTqnxfWj81revtWeMmuqHI/3kIeFflKGfQ+STOp0EmIC7Xc64ww== phucanduong@deploy" >> ~/.ssh/authorized_keys

# Set permissions
chmod 600 ~/.ssh/authorized_keys
```

### Bước 2: Test SSH Connection
```bash
# Test kết nối
ssh -p 24700 root@103.72.96.173 "echo 'SSH connection successful'"
```

### Bước 3: Chạy Deploy
```bash
# Sau khi SSH hoạt động, chạy deploy
./quick-deploy.sh
```

## 🔧 Troubleshooting

### Lỗi "Permission denied (publickey,password)"
```bash
# Kiểm tra SSH key
ssh-add -l

# Test với verbose để xem chi tiết
ssh -v -p 24700 root@103.72.96.173
```

### Lỗi "Host key verification failed"
```bash
# Xóa host key cũ
ssh-keygen -R [103.72.96.173]:24700

# Hoặc thêm vào known_hosts
ssh-keyscan -p 24700 103.72.96.173 >> ~/.ssh/known_hosts
```

### Lỗi "Connection refused"
- Kiểm tra VPS có đang chạy không
- Kiểm tra firewall có block port 24700 không
- Kiểm tra SSH service có chạy không

## 📝 Lưu Ý

1. **Bảo mật**: Giữ private key (`~/.ssh/id_rsa`) an toàn
2. **Backup**: Backup SSH key để tránh mất quyền truy cập
3. **Permissions**: Đảm bảo file permissions đúng (600 cho private key, 644 cho public key)

## 🎯 Sau Khi SSH Hoạt Động

Chạy lệnh sau để deploy:
```bash
./quick-deploy.sh
```

Hoặc chạy manual deploy:
```bash
./deploy.sh
```

Chúc bạn thành công! 🚀

