import { 
  type User, type InsertUser,
  type Card, type InsertCard,
  type Branch, type InsertBranch,
  type Staff, type InsertStaff,
  type Transaction, type InsertTransaction,
  type Kpi, type InsertKpi,
  type StaffKpi, type InsertStaffKpi,
  type Referral, type InsertReferral,
  type ProfitSharing, type InsertProfitSharing,
  type ProfitDistribution, type InsertProfitDistribution,
  type InvestmentPackage, type InsertInvestmentPackage,
  type SystemConfig, type InsertSystemConfig,
  type AuditLog, type InsertAuditLog,
  type UserBalance, type InsertUserBalance,
  type DepositRequest, type InsertDepositRequest,
  type UserSharesHistory, type InsertUserSharesHistory,
  type BusinessTierConfig, type InsertBusinessTierConfig,
  type AssetContribution, type InsertAssetContribution,
  type UserRoleUpdate, type TransactionApproval, type SystemConfigUpdate, type ReportExport,
  type BusinessTierUpgrade, type QrCheckin, type EnhancedWithdrawal, type UserProfileUpdate,
  validateQuarterBoundaries, determineBusinessTier, calculateShares, calculateWithdrawalTax
} from "@shared/schema";
import { randomUUID, scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Use the same password hashing as auth.ts
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Monetary utility functions to ensure consistent integer VND handling
function toIntegerVnd(amountString: string): number {
  return Math.floor(parseFloat(amountString || "0"));
}

function fromIntegerVnd(amountInteger: number): string {
  return Math.floor(amountInteger).toString();
}

function validatePercentageConfig(value: string): number {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > 100) {
    throw new Error(`Invalid percentage config: ${value}. Must be between 0-100.`);
  }
  return num / 100;
}

