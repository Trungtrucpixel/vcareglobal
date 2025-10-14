# Tích hợp Đa Vai trò và PAD Token - Phúc An Đường

## Tổng quan

Tài liệu này mô tả việc tích hợp hỗ trợ đa vai trò và PAD Token vào web app Phúc An Đường, bao gồm JWT authentication, middleware kiểm tra quyền, và tích hợp PAD Token vào các luồng góp vốn, mua thẻ, và KPI.

## Tính năng chính

### 1. Đa Vai trò (Multi-Role Support)
- **JWT Authentication**: Hỗ trợ đăng nhập bằng JWT token
- **Role-based Access Control**: Kiểm tra quyền truy cập dựa trên vai trò
- **Multiple Roles per User**: Một người dùng có thể có nhiều vai trò
- **Dynamic Navigation**: Navigation tự động hiển thị các tab dựa trên vai trò

### 2. PAD Token Integration
- **Tỷ lệ chuyển đổi**: 100 PAD = 1 triệu VNĐ (1 PAD = 10,000 VNĐ)
- **Tự động tính toán**: PAD Token được tính tự động khi mua thẻ, góp vốn
- **Lịch sử tracking**: Ghi lại tất cả thay đổi PAD Token
- **ROI Projection**: Dự báo lợi nhuận từ PAD Token

### 3. Middleware Security
- **Authentication Middleware**: Kiểm tra đăng nhập
- **Role-based Middleware**: Kiểm tra quyền dựa trên vai trò
- **PAD Token Middleware**: Kiểm tra số dư PAD Token
- **Rate Limiting**: Giới hạn số lượng request
- **Audit Logging**: Ghi log tất cả hành động

## Cấu trúc Files

### Backend Files
```
server/
├── auth.ts                 # JWT authentication & multi-role support
├── middleware.ts           # Security middleware & PAD Token helpers
├── routes.ts              # Updated routes with middleware
└── postgres-storage.ts    # Database operations for roles & PAD Token
```

### Frontend Files
```
client/public/
├── navigation.html         # Navigation với hiển thị vai trò & PAD Token
├── dashboard-enhanced.html # Dashboard với PAD Token integration
├── pad-token-integration.js # JavaScript cho PAD Token calculations
└── admin-styles.css       # Styling cho admin interfaces
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - JWT login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/login` - Session-based login (legacy)
- `POST /api/register` - User registration
- `GET /api/user` - Get current user info with roles & PAD Token

### Role Management
- `GET /api/admin/roles` - Get all roles
- `GET /api/admin/users/:userId/roles` - Get user roles
- `POST /api/admin/users/:userId/roles` - Assign multiple roles

### PAD Token Management
- `POST /api/admin/users/:userId/pad-token` - Update PAD Token
- `GET /api/admin/users/:userId/pad-token-history` - Get PAD Token history

### Dashboard
- `GET /api/dashboard/metrics` - Dashboard metrics with PAD Token info

## Cách sử dụng

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Cấu hình Environment Variables
```bash
# .env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/phuanduong_db
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret
PORT=5000
```

### 3. Chạy Database Migration
```bash
npm run db:push
```

### 4. Khởi động Server
```bash
npm run dev
```

### 5. Truy cập Web App
- **Dashboard**: http://localhost:5000/dashboard-enhanced.html
- **Navigation**: http://localhost:5000/navigation.html
- **Admin Panel**: http://localhost:5000/admin-roles-management.html

## Vai trò và Quyền hạn

### Vai trò có sẵn
1. **admin** - Quản trị viên (toàn quyền)
2. **accountant** - Kế toán (xem báo cáo, quản lý tài chính)
3. **branch** - Chi nhánh (quản lý chi nhánh)
4. **staff** - Nhân viên (quản lý cơ bản)
5. **customer** - Khách hàng (mua thẻ, xem thông tin)
6. **shareholder** - Cổ đông (quyền lợi đặc biệt)
7. **sang_lap** - Sáng lập (quyền cao nhất)
8. **thien_than** - Thiên thần (nhà đầu tư)
9. **phat_trien** - Phát triển (phát triển sản phẩm)
10. **dong_hanh** - Đồng hành (đối tác)
11. **gop_tai_san** - Góp tài sản
12. **sweat_equity** - Sweat Equity

### Quyền hạn theo vai trò
- **admin**: Tất cả quyền
- **accountant**: Xem báo cáo, quản lý PAD Token
- **staff**: Quản lý cơ bản, xem dashboard
- **customer**: Mua thẻ, xem thông tin cá nhân
- **shareholder+**: Quyền lợi đặc biệt, ROI cao hơn

## PAD Token System

### Tính toán PAD Token
```javascript
// Từ VNĐ sang PAD Token
const padToken = (amount / 1000000) * 100; // 100 PAD = 1 triệu VNĐ

// Từ PAD Token sang VNĐ
const vndAmount = padToken * 10000; // 1 PAD = 10,000 VNĐ
```

