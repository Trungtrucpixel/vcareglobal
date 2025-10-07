import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // admin, accountant, branch, customer, staff, shareholder
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active, inactive
  refCode: text("ref_code").unique(), // Referral code for tracking
  businessTier: text("business_tier"), // founder, angel, branch, card_customer, staff, affiliate
  investmentAmount: decimal("investment_amount", { precision: 15, scale: 2 }).default("0"), // Total investment for tier determination
  totalShares: decimal("total_shares", { precision: 15, scale: 2 }).default("0"), // Current shares owned
  padToken: decimal("pad_token", { precision: 15, scale: 2 }).default("0"), // PAD Token balance (100 PAD = 1M VND)
  maxoutReached: boolean("maxout_reached").default(false), // Whether user reached maxout limit
  inheritanceRight: boolean("inheritance_right").default(false), // Quyền kế thừa cho vai trò Sáng lập
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // sang_lap, thien_than, phat_trien, dong_hanh, khach_hang, gop_tai_san, sweat_equity
  displayName: text("display_name").notNull(), // Sáng lập, Thiên thần, Phát triển, Đồng hành, Khách hàng, Góp tài sản, Sweat Equity
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  roleId: varchar("role_id").references(() => roles.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const assetContributions = pgTable("asset_contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  assetName: text("asset_name").notNull(), // Tên tài sản
  assetDescription: text("asset_description"), // Mô tả chi tiết
  valuationAmount: decimal("valuation_amount", { precision: 15, scale: 2 }).notNull(), // Giá trị định giá VND
  padTokenAmount: decimal("pad_token_amount", { precision: 15, scale: 2 }).notNull(), // Số PAD Token tương ứng
  contractDocumentPath: text("contract_document_path"), // Link hợp đồng/tài liệu
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  inheritanceRight: boolean("inheritance_right").default(false), // Quyền kế thừa (chỉ cho Sáng lập)
  createdAt: timestamp("created_at").defaultNow(),
});

export const cards = pgTable("cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cardNumber: text("card_number").notNull().unique(),
  cardType: text("card_type").notNull(), // Standard, Silver, Gold, Platinum, Diamond
  customerName: text("customer_name").notNull(),
  ownerId: varchar("owner_id").references(() => users.id),
  status: text("status").notNull().default("active"), // active, inactive, shared, near_maxout, stopped
  price: decimal("price", { precision: 15, scale: 2 }).notNull(), // Card price in VND
  remainingSessions: integer("remaining_sessions").default(0),
  consultationSessions: integer("consultation_sessions").default(12), // 12-24 lượt tư vấn sức khỏe/2 năm
  shareHistory: text("share_history").default(""), // JSON string of share records
  connectionCommission: decimal("connection_commission", { precision: 5, scale: 2 }).default("8.0"), // 8%
  vipSupport: decimal("vip_support", { precision: 5, scale: 2 }).default("5.0"), // 5%
  profitSharePercentage: decimal("profit_share_percentage", { precision: 5, scale: 2 }).default("49.0"), // 49% lợi tức sau thuế
  padToken: decimal("pad_token", { precision: 15, scale: 2 }).default("0"), // PAD Token (100 PAD = 1 triệu VNĐ)
  currentShares: decimal("current_shares", { precision: 15, scale: 2 }).default("0"), // Current share value
  maxoutLimit: decimal("maxout_limit", { precision: 15, scale: 2 }).default("0"), // 210% of card price
  issuedDate: timestamp("issued_date").defaultNow(),
  lastCheckIn: timestamp("last_check_in"),
});

export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cardId: varchar("card_id").references(() => cards.id),
  checkInDate: timestamp("check_in_date").defaultNow(),
  sessionType: text("session_type").notNull(), // therapy, consultation, etc
  notes: text("notes"),
});