type SessionStore = session.Store & {
  get: (sid: string, callback: (err: any, session?: session.SessionData | null) => void) => void;
  set: (sid: string, session: session.SessionData, callback?: (err?: any) => void) => void;
  destroy: (sid: string, callback?: (err?: any) => void) => void;
};

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Card operations
  getCards(): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: string, card: Partial<InsertCard>): Promise<Card | undefined>;
  deleteCard(id: string): Promise<boolean>;
  
  // Branch operations
  getBranches(): Promise<Branch[]>;
  getBranch(id: string): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: string, branch: Partial<InsertBranch>): Promise<Branch | undefined>;
  
  // Staff operations
  getStaff(): Promise<Staff[]>;
  getStaffMember(id: string): Promise<Staff | undefined>;
  createStaffMember(staff: InsertStaff): Promise<Staff>;
  updateStaffMember(id: string, staff: Partial<InsertStaff>): Promise<Staff | undefined>;
  deleteStaffMember(id: string): Promise<boolean>;
  
  // Transaction operations
  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // KPI operations
  getKpis(): Promise<Kpi[]>;
  getKpisByBranch(branchId: string): Promise<Kpi[]>;
  getKpisByPeriod(period: string, periodValue: string): Promise<Kpi[]>;
  createKpi(kpi: InsertKpi): Promise<Kpi>;
  updateKpi(id: string, kpi: Partial<InsertKpi>): Promise<Kpi | undefined>;
  calculateBranchKpi(branchId: string, period: string, periodValue: string): Promise<number>;
  
  // Staff KPI operations
  getStaffKpis(): Promise<StaffKpi[]>;
  getStaffKpisByStaff(staffId: string): Promise<StaffKpi[]>;
  getStaffKpisByPeriod(period: string, periodValue: string): Promise<StaffKpi[]>;
  createStaffKpi(staffKpi: InsertStaffKpi): Promise<StaffKpi>;
  updateStaffKpi(id: string, staffKpi: Partial<InsertStaffKpi>): Promise<StaffKpi | undefined>;
  calculateStaffKpiPoints(staffId: string, period: string, periodValue: string): Promise<number>;
  processQuarterlyShares(period: string, periodValue: string): Promise<void>;
  
  // Referral operations
  getReferrals(): Promise<Referral[]>;
  getReferralsByReferrer(referrerId: string): Promise<Referral[]>;
  getReferralByCode(referralCode: string): Promise<Referral | undefined>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: string, referral: Partial<InsertReferral>): Promise<Referral | undefined>;
  generateReferralCode(staffId: string): Promise<string>;
  calculateReferralCommission(referralId: string): Promise<number>;
  processFirstTransaction(referralCode: string, transactionId: string): Promise<Referral | undefined>;
  markCommissionPaid(referralId: string, paidAmount: number): Promise<Referral | undefined>;
  processCommissionPayments(referrerId: string): Promise<number>;

  // Profit sharing operations
  getProfitSharings(): Promise<ProfitSharing[]>;
  getProfitSharing(id: string): Promise<ProfitSharing | undefined>;
  getProfitSharingByPeriod(period: string, periodValue: string): Promise<ProfitSharing | undefined>;
  createProfitSharing(profitSharing: InsertProfitSharing): Promise<ProfitSharing>;
  updateProfitSharing(id: string, profitSharing: Partial<InsertProfitSharing>): Promise<ProfitSharing | undefined>;
  calculateQuarterlyProfit(period: string, periodValue: string): Promise<{ revenue: number; expenses: number; profit: number }>;
  processQuarterlyProfitSharing(period: string, periodValue: string): Promise<ProfitSharing>;

  // Profit distribution operations
  getProfitDistributions(): Promise<ProfitDistribution[]>;
  getProfitDistributionsBySharing(profitSharingId: string): Promise<ProfitDistribution[]>;
  createProfitDistribution(distribution: InsertProfitDistribution): Promise<ProfitDistribution>;
  updateProfitDistribution(id: string, distribution: Partial<InsertProfitDistribution>): Promise<ProfitDistribution | undefined>;
  markDistributionPaid(distributionId: string): Promise<ProfitDistribution | undefined>;
  processAllDistributionPayments(profitSharingId: string): Promise<number>;

  // Investment package operations
  getInvestmentPackages(): Promise<InvestmentPackage[]>;
  getInvestmentPackage(id: string): Promise<InvestmentPackage | undefined>;
  getActiveInvestmentPackages(): Promise<InvestmentPackage[]>;
  createInvestmentPackage(packageData: InsertInvestmentPackage): Promise<InvestmentPackage>;
  updateInvestmentPackage(id: string, packageData: Partial<InsertInvestmentPackage>): Promise<InvestmentPackage | undefined>;
  
  // Cash flow operations
  createCashFlowTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getCashFlowTransactions(userId?: string): Promise<Transaction[]>;
  getCashFlowTransactionsByType(type: string): Promise<Transaction[]>;
  approveCashFlowTransaction(transactionId: string, approvedBy: string): Promise<Transaction | undefined>;
  rejectCashFlowTransaction(transactionId: string, approvedBy: string, reason?: string): Promise<Transaction | undefined>;
  calculateWithdrawalTax(amount: number): number;
  
  // Asset contribution operations
  createAssetContribution(contribution: InsertAssetContribution): Promise<AssetContribution>;
  getAssetContributions(userId?: string): Promise<AssetContribution[]>;
  getAssetContribution(id: string): Promise<AssetContribution | undefined>;
  approveAssetContribution(contributionId: string, approvedBy: string): Promise<AssetContribution | undefined>;
  rejectAssetContribution(contributionId: string, approvedBy: string, reason: string): Promise<AssetContribution | undefined>;
  
  // PAD Token operations
  getPadTokenHistory(userId?: string): Promise<Array<{date: string; amount: string; type: string; description: string}>>;
  calculateRoiProjection(userId: string, periods: number[]): Promise<Array<{period: string; projectedReturn: number; totalValue: number}>>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string, updatedBy: string): Promise<User | undefined>;
  getSystemConfigs(): Promise<SystemConfig[]>;
  getSystemConfig(configKey: string): Promise<SystemConfig | undefined>;
  updateSystemConfig(configKey: string, configValue: string, description?: string, updatedBy?: string): Promise<SystemConfig>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getPendingTransactions(): Promise<Transaction[]>;
  exportReportData(reportType: string, dateFrom?: string, dateTo?: string): Promise<any[]>;
  
  // Business logic operations
  // User balances
  getUserBalance(userId: string): Promise<UserBalance | undefined>;
  createUserBalance(balance: InsertUserBalance): Promise<UserBalance>;
  updateUserBalance(userId: string, balance: Partial<InsertUserBalance>): Promise<UserBalance | undefined>;
  addToUserBalance(userId: string, amount: number, description: string): Promise<UserBalance>;
  
  // Deposit requests 
  getDepositRequests(): Promise<DepositRequest[]>;
  getDepositRequest(id: string): Promise<DepositRequest | undefined>;
  getUserDepositRequests(userId: string): Promise<DepositRequest[]>;
  createDepositRequest(request: InsertDepositRequest): Promise<DepositRequest>;
  approveDepositRequest(requestId: string, approvedBy: string): Promise<DepositRequest | undefined>;
  rejectDepositRequest(requestId: string, approvedBy: string, reason: string): Promise<DepositRequest | undefined>;
  
  // User shares history
  getUserSharesHistory(userId: string): Promise<UserSharesHistory[]>;
  createUserSharesHistory(history: InsertUserSharesHistory): Promise<UserSharesHistory>;
  
  // Business tier configs
  getBusinessTierConfigs(): Promise<BusinessTierConfig[]>;
  getBusinessTierConfig(tierName: string): Promise<BusinessTierConfig | undefined>;
  createBusinessTierConfig(config: InsertBusinessTierConfig): Promise<BusinessTierConfig>;
  updateBusinessTierConfig(tierName: string, config: Partial<InsertBusinessTierConfig>): Promise<BusinessTierConfig | undefined>;
  
  // Business tier operations
  upgradeUserBusinessTier(userId: string, newTier: string, investmentAmount: number): Promise<User | undefined>;
  calculateUserShares(userId: string, amount: number): Promise<number>;
  updateUserShares(userId: string, shareAmount: number, description: string, transactionType: string): Promise<void>;
  checkMaxoutLimit(userId: string): Promise<{ reached: boolean; limit: number; current: number }>;
  
  // QR check-in operations
  createQrCheckin(checkin: { cardId: string; sessionType: string; notes?: string }): Promise<void>;
  updateCardSessions(cardId: string, decrement: number): Promise<Card | undefined>;
  
  // Enhanced withdrawal operations  
  createWithdrawalRequest(userId: string, amount: number, description: string): Promise<Transaction>;
  validateWithdrawalBalance(userId: string, amount: number): Promise<{ valid: boolean; availableBalance: number }>;
  
  // Quarterly profit sharing with maxout
  processQuarterlyProfitSharingWithMaxout(period: string, periodValue: string, respectMaxout: boolean): Promise<ProfitSharing>;
  
  // Session store
  sessionStore: SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private cards: Map<string, Card>;
  private branches: Map<string, Branch>;
  private staff: Map<string, Staff>;
  private transactions: Map<string, Transaction>;
  private kpis: Map<string, Kpi>;
  private staffKpis: Map<string, StaffKpi>;
  private referrals: Map<string, Referral>;
  private profitSharings: Map<string, ProfitSharing>;
  private profitDistributions: Map<string, ProfitDistribution>;
  private investmentPackages: Map<string, InvestmentPackage>;
  private systemConfigs: Map<string, SystemConfig>;
  private auditLogs: Map<string, AuditLog>;
  private userBalances: Map<string, UserBalance>;
  private depositRequests: Map<string, DepositRequest>;
  private userSharesHistory: Map<string, UserSharesHistory>;
  private businessTierConfigs: Map<string, BusinessTierConfig>;
  private assetContributions: Map<string, AssetContribution>;
  public sessionStore: SessionStore;

  constructor() {
    this.users = new Map();
    this.cards = new Map();
    this.branches = new Map();
    this.staff = new Map();
    this.transactions = new Map();
    this.kpis = new Map();
    this.staffKpis = new Map();
    this.referrals = new Map();
    this.profitSharings = new Map();
    this.profitDistributions = new Map();
    this.investmentPackages = new Map();
    this.systemConfigs = new Map();
    this.auditLogs = new Map();
    this.userBalances = new Map();
    this.depositRequests = new Map();
    this.userSharesHistory = new Map();
    this.businessTierConfigs = new Map();
    this.assetContributions = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with some sample data
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    // Initialize system updater for configurations
    let systemUpdater = 'system';
    
    // Create default admin user (only in development)
    if (process.env.NODE_ENV === 'development') {
      const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await hashPassword(adminPassword);
      
      const defaultAdmin: User = {
        id: 'admin-default-001',
        name: 'Admin',
        email: 'admin@phuan.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        refCode: null,
        businessTier: null,
        investmentAmount: '0',
        totalShares: '0',
        maxoutReached: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(defaultAdmin.id, defaultAdmin);
      systemUpdater = defaultAdmin.id; // Use admin ID as updater in DEV
      console.log('✅ Created default admin user: admin@phuan.com (DEV mode)');
    }

    // Create sample branches
    const branch1 = await this.createBranch({
      name: "Chi nhánh Quận 1",
      address: "123 Nguyễn Huệ, Q1",
      monthlyRevenue: "890000",
      staffCount: 8
    });
    
    const branch2 = await this.createBranch({
      name: "Chi nhánh Quận 3", 
      address: "456 Nam Kỳ Khởi Nghĩa, Q3",
      monthlyRevenue: "720000",
      staffCount: 6
    });

    // Create sample staff with meaningful share holdings
    const staff1 = await this.createStaffMember({
      name: "Nguyễn Văn An",
      email: "nva@phuanduong.com",
      position: "Quản lý chi nhánh",
      branchId: branch1.id,
      equityPercentage: "5.2",
      shares: 250  // 250 shares = 250M VND value
    });

    const staff2 = await this.createStaffMember({
      name: "Trần Thị Bình",
      email: "ttb@phuanduong.com", 
      position: "Trưởng phòng KD",
      branchId: branch2.id,
      equityPercentage: "3.8",
      shares: 150  // 150 shares = 150M VND value
    });

    const staff3 = await this.createStaffMember({
      name: "Lê Minh Cường",
      email: "lmc@phuanduong.com", 
      position: "Chuyên viên cao cấp",
      branchId: branch1.id,
      equityPercentage: "2.1",
      shares: 100  // 100 shares = 100M VND value
    });

    const staff4 = await this.createStaffMember({
      name: "Phạm Thu Hoa",
      email: "pth@phuanduong.com", 
      position: "Nhân viên kinh doanh",
      branchId: branch2.id,
      equityPercentage: "1.2",
      shares: 50   // 50 shares = 50M VND value
    });

    // Create sample cards
    await this.createCard({
      cardNumber: "1234-5678-9012-3456",
      cardType: "Gold",
      customerName: "Nguyễn Văn A",
      price: "50000000", // 50M VND
      remainingSessions: 10,
      status: "active"
    });

    await this.createCard({
      cardNumber: "1234-5678-9012-7890",
      cardType: "Silver", 
      customerName: "Trần Thị B",
      price: "20000000", // 20M VND
      remainingSessions: 5,
      status: "active"
    });

    // Create sample transactions
    await this.createTransaction({
      type: "income",
      amount: "150000",
      description: "Thanh toán thẻ VIP",
      branchId: branch1.id,
      cardId: Array.from(this.cards.values())[0]?.id
    });

    await this.createTransaction({
      type: "expense",
      amount: "50000",
      description: "Chi phí vận hành",
      branchId: branch1.id,
      cardId: null
    });

    // Create sample KPI data
    await this.createKpi({
      branchId: branch1.id,
      period: "month",
      periodValue: "2024-11",
      cardSales: 15,
      cardSalesRevenue: "450000000", // 450M VND
      revisitRate: "85.5", // 85.5%
      deviceRevenue: "120000000", // 120M VND
      totalRevenue: "570000000",
      expenses: "200000000",
      kpiScore: "88.5" // 88.5% KPI score
    });

    await this.createKpi({
      branchId: branch2.id,
      period: "month",
      periodValue: "2024-11", 
      cardSales: 8,
      cardSalesRevenue: "240000000", // 240M VND
      revisitRate: "65.2", // 65.2% - below target
      deviceRevenue: "80000000", // 80M VND
      totalRevenue: "320000000",
      expenses: "150000000",
      kpiScore: "68.5" // 68.5% KPI score - below 70% threshold
    });

    // Create comprehensive staff KPIs for multiple quarters
    await this.createStaffKpi({
      staffId: staff1.id,
      period: "quarter",
      periodValue: "2024-Q3",
      cardSales: 15,
      customerRetention: "85.2",
      totalPoints: "160.2", // 15*5 + 85.2 = 160.2 points
      score: "85.0",
      slotsEarned: 3, // 160.2 / 50 = 3 slots
      sharesAwarded: "150", // 3 * 50 shares
      targetRevenue: "180000000", // 180M VND target
      bonusAmount: "8500000", // 8.5M VND bonus
      profitShareAmount: "12000000", // 12M VND profit share
      isProcessed: true
    });

    await this.createStaffKpi({
      staffId: staff1.id,
      period: "quarter", 
      periodValue: "2024-Q4",
      cardSales: 18,
      customerRetention: "88.7",
      totalPoints: "178.7", // 18*5 + 88.7 = 178.7 points
      score: "92.0",
      slotsEarned: 3, // 178.7 / 50 = 3 slots
      sharesAwarded: "150", // 3 * 50 shares
      targetRevenue: "200000000", // 200M VND target
      bonusAmount: "12000000", // 12M VND bonus
      profitShareAmount: "15000000", // 15M VND profit share
      isProcessed: false
    });

    await this.createStaffKpi({
      staffId: staff2.id,
      period: "quarter",
      periodValue: "2024-Q3",
      cardSales: 8,
      customerRetention: "72.3",
      totalPoints: "112.3", // 8*5 + 72.3 = 112.3 points
      score: "75.0",
      slotsEarned: 2, // 112.3 / 50 = 2 slots
      sharesAwarded: "100", // 2 * 50 shares
      targetRevenue: "120000000", // 120M VND target
      bonusAmount: "5500000", // 5.5M VND bonus
      profitShareAmount: "8000000", // 8M VND profit share
      isProcessed: true
    });

    await this.createStaffKpi({
      staffId: staff2.id,
      period: "quarter",
      periodValue: "2024-Q4",
      cardSales: 10,
      customerRetention: "78.9",
      totalPoints: "128.9", // 10*5 + 78.9 = 128.9 points
      score: "82.0", 
      slotsEarned: 2, // 128.9 / 50 = 2 slots
      sharesAwarded: "100", // 2 * 50 shares
      targetRevenue: "140000000", // 140M VND target
      bonusAmount: "7200000", // 7.2M VND bonus
      profitShareAmount: "10000000", // 10M VND profit share
      isProcessed: false
    });

    await this.createStaffKpi({
      staffId: staff3.id,
      period: "quarter",
      periodValue: "2024-Q4",
      cardSales: 12,
      customerRetention: "65.4",
      totalPoints: "125.4", // 12*5 + 65.4 = 125.4 points
      score: "78.5",
      slotsEarned: 2, // 125.4 / 50 = 2 slots
      sharesAwarded: "100", // 2 * 50 shares
      targetRevenue: "100000000", // 100M VND target
      bonusAmount: "6000000", // 6M VND bonus
      profitShareAmount: "7500000", // 7.5M VND profit share
      isProcessed: false
    });

    await this.createStaffKpi({
      staffId: staff4.id,
      period: "quarter",
      periodValue: "2024-Q4", 
      cardSales: 6,
      customerRetention: "42.1",
      totalPoints: "72.1", // 6*5 + 42.1 = 72.1 points
      score: "65.0",
      slotsEarned: 1, // 72.1 / 50 = 1 slot
      sharesAwarded: "50", // 1 * 50 shares  
      targetRevenue: "80000000", // 80M VND target
      bonusAmount: "3200000", // 3.2M VND bonus
      profitShareAmount: "4000000", // 4M VND profit share
      isProcessed: false
    });

    // Create sample referrals with enhanced data
    const referralCode1 = await this.generateReferralCode(staff1.id);
    await this.createReferral({
      referrerId: staff1.id,
      referredUserId: null, // Not yet assigned
      referralCode: referralCode1,
      customerName: "Nguyễn Thanh Long",
      firstTransactionId: null,
      contributionValue: "45000000", // 45M VND first transaction
      commissionRate: "8.0",
      commissionAmount: "3600000", // 8% of 45M = 3.6M VND
      commissionPaid: "0",
      status: "pending"
    });

    const referralCode2 = await this.generateReferralCode(staff2.id);
    await this.createReferral({
      referrerId: staff2.id,
      referredUserId: null,
      referralCode: referralCode2,
      customerName: "Trần Văn Khoa",
      firstTransactionId: null,
      contributionValue: "30000000", // 30M VND first transaction
      commissionRate: "8.0",
      commissionAmount: "2400000", // 8% of 30M = 2.4M VND
      commissionPaid: "2400000", // Already paid
      status: "completed"
    });

    const referralCode3 = await this.generateReferralCode(staff3.id);
    await this.createReferral({
      referrerId: staff3.id,
      referredUserId: null,
      referralCode: referralCode3,
      customerName: "Lê Thị Mai",
      firstTransactionId: null,
      contributionValue: "20000000", // 20M VND first transaction
      commissionRate: "8.0",
      commissionAmount: "1600000", // 8% of 20M = 1.6M VND
      commissionPaid: "800000", // Partially paid
      status: "pending"
    });

    // Update staff timestamps to show recent activity
    await this.updateStaffMember(staff1.id, { updatedAt: new Date() });
    await this.updateStaffMember(staff2.id, { updatedAt: new Date(Date.now() - 86400000) }); // 1 day ago
    await this.updateStaffMember(staff3.id, { updatedAt: new Date(Date.now() - 172800000) }); // 2 days ago  
    await this.updateStaffMember(staff4.id, { updatedAt: new Date(Date.now() - 259200000) }); // 3 days ago

    // Initialize default system configurations
    await this.updateSystemConfig("maxout_limit_percentage", "210", "Maximum payout limit as percentage of card price", systemUpdater);
    await this.updateSystemConfig("kpi_threshold_points", "50", "Minimum KPI points required per quarter for shares", systemUpdater);
    await this.updateSystemConfig("profit_share_rate", "49", "Percentage of quarterly profit distributed to shareholders", systemUpdater);
    await this.updateSystemConfig("withdrawal_minimum", "5000000", "Minimum withdrawal amount in VND", systemUpdater);
    await this.updateSystemConfig("withdrawal_tax_rate", "10", "Tax rate percentage for withdrawals over 10M VND", systemUpdater);
    await this.updateSystemConfig("corporate_tax_rate", "20", "Corporate tax rate percentage on gross profit", systemUpdater);
    await this.updateSystemConfig("referral_commission_rate", "8", "Referral commission rate percentage", systemUpdater);
    await this.updateSystemConfig("shares_per_slot", "50", "Number of shares awarded per slot", systemUpdater);
    
    // Initialize business tier configs
    await this.createBusinessTierConfig({
      tierName: 'founder',
      minInvestmentAmount: '245000000',
      shareMultiplier: '1.0',
      maxShares: null,
      description: 'Founder tier - unlimited shares for investments ≥245M VND',
      benefits: 'Unlimited shares, highest profit sharing percentage, voting rights',
    });

    await this.createBusinessTierConfig({
      tierName: 'angel',
      minInvestmentAmount: '100000000', 
      shareMultiplier: '1.0',
      maxShares: null,
      description: 'Angel tier - 1M VND = 1 share with 5x payout maxout',
      benefits: '5x investment payout cap, maxout protection, priority support',
    });

    await this.createBusinessTierConfig({
      tierName: 'branch',
      minInvestmentAmount: '0',
      shareMultiplier: '1.0', 
      maxShares: '200',
      description: 'Branch tier - maximum 200 shares based on KPI performance',
      benefits: 'KPI-based share allocation up to 200 shares, branch management access',
    });

    await this.createBusinessTierConfig({
      tierName: 'customer',
      minInvestmentAmount: '0',
      shareMultiplier: '1.0',
      maxShares: null,
      description: 'Card Customer - 1M VND = 1 share with 210% card price maxout',
      benefits: '210% card price payout cap, 5% VIP support, card-based benefits',
    });

    await this.createBusinessTierConfig({
      tierName: 'staff',
      minInvestmentAmount: '0',
      shareMultiplier: '1.0',
      maxShares: null,
      description: 'Staff - 50 points = 50 shares per quarter',
      benefits: 'Performance-based shares, quarterly rewards, internal access',
    });

    await this.createBusinessTierConfig({
      tierName: 'affiliate',
      minInvestmentAmount: '0',
      shareMultiplier: '0.0',
      maxShares: '0',
      description: 'Affiliate - 8% commission on referrals, no shares',
      benefits: '8% referral commission, no shares allocation',
    });
  }

  // User balance operations
  async getUserBalance(userId: string): Promise<UserBalance | undefined> {
    return this.userBalances.get(userId);
  }

  async createUserBalance(balance: InsertUserBalance): Promise<UserBalance> {
    const userBalance: UserBalance = {
      ...balance,
      createdAt: balance.createdAt || new Date(),
      updatedAt: balance.updatedAt || new Date(),
    };
    this.userBalances.set(balance.userId, userBalance);
    return userBalance;
  }

  async updateUserBalance(userId: string, balance: Partial<InsertUserBalance>): Promise<UserBalance | undefined> {
    const existingBalance = this.userBalances.get(userId);
    if (!existingBalance) return undefined;

    const updatedBalance = { ...existingBalance, ...balance, updatedAt: new Date() };
    this.userBalances.set(userId, updatedBalance);
    return updatedBalance;
  }

  async addToUserBalance(userId: string, amountVnd: number, description: string): Promise<UserBalance> {
    // Ensure we work with integer VND to avoid floating point errors
    const amountInteger = Math.floor(amountVnd);
    
    let balance = await this.getUserBalance(userId);
    
    if (!balance) {
      // Create new balance if it doesn't exist
      balance = await this.createUserBalance({
        userId,
        availableBalance: amountInteger.toString(),
        totalShares: "0",
        maxoutReached: false,
        description,
      });
    } else {
      // Update existing balance using integer arithmetic
      const currentBalance = Math.floor(parseFloat(balance.availableBalance || "0"));
      const newBalance = currentBalance + amountInteger;
      balance = await this.updateUserBalance(userId, {
        availableBalance: newBalance.toString(),
        description,
      });
    }
    
    return balance!;
  }

  // Deposit request operations
  async getDepositRequests(): Promise<DepositRequest[]> {
    return Array.from(this.depositRequests.values());
  }

  async getDepositRequest(id: string): Promise<DepositRequest | undefined> {
    return this.depositRequests.get(id);
  }

  async getUserDepositRequests(userId: string): Promise<DepositRequest[]> {
    return Array.from(this.depositRequests.values()).filter(
      request => request.userId === userId
    );
  }

  async createDepositRequest(request: InsertDepositRequest): Promise<DepositRequest> {
    const id = randomUUID();
    const depositRequest: DepositRequest = {
      ...request,
      id,
      status: request.status || 'pending',
      createdAt: request.createdAt || new Date(),
      updatedAt: request.updatedAt || new Date(),
    };
    this.depositRequests.set(id, depositRequest);
    return depositRequest;
  }

  async approveDepositRequest(requestId: string, approvedBy: string): Promise<DepositRequest | undefined> {
    const request = this.depositRequests.get(requestId);
    if (!request) return undefined;

    const updatedRequest = {
      ...request,
      status: 'approved' as const,
      approvedBy,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };
    this.depositRequests.set(requestId, updatedRequest);

    // Process the approved deposit - add to balance and update user tier/shares
    const user = await this.getUser(request.userId);
    if (user && request.amount) {
      const amount = parseFloat(request.amount);
      
      // Add to user balance
      await this.addToUserBalance(request.userId, amount, `Approved deposit request: ${request.businessTier}`);
      
      // Update user business tier and shares
      if (request.businessTier) {
        await this.upgradeUserBusinessTier(request.userId, request.businessTier, amount);
      }

      // Create shares history record
      const shareAmount = await this.calculateUserShares(request.userId, amount);
      await this.createUserSharesHistory({
        userId: request.userId,
        changeAmount: shareAmount.toString(),
        changeType: 'deposit',
        description: `Deposit approved: ${request.businessTier} tier`,
        transactionId: requestId,
      });
    }

    return updatedRequest;
  }

  async rejectDepositRequest(requestId: string, approvedBy: string, reason: string): Promise<DepositRequest | undefined> {
    const request = this.depositRequests.get(requestId);
    if (!request) return undefined;

    const updatedRequest = {
      ...request,
      status: 'rejected' as const,
      approvedBy,
      approvedAt: new Date(),
      notes: reason,
      updatedAt: new Date(),
    };
    this.depositRequests.set(requestId, updatedRequest);
    return updatedRequest;
  }

  // User shares history operations
  async getUserSharesHistory(userId: string): Promise<UserSharesHistory[]> {
    return Array.from(this.userSharesHistory.values()).filter(
      history => history.userId === userId
    );
  }

  async createUserSharesHistory(history: InsertUserSharesHistory): Promise<UserSharesHistory> {
    const id = randomUUID();
    const sharesHistory: UserSharesHistory = {
      ...history,
      id,
      timestamp: history.timestamp || new Date(),
    };
    this.userSharesHistory.set(id, sharesHistory);
    return sharesHistory;
  }

  // Business tier config operations
  async getBusinessTierConfigs(): Promise<BusinessTierConfig[]> {
    return Array.from(this.businessTierConfigs.values());
  }

  async getBusinessTierConfig(tierName: string): Promise<BusinessTierConfig | undefined> {
    return this.businessTierConfigs.get(tierName);
  }

  async createBusinessTierConfig(config: InsertBusinessTierConfig): Promise<BusinessTierConfig> {
    const businessTierConfig: BusinessTierConfig = {
      ...config,
      createdAt: config.createdAt || new Date(),
      updatedAt: config.updatedAt || new Date(),
    };
    this.businessTierConfigs.set(config.tierName, businessTierConfig);
    return businessTierConfig;
  }

  async updateBusinessTierConfig(tierName: string, config: Partial<InsertBusinessTierConfig>): Promise<BusinessTierConfig | undefined> {
    const existingConfig = this.businessTierConfigs.get(tierName);
    if (!existingConfig) return undefined;

    const updatedConfig = { ...existingConfig, ...config, updatedAt: new Date() };
    this.businessTierConfigs.set(tierName, updatedConfig);
    return updatedConfig;
  }

  // Business tier operations
  async upgradeUserBusinessTier(userId: string, newTier: string, investmentAmount: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const tierConfig = await this.getBusinessTierConfig(newTier);
    if (!tierConfig) return undefined;

    // Calculate shares based on tier rules (1M VND = 1 share base)
    const shareAmount = await this.calculateUserShares(userId, investmentAmount);

    const updatedUser = await this.updateUser(userId, {
      businessTier: newTier,
      investmentAmount: investmentAmount.toString(),
      totalShares: shareAmount.toString(),
    });

    // Update user balance with shares
    await this.updateUserBalance(userId, {
      totalShares: shareAmount.toString(),
    });

    return updatedUser;
  }

  async calculateUserShares(userId: string, amountVnd: number): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) return 0;

    const tierConfig = user.businessTier ? await this.getBusinessTierConfig(user.businessTier) : null;
    
    // Convert to integer VND to avoid floating point errors
    const amountInteger = Math.floor(amountVnd);
    
    // Base calculation: 1M VND = 1 share (consistent across all tiers except affiliates)
    const baseShares = Math.floor(amountInteger / 1000000);
    
    // Apply tier-specific share multiplier (most are 1.0)
    const multiplier = tierConfig ? parseFloat(tierConfig.shareMultiplier) : 1.0;
    const calculatedShares = Math.floor(baseShares * multiplier);

    // Affiliates get no shares
    if (user.businessTier === 'affiliate') {
      return 0;
    }

    // Check max shares limit for specific tiers (e.g., branches have 200 max shares)
    if (tierConfig?.maxShares) {
      const maxShares = parseFloat(tierConfig.maxShares);
      const currentShares = parseFloat(user.totalShares || "0");
      const availableShares = Math.max(0, maxShares - currentShares);
      const finalShares = Math.min(calculatedShares, availableShares);
      
      // Update maxoutReached if user hits their share limit
      if (currentShares + finalShares >= maxShares) {
        await this.updateUser(userId, { maxoutReached: true });
      }
      
      return finalShares;
    }

    return calculatedShares;
  }

  async updateUserShares(userId: string, shareAmount: number, description: string, transactionType: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const currentShares = parseFloat(user.totalShares || "0");
    const newTotalShares = currentShares + shareAmount;

    await this.updateUser(userId, {
      totalShares: newTotalShares.toString(),
    });

    await this.updateUserBalance(userId, {
      totalShares: newTotalShares.toString(),
    });

    // Record the change in history
    await this.createUserSharesHistory({
      userId,
      changeAmount: shareAmount.toString(),
      changeType: transactionType as any,
      description,
    });
  }

  // Centralized cumulative payout computation including ALL payout sources
  private async calculateCumulativePayouts(userId: string): Promise<number> {
    // Profit sharing distributions
    const profitDistributions = Array.from(this.profitDistributions.values()).filter(pd => pd.userId === userId);
    const totalProfitPayouts = profitDistributions.reduce((sum, pd) => toIntegerVnd(pd.distributionAmount), 0);
    
    // Approved withdrawals
    const approvedWithdrawals = Array.from(this.transactions.values()).filter(t => 
      t.userId === userId && t.type === 'withdrawal' && t.status === 'approved'
    );
    const totalWithdrawals = approvedWithdrawals.reduce((sum, t) => toIntegerVnd(t.amount), 0);
    
    // Referral commissions (paid out commissions from referrals table)
    const referralCommissions = Array.from(this.referrals.values()).filter(r => r.referrerId === userId);
    const totalCommissions = referralCommissions.reduce((sum, r) => toIntegerVnd(r.commissionPaid || "0"), 0);
    
    // VIP support payouts (5% support for customer tier)
    const vipSupports = Array.from(this.transactions.values()).filter(t =>
      t.userId === userId && (t.type === 'vip_support' || t.description?.includes('VIP support')) && t.status === 'approved'
    );
    const totalVipSupport = vipSupports.reduce((sum, t) => toIntegerVnd(t.amount), 0);
    
    // KPI bonuses and other bonuses
    const bonuses = Array.from(this.transactions.values()).filter(t =>
      t.userId === userId && (t.type === 'kpi_bonus' || t.type === 'bonus') && t.status === 'approved'
    );
    const totalBonuses = bonuses.reduce((sum, t) => toIntegerVnd(t.amount), 0);

    return totalProfitPayouts + totalWithdrawals + totalCommissions + totalVipSupport + totalBonuses;
  }

  async checkMaxoutLimit(userId: string): Promise<{ reached: boolean; limit: number; current: number }> {
    const user = await this.getUser(userId);
    if (!user) return { reached: false, limit: 0, current: 0 };

    // Get total cumulative payouts from all sources
    const totalCumulativePayouts = await this.calculateCumulativePayouts(userId);

    // Customer tier: 210% of total card prices owned
    if (user.businessTier === 'customer') {
      // Calculate total card prices for this customer
      const userCards = Array.from(this.cards.values()).filter(card => card.ownerId === userId);
      const totalCardValue = userCards.reduce((sum, card) => toIntegerVnd(card.price), 0);
      
      const maxoutLimit = Math.floor(totalCardValue * 2.1); // 210% of card prices
      
      return {
        reached: totalCumulativePayouts >= maxoutLimit,
        limit: maxoutLimit,
        current: totalCumulativePayouts,
      };
    }

    // Angel tier: 5x investment amount
    if (user.businessTier === 'angel') {
      const investmentAmount = toIntegerVnd(user.investmentAmount || "0");
      const maxoutLimit = investmentAmount * 5; // 5x investment
      
      return {
        reached: totalCumulativePayouts >= maxoutLimit,
        limit: maxoutLimit,
        current: totalCumulativePayouts,
      };
    }

    // Branch, Staff, and Founders have no payout limits
    return { reached: false, limit: 0, current: totalCumulativePayouts };
  }

  // QR check-in operations
  async createQrCheckin(checkin: { cardId: string; sessionType: string; notes?: string }): Promise<void> {
    const card = await this.getCard(checkin.cardId);
    if (!card) return;

    // Create transaction record for QR check-in
    await this.createTransaction({
      userId: card.ownerId || "",
      amount: "0",
      type: "qr_checkin",
      description: `QR Check-in: ${checkin.sessionType} ${checkin.notes || ""}`,
      status: "approved",
      approvedBy: "system",
    });

    // Update card's last check-in time
    await this.updateCard(checkin.cardId, {
      lastCheckIn: new Date(),
    });

    // Decrement remaining sessions for certain session types
    if (checkin.sessionType === 'premium_session') {
      await this.updateCardSessions(checkin.cardId, 1);
    }
  }

  async updateCardSessions(cardId: string, decrement: number): Promise<Card | undefined> {
    const card = await this.getCard(cardId);
    if (!card) return undefined;

    const currentSessions = card.remainingSessions || 0;
    const newSessions = Math.max(0, currentSessions - decrement);

    return await this.updateCard(cardId, {
      remainingSessions: newSessions,
    });
  }

  // Enhanced withdrawal operations
  async createWithdrawalRequest(userId: string, amount: number, description: string): Promise<Transaction> {
    const tax = this.calculateWithdrawalTax(amount);
    const netAmount = amount - tax;

    const transaction = await this.createTransaction({
      userId,
      amount: amount.toString(),
      type: "withdrawal",
      description: `${description} (Tax: ${tax} VND, Net: ${netAmount} VND)`,
      status: "pending",
      taxAmount: tax.toString(),
    });

    // Deduct from user balance (pending approval)
    const balance = await this.getUserBalance(userId);
    if (balance) {
      const currentBalance = parseFloat(balance.availableBalance);
      await this.updateUserBalance(userId, {
        availableBalance: (currentBalance - amount).toString(),
        description: `Withdrawal request: ${description}`,
      });
    }

    return transaction;
  }

  async validateWithdrawalBalance(userId: string, amount: number): Promise<{ valid: boolean; availableBalance: number }> {
    const balance = await this.getUserBalance(userId);
    if (!balance) return { valid: false, availableBalance: 0 };

    const availableBalance = parseFloat(balance.availableBalance || "0");
    const withdrawalMinimum = 5000000; // 5M VND minimum

    return {
      valid: availableBalance >= amount && amount >= withdrawalMinimum,
      availableBalance,
    };
  }

  // Quarterly profit sharing with maxout
  async processQuarterlyProfitSharingWithMaxout(period: string, grossProfitValue: string, respectMaxout: boolean): Promise<ProfitSharing> {
    const grossProfit = parseFloat(grossProfitValue);
    
    // Calculate corporate tax and net profit after tax
    const corporateTaxConfig = await this.getSystemConfig("corporate_tax_rate");
    const corporateTaxRate = corporateTaxConfig ? parseFloat(corporateTaxConfig.configValue) / 100 : 0.20; // Default 20%
    
    const corporateTax = grossProfit * corporateTaxRate;
    const netProfitAfterTax = grossProfit - corporateTax;
    
    // 49% of net profit after corporate tax goes to shareholders
    const shareableProfit = netProfitAfterTax * 0.49;

    // Get all users with shares (excluding affiliates who don't get shares)
    const usersWithShares = Array.from(this.users.values()).filter(user => 
      parseFloat(user.totalShares || "0") > 0 && user.businessTier !== 'affiliate'
    );

    const totalShares = usersWithShares.reduce((sum, user) => 
      sum + parseFloat(user.totalShares || "0"), 0
    );

    // Create profit sharing record
    const profitSharing = await this.createProfitSharing({
      period,
      totalProfit: netProfitAfterTax.toString(),
      distributableAmount: shareableProfit.toString(), 
      totalShares: totalShares.toString(),
      status: "processing",
      approvedBy: "system",
    });

    // Process individual distributions with redistribution for maxout cases
    let totalDistributed = 0;
    const distributions: Array<{user: any, shares: number, originalPortion: number, finalAmount: number, maxoutApplied: boolean}> = [];
    
    // First pass: Calculate initial distributions and track maxout cases
    for (const user of usersWithShares) {
      const userShares = parseFloat(user.totalShares || "0");
      const userPortion = totalShares > 0 ? (userShares / totalShares) * shareableProfit : 0;
      
      let finalAmount = userPortion;
      let maxoutApplied = false;

      // Apply maxout check if enabled
      if (respectMaxout) {
        const maxoutCheck = await this.checkMaxoutLimit(user.id);
        if (maxoutCheck.reached) {
          // Calculate remaining capacity before hitting maxout
          const remainingCapacity = Math.max(0, maxoutCheck.limit - maxoutCheck.current);
          finalAmount = Math.min(userPortion, remainingCapacity);
          maxoutApplied = finalAmount < userPortion;
        }
      }

      distributions.push({
        user, 
        shares: userShares,
        originalPortion: userPortion,
        finalAmount,
        maxoutApplied
      });
      
      totalDistributed += finalAmount;
    }

    // Iterative redistribution of remaining funds to maximize 49% distribution
    let remainingPool = shareableProfit - totalDistributed;
    let redistributionRounds = 0;
    const maxRedistributionRounds = 10; // Prevent infinite loops

    while (remainingPool > 1 && redistributionRounds < maxRedistributionRounds) {
      redistributionRounds++;
      
      // Find users who can still receive more (not maxed out)
      const eligibleDistributions = [];
      for (const dist of distributions) {
        if (respectMaxout) {
          const maxoutCheck = await this.checkMaxoutLimit(dist.user.id);
          const usedCapacity = maxoutCheck.current;
          const remainingCapacity = Math.max(0, maxoutCheck.limit - usedCapacity - Math.floor(dist.finalAmount));
          
          if (remainingCapacity > 0 || !maxoutCheck.reached) {
            eligibleDistributions.push({ ...dist, remainingCapacity });
          }
        } else {
          eligibleDistributions.push({ ...dist, remainingCapacity: Infinity });
        }
      }

      if (eligibleDistributions.length === 0) {
        break; // No one can receive more funds
      }

      // Calculate shares for eligible users
      const totalEligibleShares = eligibleDistributions.reduce((sum, d) => sum + d.shares, 0);
      
      let roundDistributed = 0;
      for (const eligibleDist of eligibleDistributions) {
        const shareRatio = eligibleDist.shares / totalEligibleShares;
        const allocation = Math.floor(shareRatio * remainingPool);
        
        let actualAllocation = allocation;
        if (respectMaxout && isFinite(eligibleDist.remainingCapacity)) {
          actualAllocation = Math.min(allocation, eligibleDist.remainingCapacity);
        }

        // Find and update the original distribution
        const originalDist = distributions.find(d => d.user.id === eligibleDist.user.id);
        if (originalDist && actualAllocation > 0) {
          originalDist.finalAmount += actualAllocation;
          roundDistributed += actualAllocation;
        }
      }

      remainingPool -= roundDistributed;
      
      // If we distributed very little this round, break to avoid infinite loops
      if (roundDistributed < Math.min(10, remainingPool * 0.01)) {
        break;
      }
    }

    // Handle final remainder with proper treasury booking
    const finalRemainder = Math.floor(remainingPool);
    if (finalRemainder > 0) {
      // Create a treasury rollover transaction for the undistributed remainder
      await this.createTransaction({
        userId: 'system',
        amount: fromIntegerVnd(finalRemainder),
        type: 'treasury_rollover',
        description: `Profit sharing Q${period} remainder: ${finalRemainder} VND after ${redistributionRounds} redistribution rounds`,
        status: 'approved',
        approvedBy: 'system',
      });

      // Record audit log for transparency
      await this.createAuditLog({
        userId: 'system',
        action: 'profit_sharing_remainder',
        entityType: 'profit_sharing',
        entityId: profitSharing.id,
        details: `Undistributed remainder: ${finalRemainder} VND booked to treasury rollover after ${redistributionRounds} rounds`,
      });
    }

    // Calculate final distribution total for reconciliation
    const finalDistributionTotal = distributions.reduce((sum, dist) => sum + Math.floor(dist.finalAmount), 0);
    const totalAccountedFor = finalDistributionTotal + finalRemainder;
    
    // Ensure 49% pool is fully accounted for (distributions + remainder = shareableProfit)
    const reconciliationDifference = Math.floor(shareableProfit) - totalAccountedFor;
    if (Math.abs(reconciliationDifference) > 1) {
      await this.createAuditLog({
        userId: 'system',
        action: 'profit_sharing_reconciliation_error',
        entityType: 'profit_sharing', 
        entityId: profitSharing.id,
        details: `RECONCILIATION ERROR: Expected ${Math.floor(shareableProfit)} VND, accounted ${totalAccountedFor} VND, difference: ${reconciliationDifference} VND`,
      });
    }

    // Third pass: Create distribution records and update balances
    for (const dist of distributions) {
      const integerAmount = Math.floor(dist.finalAmount);
      
      // Create distribution record
      await this.createProfitDistribution({
        profitSharingId: profitSharing.id,
        userId: dist.user.id,
        shareAmount: dist.shares.toString(),
        distributionAmount: integerAmount.toString(),
        maxoutApplied: dist.maxoutApplied,
        status: "approved",
      });

      // Add to user balance (only if amount > 0)
      if (integerAmount > 0) {
        await this.addToUserBalance(dist.user.id, integerAmount, 
          `Quarterly profit sharing Q${period}: ${dist.shares} shares (${dist.maxoutApplied ? 'maxout applied' : 'full amount'})`
        );
        
        // Update maxoutReached status if user hit their limit
        if (dist.maxoutApplied) {
          await this.updateUser(dist.user.id, { maxoutReached: true });
        }
      }
    }

    // Update profit sharing status to completed
    return await this.updateProfitSharing(profitSharing.id, {
      status: "completed",
      processedAt: new Date(),
    }) || profitSharing;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      status: insertUser.status || "active",
      refCode: insertUser.refCode || null,
      businessTier: insertUser.businessTier || null,
      investmentAmount: insertUser.investmentAmount || "0",
      totalShares: insertUser.totalShares || "0",
      maxoutReached: insertUser.maxoutReached || false,
      createdAt: insertUser.createdAt || now,
      updatedAt: insertUser.updatedAt || now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Card operations
  async getCards(): Promise<Card[]> {
    return Array.from(this.cards.values());
  }

  async getCard(id: string): Promise<Card | undefined> {
    return this.cards.get(id);
  }

  async createCard(insertCard: InsertCard): Promise<Card> {
    const id = randomUUID();
    const card: Card = { 
      ...insertCard, 
      id,
      issuedDate: new Date(),
      lastCheckIn: null,
      status: insertCard.status || "active",
      ownerId: insertCard.ownerId || null,
      remainingSessions: insertCard.remainingSessions || 0,
      shareHistory: insertCard.shareHistory || "",
      connectionCommission: insertCard.connectionCommission || "8.0",
      vipSupport: insertCard.vipSupport || "5.0",
      currentShares: insertCard.currentShares || "0",
      maxoutLimit: insertCard.maxoutLimit || (parseFloat(insertCard.price) * 2.1).toString()
    };
    this.cards.set(id, card);
    return card;
  }

  async updateCard(id: string, updateData: Partial<InsertCard>): Promise<Card | undefined> {
    const card = this.cards.get(id);
    if (!card) return undefined;
    
    const updatedCard = { ...card, ...updateData };
    this.cards.set(id, updatedCard);
    return updatedCard;
  }

  async deleteCard(id: string): Promise<boolean> {
    return this.cards.delete(id);
  }

  // Branch operations
  async getBranches(): Promise<Branch[]> {
    return Array.from(this.branches.values());
  }

  async getBranch(id: string): Promise<Branch | undefined> {
    return this.branches.get(id);
  }

  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const id = randomUUID();
    const branch: Branch = { 
      ...insertBranch, 
      id,
      monthlyRevenue: insertBranch.monthlyRevenue || "0",
      staffCount: insertBranch.staffCount || 0,
      currentKpi: insertBranch.currentKpi || "0",
      monthlyTarget: insertBranch.monthlyTarget || "0"
    };
    this.branches.set(id, branch);
    return branch;
  }

  async updateBranch(id: string, updateData: Partial<InsertBranch>): Promise<Branch | undefined> {
    const branch = this.branches.get(id);
    if (!branch) return undefined;
    
    const updatedBranch = { ...branch, ...updateData };
    this.branches.set(id, updatedBranch);
    return updatedBranch;
  }

  // Staff operations
  async getStaff(): Promise<Staff[]> {
    return Array.from(this.staff.values());
  }

  async getStaffMember(id: string): Promise<Staff | undefined> {
    return this.staff.get(id);
  }

  async createStaffMember(insertStaff: InsertStaff): Promise<Staff> {
    const id = randomUUID();
    const staffMember: Staff = { 
      ...insertStaff, 
      id,
      branchId: insertStaff.branchId || null,
      equityPercentage: insertStaff.equityPercentage || "0",
      shares: insertStaff.shares ?? 0,
      updatedAt: new Date()
    };
    this.staff.set(id, staffMember);
    return staffMember;
  }

  async updateStaffMember(id: string, updateData: Partial<InsertStaff>): Promise<Staff | undefined> {
    const staffMember = this.staff.get(id);
    if (!staffMember) return undefined;
    
    const updatedStaff = { ...staffMember, ...updateData };
    this.staff.set(id, updatedStaff);
    return updatedStaff;
  }

  async deleteStaffMember(id: string): Promise<boolean> {
    return this.staff.delete(id);
  }

  // Transaction operations
  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = { 
      ...insertTransaction, 
      id,
      date: new Date(),
      branchId: insertTransaction.branchId || null,
      cardId: insertTransaction.cardId || null,
      userId: insertTransaction.userId || null,
      referralCode: insertTransaction.referralCode || null,
      status: insertTransaction.status || "pending",
      taxAmount: insertTransaction.taxAmount || "0",
      documentPath: insertTransaction.documentPath || null,
      packageId: insertTransaction.packageId || null,
      approvedBy: insertTransaction.approvedBy || null,
      approvedAt: insertTransaction.approvedAt || null
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  // KPI operations
  async getKpis(): Promise<Kpi[]> {
    return Array.from(this.kpis.values());
  }

  async createKpi(insertKpi: InsertKpi): Promise<Kpi> {
    const id = randomUUID();
    const kpi: Kpi = { 
      ...insertKpi, 
      id,
      branchId: insertKpi.branchId || null,
      cardSales: insertKpi.cardSales || 0,
      cardSalesRevenue: insertKpi.cardSalesRevenue || "0",
      revisitRate: insertKpi.revisitRate || "0",
      deviceRevenue: insertKpi.deviceRevenue || "0",
      totalRevenue: insertKpi.totalRevenue || "0", 
      expenses: insertKpi.expenses || "0",
      kpiScore: insertKpi.kpiScore || "0",
      createdAt: new Date()
    };
    this.kpis.set(id, kpi);
    return kpi;
  }

  async getKpisByBranch(branchId: string): Promise<Kpi[]> {
    return Array.from(this.kpis.values()).filter(kpi => kpi.branchId === branchId);
  }

  async getKpisByPeriod(period: string, periodValue: string): Promise<Kpi[]> {
    return Array.from(this.kpis.values()).filter(
      kpi => kpi.period === period && kpi.periodValue === periodValue
    );
  }

  async updateKpi(id: string, updateData: Partial<InsertKpi>): Promise<Kpi | undefined> {
    const kpi = this.kpis.get(id);
    if (!kpi) {
      return undefined;
    }
    const updatedKpi = { ...kpi, ...updateData };
    this.kpis.set(id, updatedKpi);
    return updatedKpi;
  }

  async calculateBranchKpi(branchId: string, period: string, periodValue: string): Promise<number> {
    const kpis = await this.getKpisByBranch(branchId);
    const periodKpis = kpis.filter(kpi => kpi.period === period && kpi.periodValue === periodValue);
    
    if (periodKpis.length === 0) {
      return 0;
    }
    
    // Calculate weighted KPI score based on revenue, revisit rate, and device revenue
    const totalRevenue = periodKpis.reduce((sum, kpi) => sum + parseFloat(kpi.totalRevenue || "0"), 0);
    const avgRevisitRate = periodKpis.reduce((sum, kpi) => sum + parseFloat(kpi.revisitRate || "0"), 0) / periodKpis.length;
    const deviceRevenue = periodKpis.reduce((sum, kpi) => sum + parseFloat(kpi.deviceRevenue || "0"), 0);
    
    // Weighted score: 40% revenue performance, 30% revisit rate, 30% device revenue
    const branch = await this.getBranch(branchId);
    const target = parseFloat(branch?.monthlyTarget || "1000000"); // Default 1M target
    
    const revenueScore = Math.min(100, (totalRevenue / target) * 100);
    const revisitScore = Math.min(100, avgRevisitRate);
    const deviceScore = Math.min(100, (deviceRevenue / (target * 0.3)) * 100); // 30% of target for devices
    
    return Math.round((revenueScore * 0.4) + (revisitScore * 0.3) + (deviceScore * 0.3));
  }

  // Staff KPI operations
  async getStaffKpis(): Promise<StaffKpi[]> {
    return Array.from(this.staffKpis.values());
  }

  async getStaffKpisByStaff(staffId: string): Promise<StaffKpi[]> {
    return Array.from(this.staffKpis.values()).filter(staffKpi => staffKpi.staffId === staffId);
  }

  async getStaffKpisByPeriod(period: string, periodValue: string): Promise<StaffKpi[]> {
    return Array.from(this.staffKpis.values()).filter(
      staffKpi => staffKpi.period === period && staffKpi.periodValue === periodValue
    );
  }

  async createStaffKpi(insertStaffKpi: InsertStaffKpi): Promise<StaffKpi> {
    const id = randomUUID();
    const staffKpi: StaffKpi = {
      ...insertStaffKpi,
      id,
      staffId: insertStaffKpi.staffId || null,
      cardSales: insertStaffKpi.cardSales ?? 0,
      customerRetention: insertStaffKpi.customerRetention || "0",
      totalPoints: insertStaffKpi.totalPoints || "0",
      score: insertStaffKpi.score || "0",
      targetRevenue: insertStaffKpi.targetRevenue || "0",
      bonusAmount: insertStaffKpi.bonusAmount || "0",
      slotsEarned: insertStaffKpi.slotsEarned ?? 0,
      sharesAwarded: insertStaffKpi.sharesAwarded || "0",
      profitShareAmount: insertStaffKpi.profitShareAmount || "0",
      isProcessed: insertStaffKpi.isProcessed ?? false,
      createdAt: new Date(),
      processedAt: insertStaffKpi.isProcessed ? new Date() : null
    };
    this.staffKpis.set(id, staffKpi);
    return staffKpi;
  }

  async updateStaffKpi(id: string, updateData: Partial<InsertStaffKpi>): Promise<StaffKpi | undefined> {
    const staffKpi = this.staffKpis.get(id);
    if (!staffKpi) return undefined;
    
    const updatedStaffKpi = { ...staffKpi, ...updateData };
    this.staffKpis.set(id, updatedStaffKpi);
    return updatedStaffKpi;
  }

  async calculateStaffKpiPoints(staffId: string, period: string, periodValue: string): Promise<number> {
    const staffKpis = await this.getStaffKpisByStaff(staffId);
    const periodKpis = staffKpis.filter(kpi => kpi.period === period && kpi.periodValue === periodValue);
    
    if (periodKpis.length === 0) {
      return 0;
    }
    
    // Calculate points: each card sale = 5 points, retention rate percentage = direct points
    const totalCardSales = periodKpis.reduce((sum, kpi) => sum + (kpi.cardSales || 0), 0);
    const avgRetentionRate = periodKpis.reduce((sum, kpi) => sum + parseFloat(kpi.customerRetention || "0"), 0) / periodKpis.length;
    
    const cardSalesPoints = totalCardSales * 5; // 5 points per card sold
    const retentionPoints = avgRetentionRate; // Direct percentage as points
    
    return Math.round(cardSalesPoints + retentionPoints);
  }

  async processQuarterlyShares(period: string, periodValue: string): Promise<void> {
    const quarterlyKpis = await this.getStaffKpisByPeriod(period, periodValue);
    
    // Group KPIs by staff member
    const kpisByStaff = new Map<string, StaffKpi[]>();
    for (const kpi of quarterlyKpis) {
      if (!kpi.staffId) continue;
      if (!kpisByStaff.has(kpi.staffId)) {
        kpisByStaff.set(kpi.staffId, []);
      }
      kpisByStaff.get(kpi.staffId)!.push(kpi);
    }
    
    // Process shares for each staff member
    for (const [staffId, staffKpis] of Array.from(kpisByStaff.entries())) {
      // Check if any KPI for this staff is already processed
      const hasProcessedKpi = staffKpis.some((kpi: StaffKpi) => kpi.isProcessed);
      if (hasProcessedKpi) continue; // Skip if already processed
      
      // Calculate total points for this staff member across all their KPIs for this quarter
      const totalQuarterlyPoints = await this.calculateStaffKpiPoints(staffId, period, periodValue);
      
      // Calculate slots: ≥50 points = 1 slot (50 shares)
      const slotsEarned = Math.floor(totalQuarterlyPoints / 50);
      const sharesAwarded = slotsEarned * 50;
      
      // Calculate profit share amount (49% of branch profit)
      const profitShareAmount = sharesAwarded * 1000; // Example calculation
      
      const now = new Date();
      
      // Update all staff KPI records for this quarter to mark as processed
      for (const staffKpi of staffKpis) {
        await this.updateStaffKpi(staffKpi.id, {
          slotsEarned,
          sharesAwarded: sharesAwarded.toString(),
          profitShareAmount: profitShareAmount.toString(),
          isProcessed: true
        } as Partial<InsertStaffKpi>);
        
        // Update the record directly to set processedAt since InsertStaffKpi might not include it
        const currentKpi = this.staffKpis.get(staffKpi.id);
        if (currentKpi) {
          this.staffKpis.set(staffKpi.id, { ...currentKpi, processedAt: now });
        }
      }
      
      // Update staff member's total shares if shares were awarded
      if (sharesAwarded > 0) {
        const staff = this.staff.get(staffId);
        if (staff) {
          const currentShares = staff.shares || 0;
          const newTotalShares = currentShares + sharesAwarded;
          
          const updatedStaff = {
            ...staff,
            shares: newTotalShares,
            updatedAt: now
          };
          
          this.staff.set(staffId, updatedStaff);
        }
      }
    }
  }

  // Referral operations
  async getReferrals(): Promise<Referral[]> {
    return Array.from(this.referrals.values());
  }

  async getReferralsByReferrer(referrerId: string): Promise<Referral[]> {
    return Array.from(this.referrals.values()).filter(referral => referral.referrerId === referrerId);
  }

  async getReferralByCode(referralCode: string): Promise<Referral | undefined> {
    return Array.from(this.referrals.values()).find(referral => referral.referralCode === referralCode);
  }

  async createReferral(insertReferral: InsertReferral): Promise<Referral> {
    const id = randomUUID();
    const referral: Referral = {
      id,
      referrerId: insertReferral.referrerId || null,
      referredUserId: insertReferral.referredUserId || null,
      referralCode: insertReferral.referralCode,
      customerName: insertReferral.customerName || null,
      firstTransactionId: insertReferral.firstTransactionId || null,
      contributionValue: insertReferral.contributionValue || "0",
      commissionRate: insertReferral.commissionRate || "8.0",
      commissionAmount: insertReferral.commissionAmount || "0",
      commissionPaid: insertReferral.commissionPaid || "0",
      status: insertReferral.status || "pending",
      referralDate: new Date(),
      paidDate: null
    };
    this.referrals.set(id, referral);
    return referral;
  }

  async updateReferral(id: string, updateData: Partial<InsertReferral>): Promise<Referral | undefined> {
    const referral = this.referrals.get(id);
    if (!referral) return undefined;
    
    const updatedReferral = { ...referral, ...updateData };
    this.referrals.set(id, updatedReferral);
    return updatedReferral;
  }

  async generateReferralCode(staffId: string): Promise<string> {
    const timestamp = Date.now();
    const code = `REF-${staffId.slice(-6)}-${timestamp.toString().slice(-6)}`;
    
    // Check if code already exists and regenerate if needed
    const existingReferral = await this.getReferralByCode(code);
    if (existingReferral) {
      // Recursive call with slight delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      return this.generateReferralCode(staffId);
    }
    
    return code;
  }

  async calculateReferralCommission(referralId: string): Promise<number> {
    const referral = this.referrals.get(referralId);
    if (!referral) return 0;
    
    const contributionValue = parseFloat(referral.contributionValue || "0");
    const commissionRate = parseFloat(referral.commissionRate || "8.0") / 100;
    
    return Math.round(contributionValue * commissionRate);
  }

  async processFirstTransaction(referralCode: string, transactionId: string): Promise<Referral | undefined> {
    const referral = await this.getReferralByCode(referralCode);
    if (!referral) return undefined;
    
    // Only process if this is the first transaction (no existing first transaction)
    if (referral.firstTransactionId) return referral;
    
    // SECURITY: Derive contributionValue from actual stored transaction
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error("Transaction not found - invalid transactionId");
    }
    
    // Validate this is a qualifying transaction (income only)
    if (transaction.type !== "income") {
      throw new Error("Only income transactions qualify for referral commissions");
    }
    
    const contributionValue = parseFloat(transaction.amount);
    const commissionRate = parseFloat(referral.commissionRate || "8.0") / 100;
    const commissionAmount = Math.round(contributionValue * commissionRate);
    
    const updatedReferral = await this.updateReferral(referral.id, {
      firstTransactionId: transactionId,
      contributionValue: contributionValue.toString(),
      commissionAmount: commissionAmount.toString(),
      status: "completed"
    });
    
    return updatedReferral;
  }

  async markCommissionPaid(referralId: string, paidAmount: number): Promise<Referral | undefined> {
    const referral = this.referrals.get(referralId);
    if (!referral) return undefined;
    
    const currentPaid = parseFloat(referral.commissionPaid || "0");
    const commissionAmount = parseFloat(referral.commissionAmount || "0");
    const remainingAmount = commissionAmount - currentPaid;
    
    // SECURITY: Prevent overpayment
    if (paidAmount > remainingAmount) {
      throw new Error(`Cannot pay ${paidAmount.toLocaleString('vi-VN')} VND. Only ${remainingAmount.toLocaleString('vi-VN')} VND remaining.`);
    }
    
    if (paidAmount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }
    
    const newTotalPaid = currentPaid + paidAmount;
    
    // BUSINESS LOGIC: Update status when fully paid
    let newStatus = referral.status;
    if (newTotalPaid >= commissionAmount) {
      newStatus = "paid";
    }
    
    const updatedReferral = { 
      ...referral, 
      commissionPaid: newTotalPaid.toString(),
      status: newStatus,
      paidDate: new Date()
    };
    
    this.referrals.set(referralId, updatedReferral);
    return updatedReferral;
  }

  async processCommissionPayments(referrerId: string): Promise<number> {
    const referrals = await this.getReferralsByReferrer(referrerId);
    let totalPaid = 0;
    
    for (const referral of referrals) {
      const commissionAmount = parseFloat(referral.commissionAmount || "0");
      const commissionPaid = parseFloat(referral.commissionPaid || "0");
      const pendingAmount = commissionAmount - commissionPaid;
      
      if (pendingAmount > 0 && referral.status === "completed") {
        await this.markCommissionPaid(referral.id, pendingAmount);
        totalPaid += pendingAmount;
      }
    }
    
    return totalPaid;
  }

  // Profit sharing operations
  async getProfitSharings(): Promise<ProfitSharing[]> {
    return Array.from(this.profitSharings.values());
  }

  async getProfitSharing(id: string): Promise<ProfitSharing | undefined> {
    return this.profitSharings.get(id);
  }

  async getProfitSharingByPeriod(period: string, periodValue: string): Promise<ProfitSharing | undefined> {
    return Array.from(this.profitSharings.values()).find(
      profitSharing => profitSharing.period === period && profitSharing.periodValue === periodValue
    );
  }

  async createProfitSharing(profitSharingData: InsertProfitSharing): Promise<ProfitSharing> {
    const id = randomUUID();
    const profitSharing: ProfitSharing = {
      id,
      period: profitSharingData.period,
      periodValue: profitSharingData.periodValue,
      totalRevenue: profitSharingData.totalRevenue || "0",
      totalExpenses: profitSharingData.totalExpenses || "0",
      netProfit: profitSharingData.netProfit || "0",
      profitSharePool: profitSharingData.profitSharePool || "0",
      totalShares: profitSharingData.totalShares ?? 0,
      profitPerShare: profitSharingData.profitPerShare || "0",
      distributionStatus: profitSharingData.distributionStatus || "pending",
      createdAt: new Date(),
      processedAt: null,
    };
    this.profitSharings.set(id, profitSharing);
    return profitSharing;
  }

  async updateProfitSharing(id: string, updateData: Partial<InsertProfitSharing>): Promise<ProfitSharing | undefined> {
    const profitSharing = this.profitSharings.get(id);
    if (!profitSharing) return undefined;
    
    const updatedProfitSharing = { ...profitSharing, ...updateData };
    this.profitSharings.set(id, updatedProfitSharing);
    return updatedProfitSharing;
  }

  async calculateQuarterlyProfit(period: string, periodValue: string): Promise<{ revenue: number; expenses: number; profit: number }> {
    // Validate period type - should only be quarterly
    if (period !== "quarter") {
      throw new Error("Profit sharing calculation is only supported for quarterly periods");
    }

    // Validate quarter format using the new validation helper
    const { startDate, endDate, isValid } = this.validateQuarterBoundaries(periodValue);
    if (!isValid) {
      throw new Error(`Invalid quarter format: ${periodValue}. Expected format: YYYY-Q[1-4]`);
    }

    const transactions = Array.from(this.transactions.values());
    
    // Filter transactions for the quarter
    const quarterlyTransactions = transactions.filter(transaction => {
      const transactionDate = transaction.date ? new Date(transaction.date) : new Date();
      return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    // Calculate revenue and expenses (FIX: Use correct transaction schema)
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    for (const transaction of quarterlyTransactions) {
      const amount = parseFloat(transaction.amount);
      
      if (transaction.type === "income") {
        totalRevenue += amount;
      } else if (transaction.type === "expense") {
        totalExpenses += amount;
      }
    }
    
    const netProfit = totalRevenue - totalExpenses;
    
    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: netProfit
    };
  }

  async processQuarterlyProfitSharing(period: string, periodValue: string, forceReprocess: boolean = false): Promise<ProfitSharing> {
    // IDEMPOTENCY: Robust check for existing processing
    const existingProfitSharing = await this.getProfitSharingByPeriod(period, periodValue);
    if (existingProfitSharing) {
      if (existingProfitSharing.distributionStatus === "completed" && !forceReprocess) {
        throw new Error(`Profit sharing for ${period} ${periodValue} has already been completed. Use forceReprocess=true to override.`);
      }
      
      // Check for existing distributions to prevent duplicates
      const existingDistributions = await this.getProfitDistributionsBySharing(existingProfitSharing.id);
      if (existingDistributions.length > 0 && !forceReprocess) {
        throw new Error(`Distributions already exist for ${period} ${periodValue}. Use forceReprocess=true to recreate.`);
      }
      
      // If reprocessing, clean up existing distributions
      if (forceReprocess && existingDistributions.length > 0) {
        for (const dist of existingDistributions) {
          this.profitDistributions.delete(dist.id);
        }
        console.log(`🗑️ Cleared ${existingDistributions.length} existing distributions for reprocessing`);
      }
    }
    
    // Calculate quarterly profit with validation
    const { revenue, expenses, profit } = await this.calculateQuarterlyProfit(period, periodValue);
    
    // Ensure profit is positive for distribution
    if (profit <= 0) {
      throw new Error(`Cannot distribute shares for negative or zero profit: ${profit.toLocaleString('vi-VN')} VND`);
    }
    
    // Calculate 49% profit share pool with proper rounding
    const profitSharePool = Math.round(profit * 0.49 * 100) / 100; // Round to 2 decimal places
    
    // Get total shares outstanding
    const allStaff = Array.from(this.staff.values());
    const totalShares = allStaff.reduce((sum, staff) => sum + (staff.shares || 0), 0);
    
    if (totalShares === 0) {
      throw new Error("Cannot process profit sharing: No shares outstanding");
    }
    
    // Calculate profit per share with proper precision
    const profitPerShare = Math.round((profitSharePool / totalShares) * 100) / 100;
    
    let profitSharing: ProfitSharing;
    
    if (existingProfitSharing) {
      // Update existing profit sharing
      profitSharing = await this.updateProfitSharing(existingProfitSharing.id, {
        totalRevenue: revenue.toString(),
        totalExpenses: expenses.toString(),
        netProfit: profit.toString(),
        profitSharePool: profitSharePool.toString(),
        totalShares,
        profitPerShare: profitPerShare.toString(),
        distributionStatus: "completed"
      }) as ProfitSharing;
    } else {
      // Create new profit sharing record
      profitSharing = await this.createProfitSharing({
        period,
        periodValue,
        totalRevenue: revenue.toString(),
        totalExpenses: expenses.toString(),
        netProfit: profit.toString(),
        profitSharePool: profitSharePool.toString(),
        totalShares,
        profitPerShare: profitPerShare.toString(),
        distributionStatus: "completed"
      });
    }
    
    // Create individual distributions with proper rounding
    let totalDistributed = 0;
    const shareholderStaff = allStaff.filter(staff => (staff.shares || 0) > 0);
    
    for (let i = 0; i < shareholderStaff.length; i++) {
      const staff = shareholderStaff[i];
      const shares = staff.shares || 0;
      
      // Calculate distribution amount with rounding
      let distributionAmount = Math.round(shares * profitPerShare * 100) / 100;
      
      // Handle rounding remainder for the last shareholder
      if (i === shareholderStaff.length - 1) {
        const remainder = profitSharePool - totalDistributed;
        distributionAmount = remainder;
      }
      
      totalDistributed += distributionAmount;
      
      await this.createProfitDistribution({
        profitSharingId: profitSharing.id,
        staffId: staff.id,
        staffName: staff.name,
        sharesOwned: shares,
        distributionAmount: distributionAmount.toString(),
        paymentStatus: "pending"
      });
    }
    
    console.log(`✅ Processed quarterly profit sharing for ${periodValue}:`);
    console.log(`📊 Total profit: ${profit.toLocaleString('vi-VN')} VND`);
    console.log(`💰 Profit share pool (49%): ${profitSharePool.toLocaleString('vi-VN')} VND`);
    console.log(`📈 Total shares: ${totalShares.toLocaleString()}`);
    console.log(`💎 Profit per share: ${profitPerShare.toLocaleString('vi-VN')} VND`);
    console.log(`👥 Distributions created: ${shareholderStaff.length}`);
    
    return profitSharing;
  }

  // Investment package operations
  async getInvestmentPackages(): Promise<InvestmentPackage[]> {
    return Array.from(this.investmentPackages.values());
  }

  async getInvestmentPackage(id: string): Promise<InvestmentPackage | undefined> {
    return this.investmentPackages.get(id);
  }

  async getActiveInvestmentPackages(): Promise<InvestmentPackage[]> {
    return Array.from(this.investmentPackages.values()).filter(pkg => pkg.isActive);
  }

  async createInvestmentPackage(packageData: InsertInvestmentPackage): Promise<InvestmentPackage> {
    const id = randomUUID();
    const investmentPackage: InvestmentPackage = {
      ...packageData,
      id,
      minAmount: packageData.minAmount,
      maxAmount: packageData.maxAmount || null,
      description: packageData.description || null,
      expectedReturn: packageData.expectedReturn || "0",
      duration: packageData.duration || 12,
      isActive: packageData.isActive ?? true,
      createdAt: new Date()
    };
    this.investmentPackages.set(id, investmentPackage);
    return investmentPackage;
  }

  async updateInvestmentPackage(id: string, packageData: Partial<InsertInvestmentPackage>): Promise<InvestmentPackage | undefined> {
    const existingPackage = this.investmentPackages.get(id);
    if (!existingPackage) return undefined;
    
    const updatedPackage = { ...existingPackage, ...packageData };
    this.investmentPackages.set(id, updatedPackage);
    return updatedPackage;
  }

  // Cash flow operations
  async createCashFlowTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const taxAmount = transaction.type === "withdraw" ? this.calculateWithdrawalTax(parseFloat(transaction.amount)) : 0;
    
    const cashFlowTransaction: Transaction = {
      ...transaction,
      id,
      date: new Date(),
      branchId: transaction.branchId || null,
      cardId: transaction.cardId || null,
      userId: transaction.userId || null,
      referralCode: transaction.referralCode || null,
      status: transaction.status || "pending",
      taxAmount: taxAmount.toString(),
      documentPath: transaction.documentPath || null,
      packageId: transaction.packageId || null,
      approvedBy: transaction.approvedBy || null,
      approvedAt: transaction.approvedAt || null
    };
    this.transactions.set(id, cashFlowTransaction);
    return cashFlowTransaction;
  }

  async getCashFlowTransactions(userId?: string): Promise<Transaction[]> {
    const allTransactions = Array.from(this.transactions.values());
    if (userId) {
      return allTransactions.filter(t => t.userId === userId);
    }
    return allTransactions.filter(t => ["deposit", "invest", "withdraw", "share_distribution"].includes(t.type));
  }

  async getCashFlowTransactionsByType(type: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(t => t.type === type);
  }

  async approveCashFlowTransaction(transactionId: string, approvedBy: string): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return undefined;
    
    if (transaction.status !== "pending") {
      throw new Error(`Transaction ${transactionId} is not in pending status`);
    }
    
    const updatedTransaction = {
      ...transaction,
      status: "approved",
      approvedBy,
      approvedAt: new Date()
    };
    this.transactions.set(transactionId, updatedTransaction);
    return updatedTransaction;
  }

  async rejectCashFlowTransaction(transactionId: string, approvedBy: string, reason?: string): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return undefined;
    
    if (transaction.status !== "pending") {
      throw new Error(`Transaction ${transactionId} is not in pending status`);
    }
    
    const updatedTransaction = {
      ...transaction,
      status: "rejected",
      approvedBy,
      approvedAt: new Date(),
      description: reason ? `${transaction.description} (Rejected: ${reason})` : transaction.description
    };
    this.transactions.set(transactionId, updatedTransaction);
    return updatedTransaction;
  }

  calculateWithdrawalTax(amount: number): number {
    // 10% tax for withdrawals over 10M VND
    if (amount > 10000000) {
      return Math.round(amount * 0.1);
    }
    return 0;
  }

  // Asset contribution operations
  async createAssetContribution(contribution: InsertAssetContribution): Promise<AssetContribution> {
    const id = randomUUID();
    const now = new Date();
    
    const newContribution: AssetContribution = {
      id,
      ...contribution,
      status: contribution.status || 'pending',
      approvedBy: contribution.approvedBy || null,
      approvedAt: null,
      rejectionReason: null,
      inheritanceRight: contribution.inheritanceRight || false,
      createdAt: now,
    };
    
    this.assetContributions.set(id, newContribution);
    return newContribution;
  }

  async getAssetContributions(userId?: string): Promise<AssetContribution[]> {
    const contributions = Array.from(this.assetContributions.values());
    if (userId) {
      return contributions.filter(c => c.userId === userId);
    }
    return contributions;
  }

  async getAssetContribution(id: string): Promise<AssetContribution | undefined> {
    return this.assetContributions.get(id);
  }

  async approveAssetContribution(contributionId: string, approvedBy: string): Promise<AssetContribution | undefined> {
    const contribution = this.assetContributions.get(contributionId);
    if (!contribution) return undefined;

    const updatedContribution: AssetContribution = {
      ...contribution,
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    };

    this.assetContributions.set(contributionId, updatedContribution);

    // Cập nhật PAD Token cho user
    const user = await this.getUser(contribution.userId);
    if (user) {
      const currentPadToken = parseFloat(user.padToken || '0');
      const newPadToken = currentPadToken + parseFloat(contribution.padTokenAmount);
      await this.updateUser(contribution.userId, {
        padToken: newPadToken.toString(),
      });

      // Tạo transaction record
      await this.createTransaction({
        userId: contribution.userId,
        type: 'invest',
        amount: contribution.valuationAmount,
        description: `Góp tài sản: ${contribution.assetName}`,
        contributionType: 'asset',
        padTokenAmount: contribution.padTokenAmount,
        status: 'completed',
        documentPath: contribution.contractDocumentPath || undefined,
      });
    }

    return updatedContribution;
  }

  async rejectAssetContribution(contributionId: string, approvedBy: string, reason: string): Promise<AssetContribution | undefined> {
    const contribution = this.assetContributions.get(contributionId);
    if (!contribution) return undefined;

    const updatedContribution: AssetContribution = {
      ...contribution,
      status: 'rejected',
      approvedBy,
      rejectionReason: reason,
    };

    this.assetContributions.set(contributionId, updatedContribution);
    return updatedContribution;
  }

  // PAD Token operations
  async getPadTokenHistory(userId?: string): Promise<Array<{date: string; amount: string; type: string; description: string}>> {
    const transactions = await this.getTransactions();
    let relevantTransactions = transactions;
    
    if (userId) {
      relevantTransactions = transactions.filter(t => t.userId === userId);
    }

    // Filter transactions that have PAD Token changes
    const padTokenTransactions = relevantTransactions.filter(t => {
      return t.padTokenAmount && parseFloat(t.padTokenAmount) > 0;
    });

    return padTokenTransactions.map(t => ({
      date: t.date?.toISOString() || new Date().toISOString(),
      amount: t.padTokenAmount || '0',
      type: t.type,
      description: t.description,
    }));
  }

  async calculateRoiProjection(userId: string, periods: number[]): Promise<Array<{period: string; projectedReturn: number; totalValue: number}>> {
    const user = await this.getUser(userId);
    if (!user) return [];

    const currentPadToken = parseFloat(user.padToken || '0');
    const currentValueVnd = currentPadToken * 10000; // 100 PAD = 1M VND, so 1 PAD = 10,000 VND

    // Assumed annual return rate: 15% (configurable)
    const annualReturnRate = 0.15;

    return periods.map(months => {
      const years = months / 12;
      const projectedValue = currentValueVnd * Math.pow(1 + annualReturnRate, years);
      const projectedReturn = projectedValue - currentValueVnd;

      let periodLabel = '';
      if (months === 6) periodLabel = '6 tháng';
      else if (months === 12) periodLabel = '1 năm';
      else if (months === 36) periodLabel = '3 năm';
      else if (months === 60) periodLabel = '5 năm';
      else periodLabel = `${months} tháng`;

      return {
        period: periodLabel,
        projectedReturn: Math.round(projectedReturn),
        totalValue: Math.round(projectedValue),
      };
    });
  }

  // Helper method for quarter validation
  private validateQuarterBoundaries(periodValue: string): { startDate: Date; endDate: Date; isValid: boolean } {
    return validateQuarterBoundaries(periodValue);
  }

  // Profit distribution operations
  async getProfitDistributions(): Promise<ProfitDistribution[]> {
    return Array.from(this.profitDistributions.values());
  }

  async getProfitDistributionsBySharing(profitSharingId: string): Promise<ProfitDistribution[]> {
    return Array.from(this.profitDistributions.values()).filter(
      distribution => distribution.profitSharingId === profitSharingId
    );
  }

  async createProfitDistribution(distributionData: InsertProfitDistribution): Promise<ProfitDistribution> {
    const id = randomUUID();
    const distribution: ProfitDistribution = {
      id,
      profitSharingId: distributionData.profitSharingId || null,
      staffId: distributionData.staffId || null,
      staffName: distributionData.staffName,
      sharesOwned: distributionData.sharesOwned ?? 0,
      distributionAmount: distributionData.distributionAmount || "0",
      paymentStatus: distributionData.paymentStatus || "pending",
      createdAt: new Date(),
      paidAt: null,
    };
    this.profitDistributions.set(id, distribution);
    return distribution;
  }

  async updateProfitDistribution(id: string, updateData: Partial<InsertProfitDistribution>): Promise<ProfitDistribution | undefined> {
    const distribution = this.profitDistributions.get(id);
    if (!distribution) return undefined;
    
    const updatedDistribution = { ...distribution, ...updateData };
    this.profitDistributions.set(id, updatedDistribution);
    return updatedDistribution;
  }

  async markDistributionPaid(distributionId: string): Promise<ProfitDistribution | undefined> {
    const distribution = this.profitDistributions.get(distributionId);
    if (!distribution) {
      throw new Error(`Distribution not found: ${distributionId}`);
    }
    
    // PAYMENT SAFEGUARD: Prevent double payments
    if (distribution.paymentStatus === "paid") {
      throw new Error(`Distribution ${distributionId} has already been paid on ${distribution.paidAt?.toLocaleDateString('vi-VN')}`);
    }
    
    if (distribution.paymentStatus === "cancelled") {
      throw new Error(`Cannot mark cancelled distribution ${distributionId} as paid`);
    }
    
    const updatedDistribution = {
      ...distribution,
      paymentStatus: "paid" as const,
      paidAt: new Date()
    };
    
    this.profitDistributions.set(distributionId, updatedDistribution);
    console.log(`💸 Marked distribution ${distributionId} as paid: ${parseFloat(distribution.distributionAmount || "0").toLocaleString('vi-VN')} VND`);
    return updatedDistribution;
  }

  async processAllDistributionPayments(profitSharingId: string): Promise<number> {
    const profitSharing = await this.getProfitSharing(profitSharingId);
    if (!profitSharing) {
      throw new Error(`Profit sharing not found: ${profitSharingId}`);
    }
    
    const distributions = await this.getProfitDistributionsBySharing(profitSharingId);
    if (distributions.length === 0) {
      throw new Error(`No distributions found for profit sharing: ${profitSharingId}`);
    }
    
    let totalPaid = 0;
    let paymentsProcessed = 0;
    const errors: string[] = [];
    
    for (const distribution of distributions) {
      if (distribution.paymentStatus === "pending") {
        try {
          await this.markDistributionPaid(distribution.id);
          totalPaid += parseFloat(distribution.distributionAmount || "0");
          paymentsProcessed++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to pay ${distribution.id}: ${errorMsg}`);
          console.error(`❌ Payment failed for distribution ${distribution.id}:`, errorMsg);
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Some payments failed: ${errors.join('; ')}`);
    }
    
    console.log(`💰 Processed ${paymentsProcessed} payments totaling ${totalPaid.toLocaleString('vi-VN')} VND for ${profitSharing.periodValue}`);
    return totalPaid;
  }

  // Admin operations implementation
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRole(userId: string, role: string, updatedBy: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const oldRole = user.role;
    const updatedUser = { ...user, role, updatedAt: new Date() };
    this.users.set(userId, updatedUser);

    // Log the role change
    await this.createAuditLog({
      userId: updatedBy,
      action: "user_role_change",
      entityType: "user",
      entityId: userId,
      oldValue: JSON.stringify({ role: oldRole }),
      newValue: JSON.stringify({ role }),
      ipAddress: null,
      userAgent: null,
    });

    return updatedUser;
  }

  async getSystemConfigs(): Promise<SystemConfig[]> {
    return Array.from(this.systemConfigs.values());
  }

  async getSystemConfig(configKey: string): Promise<SystemConfig | undefined> {
    return Array.from(this.systemConfigs.values()).find(config => config.configKey === configKey);
  }

  async updateSystemConfig(configKey: string, configValue: string, description?: string, updatedBy?: string): Promise<SystemConfig> {
    const existingConfig = await this.getSystemConfig(configKey);
    const id = existingConfig?.id || randomUUID();
    const now = new Date();

    const config: SystemConfig = {
      id,
      configKey,
      configValue,
      description: description || existingConfig?.description || null,
      updatedBy: updatedBy || null,
      updatedAt: now,
    };

    this.systemConfigs.set(id, config);

    // Log the config change
    if (updatedBy) {
      await this.createAuditLog({
        userId: updatedBy,
        action: "config_update",
        entityType: "config",
        entityId: id,
        oldValue: existingConfig ? JSON.stringify({ configValue: existingConfig.configValue }) : null,
        newValue: JSON.stringify({ configValue }),
        ipAddress: null,
        userAgent: null,
      });
    }

    return config;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    const logs = Array.from(this.auditLogs.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
    return logs;
  }

  async createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const log: AuditLog = {
      ...auditLog,
      id,
      userId: auditLog.userId || null,
      entityId: auditLog.entityId || null,
      oldValue: auditLog.oldValue || null,
      newValue: auditLog.newValue || null,
      ipAddress: auditLog.ipAddress || null,
      userAgent: auditLog.userAgent || null,
      createdAt: new Date(),
    };
    this.auditLogs.set(id, log);
    return log;
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.status === "pending")
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }

  async exportReportData(reportType: string, dateFrom?: string, dateTo?: string): Promise<any[]> {
    const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
    const toDate = dateTo ? new Date(dateTo) : new Date();

    switch (reportType) {
      case "finance":
        return Array.from(this.transactions.values())
          .filter(t => {
            const transactionDate = t.date || new Date();
            return transactionDate >= fromDate && transactionDate <= toDate;
          })
          .map(t => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            description: t.description,
            status: t.status,
            date: t.date,
            taxAmount: t.taxAmount || "0",
          }));

      case "tax":
        return Array.from(this.transactions.values())
          .filter(t => {
            const transactionDate = t.date || new Date();
            return transactionDate >= fromDate && transactionDate <= toDate && parseFloat(t.taxAmount || "0") > 0;
          })
          .map(t => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            taxAmount: t.taxAmount,
            date: t.date,
          }));

      case "transactions":
        return Array.from(this.transactions.values())
          .filter(t => {
            const transactionDate = t.date || new Date();
            return transactionDate >= fromDate && transactionDate <= toDate;
          });

      case "users":
        return Array.from(this.users.values())
          .map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            refCode: u.refCode,
            createdAt: u.createdAt,
          }));

      default:
        return [];
    }
  }
}

import { PostgresStorage } from "./postgres-storage";

export const storage = new PostgresStorage();
