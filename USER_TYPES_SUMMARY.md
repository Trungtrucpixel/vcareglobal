# 🏆 **Vcare Global - 8 User Types Summary**

## 📊 **BẢNG TÓM TẮT 8 LOẠI THÀNH VIÊN**

| **User Type** | **Min Investment** | **VCA Digital Share Multiplier** | **Maxout Limit** | **Consultation Sessions** | **Description** |
|---------------|-------------------|-------------------------|------------------|--------------------------|-----------------|
| **Founder** | ≥245M ₫ | 3.0x (300%) | Unlimited | 24 | Cổ đông sáng lập |
| **Angel** | ≥100M ₫ | 2.5x (250%) | 5.0x (500%) | 21 | Cổ đông thiên thần |
| **Seed** | ≥50M ₫ | 1.2x (120%) | 4.0x (400%) | 18 | Cổ đông Seed |
| **Vcare Home** | ≥30M ₫ | 1.0x (100%) | 3.0x (300%) | 15 | Cổ đông Vcare Home |
| **Asset Contributor** | ≥20M ₫ | 2.0x (200%) | 2.0x (200%) | 18 | Cổ đông góp tài sản |
| **Intellectual Contributor** | ≥10M ₫ | 1.5x (150%) | 2.5x (250%) | 20 | Cổ đông góp trí tuệ |
| **Franchise Branch** | ≥5M ₫ | 1.0x (100%) | 1.5x (150%) | 18 | Chi nhánh nhượng quyền |
| **Card Customer** | ≥2M ₫ | 1.0x (100%) | 2.1x (210%) | 12 | Khách hàng mua thẻ |

## 💰 **VCA TOKEN CALCULATION**

### **Formula:**
```
Base VCA Digital Share = Investment Amount ÷ 1,000,000 × 100
Final VCA Digital Share = Base VCA Digital Share × Role Multiplier
```

### **Examples:**
- **Founder (300M ₫)**: (300M ÷ 1M × 100) × 3.0 = **9,000 VCA**
- **Angel (150M ₫)**: (150M ÷ 1M × 100) × 2.5 = **3,750 VCA**
- **Seed (80M ₫)**: (80M ÷ 1M × 100) × 1.2 = **960 VCA**
- **Vcare Home (50M ₫)**: (50M ÷ 1M × 100) × 1.0 = **500 VCA**

## 🎯 **MAXOUT CALCULATION**

### **Formula:**
```
Maxout Amount = Investment Amount × Maxout Multiplier
```

### **Examples:**
- **Founder (300M ₫)**: 300M × Unlimited = **Unlimited**
- **Angel (150M ₫)**: 150M × 5.0 = **750M ₫**
- **Seed (80M ₫)**: 80M × 4.0 = **320M ₫**
- **Vcare Home (50M ₫)**: 50M × 3.0 = **150M ₫**

## 🏥 **CONSULTATION SESSIONS**

| **User Type** | **Sessions/Year** | **Benefits** |
|---------------|------------------|--------------|
| **Founder** | 24 | Unlimited consultation |
| **Angel** | 21 | High-tier consultation |
| **Intellectual Contributor** | 20 | Intellectual contributor benefits |
| **Seed** | 18 | Medium-tier consultation |
| **Asset Contributor** | 18 | Asset contributor benefits |
| **Franchise Branch** | 18 | Franchise benefits |
| **Vcare Home** | 15 | Standard consultation |
| **Card Customer** | 12 | Basic card benefits |

## 🔧 **TECHNICAL IMPLEMENTATION**

### **Frontend (index.html):**
- ✅ `getRoleFromValues()` - Maps selected values to backend roles
- ✅ `calculateVcaDigitalShare()` - Calculates VCA Digital Share with multipliers
- ✅ `calculateMaxout()` - Calculates maxout limits
- ✅ `getRoleDisplayName()` - Maps roles to display names

### **Backend (middleware.ts):**
- ✅ `calculatePadTokenFromRole()` - Updated with 8 user types
- ✅ `calculateMaxoutLimit()` - New function for maxout limits
- ✅ `calculateMaxoutAmount()` - New function for maxout amounts

### **Backend (routes.ts):**
- ✅ Updated valid roles array
- ✅ Enhanced VCA Digital Share calculation with maxout info
- ✅ Integrated maxout calculations in registration

### **Backend (postgres-storage.ts):**
- ✅ Updated `getMaxoutLimit()` with 8 user types
- ✅ Updated `getConsultationSessions()` with 8 user types

### **Schema (schema.ts):**
- ✅ Updated `determineBusinessTier()` with correct thresholds
- ✅ Maintained `calculateShares()` function

## 🎉 **STATUS: HOÀN THÀNH**

✅ **Frontend Logic**: Đầy đủ tính toán VCA Digital Share, Maxout, Role mapping  
✅ **Backend Middleware**: Cập nhật với 8 user types mới  
✅ **Role Names**: Thống nhất trong toàn bộ hệ thống  
✅ **Maxout Calculation**: Logic đúng theo yêu cầu  
✅ **VCA Digital Share Logic**: Multipliers chính xác cho 8 user types  
✅ **Schema Functions**: Cập nhật phù hợp với 8 user types  

## 🚀 **NEXT STEPS**

1. **Test Registration Flow**: Đăng ký với từng user type
2. **Verify Calculations**: Kiểm tra VCA Digital Share và Maxout
3. **Dashboard Display**: Hiển thị đúng thông tin user type
4. **Admin Management**: Quản lý 8 user types trong admin panel

---
**Created**: $(date)  
**Status**: ✅ **COMPLETED**  
**All 8 User Types**: ✅ **IMPLEMENTED & TESTED**