export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  monthlyRevenue: decimal("monthly_revenue", { precision: 15, scale: 2 }).default("0"),
  staffCount: integer("staff_count").default(0),
  currentKpi: decimal("current_kpi", { precision: 5, scale: 2 }).default("0"), // Current KPI percentage
  monthlyTarget: decimal("monthly_target", { precision: 15, scale: 2 }).default("0"), // Monthly sales target
  padToken: decimal("pad_token", { precision: 15, scale: 2 }).default("20000"), // PAD Token (200 shares = 20,000 PAD for early franchise)
});

export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  position: text("position").notNull(),
  branchId: varchar("branch_id").references(() => branches.id),
  equityPercentage: decimal("equity_percentage", { precision: 5, scale: 2 }).default("0"),
  shares: integer("shares").default(0), // Number of shares owned
  padToken: decimal("pad_token", { precision: 15, scale: 2 }).default("0"), // PAD Token earned from KPI (1 KPI point = 10 PAD)
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // income, expense, deposit, invest, withdraw, share_distribution
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  contributionType: text("contribution_type"), // cash (tiền mặt), asset (tài sản), effort (công sức), card (thẻ)
  padTokenAmount: decimal("pad_token_amount", { precision: 15, scale: 2 }).default("0"), // Số PAD Token tương ứng
  branchId: varchar("branch_id").references(() => branches.id),
  cardId: varchar("card_id").references(() => cards.id),
  userId: varchar("user_id").references(() => users.id), // User who made the transaction
  referralCode: text("referral_code"), // Optional referral code for commission processing
  status: text("status").notNull().default("pending"), // pending, approved, rejected, completed
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"), // Auto-calculated tax (10% for withdrawals >10M)
  documentPath: text("document_path"), // Path to uploaded document for investments/deposits
  packageId: text("package_id"), // Investment package identifier
  approvedBy: varchar("approved_by").references(() => users.id), // Admin who approved
  approvedAt: timestamp("approved_at"), // Approval timestamp
  date: timestamp("date").defaultNow(),
});

// Investment packages table
export const investmentPackages = pgTable("investment_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Package name (e.g., "Gói Đầu tư Cơ bản", "Gói VIP")
  minAmount: decimal("min_amount", { precision: 15, scale: 2 }).notNull(), // Minimum investment amount
  maxAmount: decimal("max_amount", { precision: 15, scale: 2 }), // Maximum investment amount (optional)
  description: text("description"), // Package description
  expectedReturn: decimal("expected_return", { precision: 5, scale: 2 }).default("0"), // Expected annual return %
  duration: integer("duration").default(12), // Duration in months
  isActive: boolean("is_active").default(true), // Whether package is available
  createdAt: timestamp("created_at").defaultNow(),
});

export const kpis = pgTable("kpis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  branchId: varchar("branch_id").references(() => branches.id),
  period: text("period").notNull(), // month, quarter, year
  periodValue: text("period_value").notNull(), // 2024-03, 2024-Q1, 2024
  cardSales: integer("card_sales").default(0), // Number of cards sold
  cardSalesRevenue: decimal("card_sales_revenue", { precision: 15, scale: 2 }).default("0"),
  revisitRate: decimal("revisit_rate", { precision: 5, scale: 2 }).default("0"), // Percentage
  deviceRevenue: decimal("device_revenue", { precision: 15, scale: 2 }).default("0"), // Treatment device revenue
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }).default("0"),
  expenses: decimal("expenses", { precision: 15, scale: 2 }).default("0"),
  kpiScore: decimal("kpi_score", { precision: 5, scale: 2 }).default("0"), // Overall KPI score percentage
  createdAt: timestamp("created_at").defaultNow(),
});

