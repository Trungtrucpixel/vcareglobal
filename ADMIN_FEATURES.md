# Hướng dẫn sử dụng Tab Quản trị - Phúc An Đường

## Tổng quan

Tab Quản trị đã được cập nhật để hỗ trợ quản lý đa vai trò, PAD Token và xuất báo cáo chi tiết. Các tính năng mới bao gồm:

1. **Quản lý đa vai trò**: Một người dùng có thể có nhiều vai trò (Sáng lập, Thiên thần, v.v.)
2. **Quản lý PAD Token**: Ghi nhận và chỉnh sửa số PAD Token của người dùng
3. **Xuất báo cáo**: PDF/Excel về PAD Token và quyền lợi theo vai trò

## Các tính năng mới

### 1. Quản lý Đa Vai trò

#### Backend Endpoints:
- `GET /api/admin/roles` - Lấy danh sách tất cả vai trò
- `GET /api/admin/users/:userId/roles` - Lấy vai trò của người dùng
- `POST /api/admin/users/:userId/roles` - Gán nhiều vai trò cho người dùng

#### Frontend:
- Giao diện quản lý vai trò với checkbox để chọn nhiều vai trò
- Hiển thị vai trò hiện tại của người dùng
- Modal để cập nhật vai trò

### 2. Quản lý PAD Token

#### Backend Endpoints:
- `POST /api/admin/users/:userId/pad-token` - Cập nhật PAD Token
- `GET /api/admin/users/:userId/pad-token-history` - Lấy lịch sử PAD Token

#### Frontend:
- Form để nhập số PAD Token mới
- Trường lý do cập nhật
- Hiển thị lịch sử thay đổi PAD Token

### 3. Xuất Báo cáo

#### Backend Endpoints:
- `POST /api/admin/reports/pad-token-benefits` - Báo cáo PAD Token & Quyền lợi
- `POST /api/admin/reports/roles-permissions` - Báo cáo Vai trò & Quyền hạn

#### Frontend:
- Chọn loại báo cáo từ dropdown
- Chọn định dạng xuất (PDF/CSV)
- Chọn khoảng thời gian (tùy chọn)
- Tự động tải file xuống

## Cấu trúc Database

### Bảng mới:
- `pad_token_history`: Lưu lịch sử thay đổi PAD Token
- `roles`: Danh sách vai trò trong hệ thống
- `user_roles`: Liên kết nhiều-nhiều giữa users và roles

### Schema mới:
```sql
-- PAD Token history
CREATE TABLE pad_token_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  previous_amount DECIMAL(15,2) NOT NULL,
  new_amount DECIMAL(15,2) NOT NULL,
  change_amount DECIMAL(15,2) NOT NULL,
  change_type TEXT NOT NULL, -- admin_update, kpi_reward, etc.
  reason TEXT,
  admin_id VARCHAR REFERENCES users(id),
  related_transaction_id VARCHAR REFERENCES transactions(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Roles
CREATE TABLE roles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User roles (many-to-many)
CREATE TABLE user_roles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  role_id VARCHAR REFERENCES roles(id) NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW()
);
```

## Cách sử dụng

### 1. Quản lý Vai trò

1. Truy cập Tab Quản trị → Người dùng
2. Click "Quản lý vai trò" cho người dùng cần cập nhật
3. Chọn các vai trò mới từ danh sách checkbox
4. Click "Lưu vai trò"

### 2. Quản lý PAD Token

1. Truy cập Tab Quản trị → Người dùng
2. Click "PAD Token" cho người dùng cần cập nhật
3. Nhập số PAD Token mới
4. Nhập lý do cập nhật
5. Click "Lưu PAD Token"

### 3. Xuất Báo cáo

1. Truy cập Tab Quản trị → Báo cáo
2. Chọn loại báo cáo:
   - **PAD Token & Quyền lợi**: Báo cáo chi tiết PAD Token và quyền lợi của người dùng
   - **Vai trò & Quyền hạn**: Báo cáo phân quyền và vai trò trong hệ thống
3. Chọn định dạng xuất (PDF/CSV)
4. Chọn khoảng thời gian (tùy chọn)
5. Click "Xuất báo cáo"

## File HTML/JS/CSS

### Files đã tạo:
- `client/public/admin-roles-management.html` - Giao diện quản lý vai trò
- `client/public/admin-reports.js` - JavaScript cho xuất báo cáo
- `client/public/admin-styles.css` - CSS styling cho admin interface

### Cách sử dụng files:
1. Truy cập `/admin-roles-management.html` để sử dụng giao diện standalone
2. Include `admin-reports.js` và `admin-styles.css` trong các trang admin
3. Sử dụng class `AdminReports` để tạo báo cáo programmatically

## API Examples

### Gán nhiều vai trò:
```javascript
POST /api/admin/users/{userId}/roles
{
  "roleIds": ["role1", "role2", "role3"]
}
```

### Cập nhật PAD Token:
```javascript
POST /api/admin/users/{userId}/pad-token
{
  "padToken": 1000,
  "reason": "Thưởng KPI quý 1"
}
```

### Xuất báo cáo PAD Token:
```javascript
POST /api/admin/reports/pad-token-benefits
{
  "format": "pdf",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31"
}
```

## Lưu ý quan trọng

1. **Quyền truy cập**: Chỉ admin mới có thể sử dụng các tính năng quản lý
2. **Audit Log**: Tất cả thay đổi đều được ghi log trong bảng `audit_logs`
3. **PAD Token History**: Mọi thay đổi PAD Token đều được lưu trong `pad_token_history`
4. **Validation**: Tất cả input đều được validate trước khi xử lý
5. **Error Handling**: Có xử lý lỗi chi tiết cho tất cả operations

## Troubleshooting

### Lỗi thường gặp:

1. **"Admin access required"**: Cần đăng nhập với tài khoản admin
2. **"User not found"**: Kiểm tra userId có đúng không
3. **"Invalid role"**: Kiểm tra roleId có tồn tại trong bảng roles không
4. **"PAD Token must be positive"**: Số PAD Token phải >= 0

### Debug:
- Kiểm tra console browser để xem lỗi JavaScript
- Kiểm tra network tab để xem lỗi API
- Kiểm tra server logs để xem lỗi backend

## Cập nhật trong tương lai

1. **Real-time notifications**: Thông báo khi có thay đổi vai trò/PAD Token
2. **Bulk operations**: Cập nhật nhiều người dùng cùng lúc
3. **Advanced filtering**: Lọc người dùng theo vai trò, PAD Token
4. **Role templates**: Tạo template vai trò cho các nhóm người dùng
5. **PAD Token automation**: Tự động cập nhật PAD Token dựa trên KPI