### Các luồng tích hợp PAD Token
1. **Mua thẻ**: Tự động cộng PAD Token
2. **Góp vốn**: Tự động cộng PAD Token
3. **KPI**: Thưởng PAD Token dựa trên KPI
4. **Admin update**: Admin có thể cập nhật PAD Token

### Auto-upgrade Role
- **101 triệu VNĐ**: customer → shareholder
- **245 triệu VNĐ**: shareholder → thien_than

## Middleware Usage

### Authentication
```javascript
app.get('/api/protected', requireAuth, (req, res) => {
    // Route chỉ dành cho user đã đăng nhập
});
```

### Role-based Access
```javascript
app.get('/api/admin', requireAdmin, (req, res) => {
    // Route chỉ dành cho admin
});

app.get('/api/staff', requireStaff, (req, res) => {
    // Route dành cho staff, accountant, admin
});
```

### PAD Token Check
```javascript
app.post('/api/premium-feature', requireMinPadToken(100), (req, res) => {
    // Route yêu cầu tối thiểu 100 PAD Token
});
```

## Frontend Integration

### Navigation Component
```html
<!-- Include navigation -->
<script src="navigation.html"></script>

<!-- PAD Token display -->
<div data-pad-token-amount>0</div>
<div data-pad-token-value>0 VNĐ</div>
<div data-pad-token-display>0 PAD (0 VNĐ)</div>
```

### PAD Token Integration
```html
<!-- Include PAD Token integration -->
<script src="pad-token-integration.js"></script>

<!-- Investment form with PAD Token preview -->
<form data-investment-form>
    <input data-investment-amount type="number" placeholder="Số tiền đầu tư">
    <!-- PAD Token preview sẽ tự động hiển thị -->
</form>
```

## Dashboard Features

### Metrics Display
- **PAD Token**: Số PAD Token hiện tại
- **PAD Token Value**: Giá trị VNĐ tương ứng
- **User Roles**: Vai trò hiện tại của user
- **Revenue**: Tổng doanh thu
- **Active Cards**: Số thẻ hoạt động

### PAD Token Details
- **Current PAD Token**: Số PAD Token hiện tại
- **Value in VNĐ**: Giá trị VNĐ
- **Earned PAD Token**: PAD Token đã kiếm được
- **Used PAD Token**: PAD Token đã sử dụng
- **ROI Projection**: Dự báo lợi nhuận

## Security Features

### JWT Security
- **Token Expiration**: 24 giờ
- **Refresh Token**: Tự động refresh
- **Secure Headers**: Authorization header

### Rate Limiting
- **Default**: 100 requests per 15 minutes
- **Configurable**: Có thể tùy chỉnh theo endpoint

### Audit Logging
- **User Actions**: Ghi log tất cả hành động
- **PAD Token Changes**: Theo dõi thay đổi PAD Token
- **Role Changes**: Theo dõi thay đổi vai trò

## Testing

### Test Authentication
```bash
# Test JWT login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Test protected route
curl -X GET http://localhost:5000/api/dashboard/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Role-based Access
```bash
# Test admin route
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Test PAD Token update
curl -X POST http://localhost:5000/api/admin/users/USER_ID/pad-token \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"padToken":1000,"reason":"Test update"}'
```

## Troubleshooting

### Common Issues

1. **JWT Token Invalid**
   - Kiểm tra JWT_SECRET trong .env
   - Đảm bảo token chưa hết hạn

2. **Role Access Denied**
   - Kiểm tra user có đúng vai trò không
   - Kiểm tra middleware configuration

3. **PAD Token Not Updating**
   - Kiểm tra database connection
   - Kiểm tra PAD Token calculation logic

4. **Navigation Not Showing**
   - Kiểm tra user authentication
   - Kiểm tra role assignment

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development DEBUG=* npm run dev
```

## Performance Considerations

### Database Optimization
- **Indexes**: Đã thêm indexes cho roles và PAD Token queries
- **Connection Pooling**: Sử dụng connection pooling
- **Query Optimization**: Optimized queries cho large datasets

### Caching
- **User Roles**: Cache user roles trong JWT
- **PAD Token**: Cache PAD Token calculations
- **Dashboard Metrics**: Cache dashboard data

### Rate Limiting
- **API Endpoints**: Rate limiting cho tất cả endpoints
- **PAD Token Updates**: Rate limiting cho PAD Token operations
- **Role Changes**: Rate limiting cho role management

## Future Enhancements

### Planned Features
1. **PAD Token Marketplace**: Mua bán PAD Token
2. **Advanced Analytics**: Phân tích chi tiết PAD Token
3. **Mobile App**: Mobile app với PAD Token support
4. **API Documentation**: Swagger/OpenAPI documentation
5. **WebSocket**: Real-time PAD Token updates

### Scalability
1. **Microservices**: Tách PAD Token service
2. **Redis Cache**: Redis cho caching
3. **Load Balancing**: Load balancer cho multiple instances
4. **Database Sharding**: Sharding cho large datasets

---

*Tài liệu này được cập nhật tự động khi có thay đổi về tính năng.*