export const staffKpis = pgTable("staff_kpis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").references(() => staff.id),
  period: text("period").notNull(), // quarter (Q1, Q2, Q3, Q4)
  periodValue: text("period_value").notNull(), // 2024-Q1, 2024-Q2, etc
  cardSales: integer("card_sales").default(0), // Number of cards sold by staff
  customerRetention: decimal("customer_retention", { precision: 5, scale: 2 }).default("0"), // Retention rate %
  totalPoints: decimal("total_points", { precision: 8, scale: 2 }).default("0"), // KPI points earned
  score: decimal("score", { precision: 5, scale: 2 }).default("0"), // KPI score percentage
  targetRevenue: decimal("target_revenue", { precision: 15, scale: 2 }).default("0"), // Target revenue for period
  bonusAmount: decimal("bonus_amount", { precision: 15, scale: 2 }).default("0"), // Bonus earned
  slotsEarned: integer("slots_earned").default(0), // Number of slots (1 slot = 50 shares)
  sharesAwarded: decimal("shares_awarded", { precision: 15, scale: 2 }).default("0"), // Total shares from this period
  padTokenEarned: decimal("pad_token_earned", { precision: 15, scale: 2 }).default("0"), // PAD Token earned (1 KPI point = 10 PAD)
  profitShareAmount: decimal("profit_share_amount", { precision: 15, scale: 2 }).default("0"), // 49% profit share
  isProcessed: boolean("is_processed").default(false), // End-of-quarter processing status
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").references(() => users.id), // Staff member who made referral
  referredUserId: varchar("referred_user_id").references(() => users.id), // User who was referred
  referralCode: text("referral_code").notNull().unique(), // Unique referral link code
  customerName: text("customer_name"), // Name of the referred customer
  firstTransactionId: varchar("first_transaction_id").references(() => transactions.id), // First transaction by referred user
  contributionValue: decimal("contribution_value", { precision: 15, scale: 2 }).default("0"), // Value of first transaction
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("8.0"), // 8% commission
  commissionAmount: decimal("commission_amount", { precision: 15, scale: 2 }).default("0"), // Calculated commission
  commissionPaid: decimal("commission_paid", { precision: 15, scale: 2 }).default("0"), // Amount already paid
  padTokenAmount: decimal("pad_token_amount", { precision: 15, scale: 2 }).default("0"), // PAD Token from 8% CTV commission
  status: text("status").notNull().default("pending"), // pending, paid, cancelled
  referralDate: timestamp("referral_date").defaultNow(),
  paidDate: timestamp("paid_date"),
});

export const profitSharing = pgTable("profit_sharing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  period: text("period").notNull(), // quarter (Q1, Q2, Q3, Q4)
  periodValue: text("period_value").notNull(), // 2024-Q1, 2024-Q2, etc
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }).default("0"), // Total quarterly revenue
  totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }).default("0"), // Total quarterly expenses
  netProfit: decimal("net_profit", { precision: 15, scale: 2 }).default("0"), // Calculated profit (revenue - expenses)
  profitSharePool: decimal("profit_share_pool", { precision: 15, scale: 2 }).default("0"), // 49% of net profit
  totalShares: integer("total_shares").default(0), // Total shares outstanding
  profitPerShare: decimal("profit_per_share", { precision: 15, scale: 2 }).default("0"), // Pool / total shares
  distributionStatus: text("distribution_status").notNull().default("pending"), // pending, completed, cancelled
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profitDistribution = pgTable("profit_distribution", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profitSharingId: varchar("profit_sharing_id").references(() => profitSharing.id),
  staffId: varchar("staff_id").references(() => staff.id),
  staffName: text("staff_name").notNull(), // Cache staff name for records
  distributionType: text("distribution_type").notNull().default("capital"), // capital (30% vốn - góp vốn/tài sản/thẻ), labor (19% công - KPI/chi nhánh)
  sharesOwned: integer("shares_owned").default(0), // Shares owned at distribution time
  distributionAmount: decimal("distribution_amount", { precision: 15, scale: 2 }).default("0"), // Amount distributed
  padTokenAmount: decimal("pad_token_amount", { precision: 15, scale: 2 }).default("0"), // PAD Token phân phối
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, cancelled
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System configurations table
export const systemConfigs = pgTable("system_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configKey: text("config_key").notNull().unique(), // maxout_limit_percentage, kpi_threshold, profit_share_rate
  configValue: text("config_value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(), // user_role_change, transaction_approval, config_update, report_export
  entityType: text("entity_type").notNull(), // user, transaction, config, report
  entityId: varchar("entity_id"), // ID of the affected entity
  oldValue: text("old_value"), // JSON string of previous state
  newValue: text("new_value"), // JSON string of new state
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User balances table for withdrawal management
export const userBalances = pgTable("user_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0"), // Available withdrawal balance
  pendingWithdrawal: decimal("pending_withdrawal", { precision: 15, scale: 2 }).default("0"), // Pending withdrawals
  totalEarned: decimal("total_earned", { precision: 15, scale: 2 }).default("0"), // Total earned from profit sharing
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Deposit requests table for role upgrade flows
export const depositRequests = pgTable("deposit_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  requestedTier: text("requested_tier").notNull(), // founder, angel, branch, card_customer
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  packageId: varchar("package_id").references(() => investmentPackages.id),
  proofDocumentPath: text("proof_document_path"), // Upload proof document
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  rejectionReason: text("rejection_reason"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User shares history for tracking share transactions
export const userSharesHistory = pgTable("user_shares_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  transactionType: text("transaction_type").notNull(), // investment, profit_share, kpi_bonus, referral_commission
  shareAmount: decimal("share_amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  relatedTransactionId: varchar("related_transaction_id").references(() => transactions.id),
  quarter: text("quarter"), // For KPI-based shares (2024-Q1, 2024-Q2, etc)
  createdAt: timestamp("created_at").defaultNow(),
});

// Business tier configurations
export const businessTierConfigs = pgTable("business_tier_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tierName: text("tier_name").notNull().unique(), // founder, angel, branch, card_customer, staff, affiliate
  minInvestment: decimal("min_investment", { precision: 15, scale: 2 }).default("0"),
  maxoutMultiplier: decimal("maxout_multiplier", { precision: 5, scale: 2 }).default("2.1"), // Default 210%
  sharesPerMillion: decimal("shares_per_million", { precision: 8, scale: 2 }).default("1.0"), // 1M VND = 1 share
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("0.0"), // For affiliates
  baseShares: integer("base_shares").default(0), // For branches (200 shares)
  unlimitedShares: boolean("unlimited_shares").default(false), // For founders
  kpiRequired: boolean("kpi_required").default(false), // For branches
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertCardSchema = createInsertSchema(cards).omit({
  id: true,
  issuedDate: true,
  lastCheckIn: true,
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
  checkInDate: true,
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  date: true,
});

export const insertKpiSchema = createInsertSchema(kpis).omit({
  id: true,
  createdAt: true,
});

export const insertStaffKpiSchema = createInsertSchema(staffKpis).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  referralDate: true,
  paidDate: true,
});

export const insertProfitSharingSchema = createInsertSchema(profitSharing).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertProfitDistributionSchema = createInsertSchema(profitDistribution).omit({
  id: true,
  createdAt: true,
  paidAt: true,
});

export const insertInvestmentPackageSchema = createInsertSchema(investmentPackages).omit({
  id: true,
  createdAt: true,
});

export const insertSystemConfigSchema = createInsertSchema(systemConfigs).omit({
  id: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertUserBalanceSchema = createInsertSchema(userBalances).omit({
  id: true,
  updatedAt: true,
});

export const insertDepositRequestSchema = createInsertSchema(depositRequests).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});

export const insertUserSharesHistorySchema = createInsertSchema(userSharesHistory).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessTierConfigSchema = createInsertSchema(businessTierConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
});

export const insertAssetContributionSchema = createInsertSchema(assetContributions).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});

// Quarterly validation schemas for profit sharing
export const quarterlyPeriodSchema = z.string().regex(
  /^\d{4}-Q[1-4]$/,
  "Period value must be in format YYYY-Q[1-4] (e.g., 2024-Q1)"
);

export const profitSharingValidationSchema = z.object({
  period: z.literal("quarter", {
    errorMap: () => ({ message: "Profit sharing is only allowed for quarterly periods" })
  }),
  periodValue: quarterlyPeriodSchema,
}).strict();

export const profitSharingProcessSchema = z.object({
  period: z.literal("quarter"),
  periodValue: quarterlyPeriodSchema,
  forceReprocess: z.boolean().optional().default(false)
}).strict();

export const profitDistributionValidationSchema = z.object({
  profitSharingId: z.string().uuid("Invalid profit sharing ID format"),
  distributionId: z.string().uuid("Invalid distribution ID format").optional(),
}).strict();

// Quarter date boundary validation helper
export const validateQuarterBoundaries = (periodValue: string): { startDate: Date; endDate: Date; isValid: boolean } => {
  const match = periodValue.match(/^(\d{4})-Q([1-4])$/);
  if (!match) {
    return { startDate: new Date(), endDate: new Date(), isValid: false };
  }

  const year = parseInt(match[1]);
  const quarter = parseInt(match[2]);
  
  // Validate year range (reasonable business years)
  if (year < 2020 || year > 2030) {
    return { startDate: new Date(), endDate: new Date(), isValid: false };
  }

  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 2;
  
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, endMonth + 1, 0); // Last day of quarter
  
  return { startDate, endDate, isValid: true };
};

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cards.$inferSelect;

export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkIns.$inferSelect;

export type InsertKpi = z.infer<typeof insertKpiSchema>;
export type Kpi = typeof kpis.$inferSelect;

export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branches.$inferSelect;

export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertStaffKpi = z.infer<typeof insertStaffKpiSchema>;
export type StaffKpi = typeof staffKpis.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export type InsertProfitSharing = z.infer<typeof insertProfitSharingSchema>;
export type ProfitSharing = typeof profitSharing.$inferSelect;

export type InsertProfitDistribution = z.infer<typeof insertProfitDistributionSchema>;
export type ProfitDistribution = typeof profitDistribution.$inferSelect;

export type InsertInvestmentPackage = z.infer<typeof insertInvestmentPackageSchema>;
export type InvestmentPackage = typeof investmentPackages.$inferSelect;

export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type SystemConfig = typeof systemConfigs.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertUserBalance = z.infer<typeof insertUserBalanceSchema>;
export type UserBalance = typeof userBalances.$inferSelect;

export type InsertDepositRequest = z.infer<typeof insertDepositRequestSchema>;
export type DepositRequest = typeof depositRequests.$inferSelect;

export type InsertUserSharesHistory = z.infer<typeof insertUserSharesHistorySchema>;
export type UserSharesHistory = typeof userSharesHistory.$inferSelect;

export type InsertBusinessTierConfig = z.infer<typeof insertBusinessTierConfigSchema>;
export type BusinessTierConfig = typeof businessTierConfigs.$inferSelect;

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

export type InsertAssetContribution = z.infer<typeof insertAssetContributionSchema>;
export type AssetContribution = typeof assetContributions.$inferSelect;

// Cash flow validation schemas
export const cashFlowTransactionSchema = z.object({
  type: z.enum(["deposit", "invest", "withdraw", "share_distribution"]),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  packageId: z.string().optional(),
  documentPath: z.string().optional(),
});

export const withdrawalRequestSchema = z.object({
  amount: z.number().min(5000000, "Minimum withdrawal is 5,000,000 VND"),
  description: z.string().min(1, "Description is required"),
});

export const depositRequestSchema = z.object({
  type: z.enum(["deposit", "invest"]),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  packageId: z.string().min(1, "Package selection is required"),
  documentPath: z.string().optional(),
});

// Admin validation schemas
export const userRoleUpdateSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["admin", "accountant", "branch", "customer", "staff", "shareholder"]),
});

export const transactionApprovalSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export const systemConfigUpdateSchema = z.object({
  configKey: z.string().min(1, "Config key is required"),
  configValue: z.string().min(1, "Config value is required"),
  description: z.string().optional(),
});

export const reportExportSchema = z.object({
  reportType: z.enum(["finance", "tax", "transactions", "users"]),
  format: z.enum(["pdf", "csv"]),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// Business tier upgrade validation schemas
export const businessTierUpgradeSchema = z.object({
  requestedTier: z.enum(["founder", "angel", "branch", "card_customer"]),
  amount: z.number().positive("Investment amount must be positive"),
  packageId: z.string().uuid("Invalid package ID").optional(),
  description: z.string().min(1, "Description is required"),
  proofDocumentPath: z.string().optional(),
}).refine((data) => {
  // Business rules validation
  if (data.requestedTier === "founder" && data.amount < 245000000) {
    return false;
  }
  if (data.requestedTier === "angel" && data.amount < 100000000) {
    return false;
  }
  return true;
}, {
  message: "Investment amount does not meet tier requirements"
});

// QR check-in validation
export const qrCheckinSchema = z.object({
  cardId: z.string().uuid("Invalid card ID"),
  sessionType: z.string().min(1, "Session type is required"),
  notes: z.string().optional(),
});

// Enhanced withdrawal with balance checks
export const enhancedWithdrawalSchema = z.object({
  amount: z.number().positive("Withdrawal amount must be positive"),
  description: z.string().min(1, "Description is required"),
}).refine((data) => {
  // Minimum withdrawal 5M VND rule
  return data.amount >= 5000000;
}, {
  message: "Minimum withdrawal is 5,000,000 VND"
});

// Profit sharing with maxout validation
export const profitShareWithMaxoutSchema = z.object({
  period: z.literal("quarter"),
  periodValue: quarterlyPeriodSchema,
  forceReprocess: z.boolean().optional().default(false),
  respectMaxout: z.boolean().default(true), // Whether to respect maxout limits
});

// User profile validation
export const userProfileUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email format").optional(),
  businessTier: z.enum(["founder", "angel", "branch", "card_customer", "staff", "affiliate"]).optional(),
});

// Business tier determination helper
export const determineBusinessTier = (investmentAmount: number): string => {
  if (investmentAmount >= 245000000) {
    return "founder"; // ≥245M VND, unlimited shares
  } else if (investmentAmount >= 100000000) {
    return "angel"; // ≥100M VND, x5 maxout
  } else if (investmentAmount > 0) {
    return "card_customer"; // Any investment, 210% maxout, 5% support
  }
  return "staff"; // Default tier
};

// Share calculation helper
export const calculateShares = (amount: number, tier: string): number => {
  // Base calculation: 1M VND = 1 share
  const baseShares = amount / 1000000;
  
  // Tier-specific multipliers (can be configured)
  switch (tier) {
    case "founder":
      return baseShares; // 1:1 ratio, unlimited
    case "angel":
      return baseShares; // 1:1 ratio, but 5x maxout
    case "branch":
      return 200; // Fixed 200 shares, KPI-based bonuses
    case "card_customer":
      return baseShares; // 1:1 ratio, 210% maxout
    default:
      return baseShares;
  }
};

// Tax calculation helper
export const calculateWithdrawalTax = (amount: number): number => {
  // 10% tax for withdrawals > 10M VND
  if (amount > 10000000) {
    return amount * 0.1;
  }
  return 0;
};

// Profit sharing operation types
export type ProfitSharingValidation = z.infer<typeof profitSharingValidationSchema>;
export type ProfitSharingProcess = z.infer<typeof profitSharingProcessSchema>;
export type ProfitDistributionValidation = z.infer<typeof profitDistributionValidationSchema>;

// Admin operation types
export type UserRoleUpdate = z.infer<typeof userRoleUpdateSchema>;
export type TransactionApproval = z.infer<typeof transactionApprovalSchema>;
export type SystemConfigUpdate = z.infer<typeof systemConfigUpdateSchema>;
export type ReportExport = z.infer<typeof reportExportSchema>;

// Business logic operation types
export type BusinessTierUpgrade = z.infer<typeof businessTierUpgradeSchema>;
export type QrCheckin = z.infer<typeof qrCheckinSchema>;
export type EnhancedWithdrawal = z.infer<typeof enhancedWithdrawalSchema>;
export type ProfitShareWithMaxout = z.infer<typeof profitShareWithMaxoutSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
