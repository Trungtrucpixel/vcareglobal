import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
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
} from "@shared/schema";
import { randomUUID, scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PgSession = connectPgSimple(session);

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

function toIntegerVnd(amountString: string): number {
  return Math.floor(parseFloat(amountString || "0"));
}

function fromIntegerVnd(amountInteger: number): string {
  return Math.floor(amountInteger).toString();
}

type SessionStore = session.Store & {
  get: (sid: string, callback: (err: any, session?: session.SessionData | null) => void) => void;
  set: (sid: string, session: session.SessionData, callback?: (err?: any) => void) => void;
  destroy: (sid: string, callback?: (err?: any) => void) => void;
};

import type { IStorage } from "./storage";

export class PostgresStorage implements IStorage {
  public sessionStore: SessionStore;

  constructor() {
    this.sessionStore = new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }) as SessionStore;
    
    this.initializeDefaults().catch(err => {
      console.error('⚠️ Failed to initialize defaults, will retry on first request:', err.message);
    });
  }

  private async initializeDefaults() {
    try {
      if (process.env.NODE_ENV === 'development') {
        const adminEmail = 'admin@phuan.com';
        const existingAdmin = await this.getUserByEmail(adminEmail);
        
        if (!existingAdmin) {
          const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
          const hashedPassword = await hashPassword(adminPassword);
          
          await db.insert(schema.users).values({
            name: 'Admin',
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            status: 'active',
          });
          console.log('✅ Created default admin user: admin@phuan.com (DEV mode)');
        }
      }
      
      const existingConfigs = await db.select().from(schema.systemConfigs);
      if (existingConfigs.length === 0) {
        await this.initializeSystemConfigs();
      }
    } catch (error) {
      console.error('Database initialization error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async initializeSystemConfigs() {
    const configs = [
      { configKey: "maxout_limit_percentage", configValue: "210", description: "Maximum payout limit as percentage of card price" },
      { configKey: "kpi_threshold_points", configValue: "50", description: "Minimum KPI points required per quarter for shares" },
      { configKey: "profit_share_rate", configValue: "49", description: "Percentage of quarterly profit distributed to shareholders" },
      { configKey: "withdrawal_minimum", configValue: "5000000", description: "Minimum withdrawal amount in VND" },
      { configKey: "withdrawal_tax_rate", configValue: "10", description: "Tax rate percentage for withdrawals over 10M VND" },
      { configKey: "corporate_tax_rate", configValue: "20", description: "Corporate tax rate percentage on gross profit" },
      { configKey: "referral_commission_rate", configValue: "8", description: "Referral commission rate percentage" },
      { configKey: "shares_per_slot", configValue: "50", description: "Number of shares awarded per slot" },
    ];

    for (const config of configs) {
      await db.insert(schema.systemConfigs).values(config).onConflictDoNothing();
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(schema.users).values(user).returning();
    return created;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(schema.users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(schema.users);
  }

  // Card operations
  async getCards(): Promise<Card[]> {
    return await db.select().from(schema.cards);
  }

  async getCard(id: string): Promise<Card | undefined> {
    const [card] = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
    return card;
  }

  async createCard(card: InsertCard): Promise<Card> {
    const [created] = await db.insert(schema.cards).values(card).returning();
    return created;
  }

  async updateCard(id: string, card: Partial<InsertCard>): Promise<Card | undefined> {
    const [updated] = await db.update(schema.cards)
      .set(card)
      .where(eq(schema.cards.id, id))
      .returning();
    return updated;
  }

  async deleteCard(id: string): Promise<boolean> {
    const result = await db.delete(schema.cards).where(eq(schema.cards.id, id)).returning({ id: schema.cards.id });
    return result.length > 0;
  }

  // Branch operations
  async getBranches(): Promise<Branch[]> {
    return await db.select().from(schema.branches);
  }

  async getBranch(id: string): Promise<Branch | undefined> {
    const [branch] = await db.select().from(schema.branches).where(eq(schema.branches.id, id));
    return branch;
  }

  async createBranch(branch: InsertBranch): Promise<Branch> {
    const [created] = await db.insert(schema.branches).values(branch).returning();
    return created;
  }

  async updateBranch(id: string, branch: Partial<InsertBranch>): Promise<Branch | undefined> {
    const [updated] = await db.update(schema.branches)
      .set(branch)
      .where(eq(schema.branches.id, id))
      .returning();
    return updated;
  }

  // Staff operations
  async getStaff(): Promise<Staff[]> {
    return await db.select().from(schema.staff);
  }

  async getStaffMember(id: string): Promise<Staff | undefined> {
    const [staff] = await db.select().from(schema.staff).where(eq(schema.staff.id, id));
    return staff;
  }

  async createStaffMember(staff: InsertStaff): Promise<Staff> {
    const [created] = await db.insert(schema.staff).values(staff).returning();
    return created;
  }

  async updateStaffMember(id: string, staff: Partial<InsertStaff>): Promise<Staff | undefined> {
    const [updated] = await db.update(schema.staff)
      .set({ ...staff, updatedAt: new Date() })
      .where(eq(schema.staff.id, id))
      .returning();
    return updated;
  }

  async deleteStaffMember(id: string): Promise<boolean> {
    const result = await db.delete(schema.staff).where(eq(schema.staff.id, id)).returning({ id: schema.staff.id });
    return result.length > 0;
  }

  // Transaction operations
  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(schema.transactions).orderBy(desc(schema.transactions.date));
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id));
    return transaction;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(schema.transactions).values(transaction).returning();
    return created;
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    return await db.select().from(schema.transactions)
      .where(eq(schema.transactions.status, 'pending'))
      .orderBy(desc(schema.transactions.date));
  }

  // KPI operations
  async getKpis(): Promise<Kpi[]> {
    return await db.select().from(schema.kpis);
  }

  async getKpisByBranch(branchId: string): Promise<Kpi[]> {
    return await db.select().from(schema.kpis).where(eq(schema.kpis.branchId, branchId));
  }

  async getKpisByPeriod(period: string, periodValue: string): Promise<Kpi[]> {
    return await db.select().from(schema.kpis)
      .where(and(eq(schema.kpis.period, period), eq(schema.kpis.periodValue, periodValue)));
  }

  async createKpi(kpi: InsertKpi): Promise<Kpi> {
    const [created] = await db.insert(schema.kpis).values(kpi).returning();
    return created;
  }

  async updateKpi(id: string, kpi: Partial<InsertKpi>): Promise<Kpi | undefined> {
    const [updated] = await db.update(schema.kpis)
      .set(kpi)
      .where(eq(schema.kpis.id, id))
      .returning();
    return updated;
  }

  async calculateBranchKpi(branchId: string, period: string, periodValue: string): Promise<number> {
    const kpis = await this.getKpisByPeriod(period, periodValue);
    const branchKpi = kpis.find(k => k.branchId === branchId);
    return branchKpi ? parseFloat(branchKpi.kpiScore || "0") : 0;
  }

  // Staff KPI operations
  async getStaffKpis(): Promise<StaffKpi[]> {
    return await db.select().from(schema.staffKpis);
  }

  async getStaffKpisByStaff(staffId: string): Promise<StaffKpi[]> {
    return await db.select().from(schema.staffKpis).where(eq(schema.staffKpis.staffId, staffId));
  }

  async getStaffKpisByPeriod(period: string, periodValue: string): Promise<StaffKpi[]> {
    return await db.select().from(schema.staffKpis)
      .where(and(eq(schema.staffKpis.period, period), eq(schema.staffKpis.periodValue, periodValue)));
  }

  async createStaffKpi(staffKpi: InsertStaffKpi): Promise<StaffKpi> {
    const [created] = await db.insert(schema.staffKpis).values(staffKpi).returning();
    return created;
  }

  async updateStaffKpi(id: string, staffKpi: Partial<InsertStaffKpi>): Promise<StaffKpi | undefined> {
    const [updated] = await db.update(schema.staffKpis)
      .set(staffKpi)
      .where(eq(schema.staffKpis.id, id))
      .returning();
    return updated;
  }

  async calculateStaffKpiPoints(staffId: string, period: string, periodValue: string): Promise<number> {
    const kpis = await this.getStaffKpisByPeriod(period, periodValue);
    const staffKpi = kpis.find(k => k.staffId === staffId);
    return staffKpi ? parseFloat(staffKpi.totalPoints || "0") : 0;
  }

  async processQuarterlyShares(period: string, periodValue: string): Promise<void> {
    const kpis = await this.getStaffKpisByPeriod(period, periodValue);
    for (const kpi of kpis) {
      if (!kpi.isProcessed) {
        await db.update(schema.staffKpis)
          .set({ isProcessed: true, processedAt: new Date() })
          .where(eq(schema.staffKpis.id, kpi.id));
      }
    }
  }

  // Referral operations
  async getReferrals(): Promise<Referral[]> {
    return await db.select().from(schema.referrals);
  }

  async getReferralsByReferrer(referrerId: string): Promise<Referral[]> {
    return await db.select().from(schema.referrals).where(eq(schema.referrals.referrerId, referrerId));
  }

  async getReferralByCode(referralCode: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(schema.referrals).where(eq(schema.referrals.referralCode, referralCode));
    return referral;
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [created] = await db.insert(schema.referrals).values(referral).returning();
    return created;
  }

  async updateReferral(id: string, referral: Partial<InsertReferral>): Promise<Referral | undefined> {
    const [updated] = await db.update(schema.referrals)
      .set(referral)
      .where(eq(schema.referrals.id, id))
      .returning();
    return updated;
  }

  async generateReferralCode(staffId: string): Promise<string> {
    const staff = await this.getStaffMember(staffId);
    if (!staff) throw new Error("Staff not found");
    
    const code = `${staff.name.substring(0, 3).toUpperCase()}${randomUUID().substring(0, 6)}`;
    return code;
  }

  async calculateReferralCommission(referralId: string): Promise<number> {
    const referral = await db.select().from(schema.referrals).where(eq(schema.referrals.id, referralId));
    if (!referral[0]) return 0;
    return parseFloat(referral[0].commissionAmount || "0");
  }

  async processFirstTransaction(referralCode: string, transactionId: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(schema.referrals).where(eq(schema.referrals.referralCode, referralCode));
    if (!referral) return undefined;

    const [updated] = await db.update(schema.referrals)
      .set({ firstTransactionId: transactionId })
      .where(eq(schema.referrals.referralCode, referralCode))
      .returning();
    return updated;
  }

  async markCommissionPaid(referralId: string, paidAmount: number): Promise<Referral | undefined> {
    const [updated] = await db.update(schema.referrals)
      .set({ 
        commissionPaid: paidAmount.toString(),
        status: 'completed',
        paidDate: new Date()
      })
      .where(eq(schema.referrals.id, referralId))
      .returning();
    return updated;
  }

  async processCommissionPayments(referrerId: string): Promise<number> {
    const referrals = await this.getReferralsByReferrer(referrerId);
    let totalPaid = 0;
    for (const ref of referrals) {
      if (ref.status === 'pending') {
        const amount = parseFloat(ref.commissionAmount || "0");
        await this.markCommissionPaid(ref.id, amount);
        totalPaid += amount;
      }
    }
    return totalPaid;
  }

  // Profit sharing operations
  async getProfitSharings(): Promise<ProfitSharing[]> {
    return await db.select().from(schema.profitSharing);
  }

  async getProfitSharing(id: string): Promise<ProfitSharing | undefined> {
    const [sharing] = await db.select().from(schema.profitSharing).where(eq(schema.profitSharing.id, id));
    return sharing;
  }

  async getProfitSharingByPeriod(period: string, periodValue: string): Promise<ProfitSharing | undefined> {
    const [sharing] = await db.select().from(schema.profitSharing)
      .where(and(eq(schema.profitSharing.period, period), eq(schema.profitSharing.periodValue, periodValue)));
    return sharing;
  }

  async createProfitSharing(profitSharing: InsertProfitSharing): Promise<ProfitSharing> {
    const [created] = await db.insert(schema.profitSharing).values(profitSharing).returning();
    return created;
  }

  async updateProfitSharing(id: string, profitSharing: Partial<InsertProfitSharing>): Promise<ProfitSharing | undefined> {
    const [updated] = await db.update(schema.profitSharing)
      .set(profitSharing)
      .where(eq(schema.profitSharing.id, id))
      .returning();
    return updated;
  }

  async calculateQuarterlyProfit(period: string, periodValue: string): Promise<{ revenue: number; expenses: number; profit: number }> {
    const kpis = await this.getKpisByPeriod(period, periodValue);
    const revenue = kpis.reduce((sum, kpi) => sum + parseFloat(kpi.totalRevenue || "0"), 0);
    const expenses = kpis.reduce((sum, kpi) => sum + parseFloat(kpi.expenses || "0"), 0);
    return { revenue, expenses, profit: revenue - expenses };
  }

  async processQuarterlyProfitSharing(period: string, periodValue: string): Promise<ProfitSharing> {
    const { revenue, expenses, profit } = await this.calculateQuarterlyProfit(period, periodValue);
    const profitSharePool = profit * 0.49;

    const [created] = await db.insert(schema.profitSharing).values({
      period,
      periodValue,
      totalRevenue: revenue.toString(),
      totalExpenses: expenses.toString(),
      netProfit: profit.toString(),
      profitSharePool: profitSharePool.toString(),
      distributionStatus: 'pending',
    }).returning();

    return created;
  }

  async processQuarterlyProfitSharingWithMaxout(period: string, periodValue: string, respectMaxout: boolean): Promise<ProfitSharing> {
    return this.processQuarterlyProfitSharing(period, periodValue);
  }

  // Profit distribution operations
  async getProfitDistributions(): Promise<ProfitDistribution[]> {
    return await db.select().from(schema.profitDistribution);
  }

  async getProfitDistributionsBySharing(profitSharingId: string): Promise<ProfitDistribution[]> {
    return await db.select().from(schema.profitDistribution).where(eq(schema.profitDistribution.profitSharingId, profitSharingId));
  }

  async createProfitDistribution(distribution: InsertProfitDistribution): Promise<ProfitDistribution> {
    const [created] = await db.insert(schema.profitDistribution).values(distribution).returning();
    return created;
  }

  async updateProfitDistribution(id: string, distribution: Partial<InsertProfitDistribution>): Promise<ProfitDistribution | undefined> {
    const [updated] = await db.update(schema.profitDistribution)
      .set(distribution)
      .where(eq(schema.profitDistribution.id, id))
      .returning();
    return updated;
  }

  async markDistributionPaid(distributionId: string): Promise<ProfitDistribution | undefined> {
    const [updated] = await db.update(schema.profitDistribution)
      .set({ paymentStatus: 'paid', paidAt: new Date() })
      .where(eq(schema.profitDistribution.id, distributionId))
      .returning();
    return updated;
  }

  async processAllDistributionPayments(profitSharingId: string): Promise<number> {
    const distributions = await this.getProfitDistributionsBySharing(profitSharingId);
    let totalPaid = 0;
    for (const dist of distributions) {
      if (dist.paymentStatus === 'pending') {
        await this.markDistributionPaid(dist.id);
        totalPaid += parseFloat(dist.distributionAmount || "0");
      }
    }
    return totalPaid;
  }

  // Investment package operations
  async getInvestmentPackages(): Promise<InvestmentPackage[]> {
    return await db.select().from(schema.investmentPackages);
  }

  async getInvestmentPackage(id: string): Promise<InvestmentPackage | undefined> {
    const [pkg] = await db.select().from(schema.investmentPackages).where(eq(schema.investmentPackages.id, id));
    return pkg;
  }

  async getActiveInvestmentPackages(): Promise<InvestmentPackage[]> {
    return await db.select().from(schema.investmentPackages).where(eq(schema.investmentPackages.isActive, true));
  }

  async createInvestmentPackage(packageData: InsertInvestmentPackage): Promise<InvestmentPackage> {
    const [created] = await db.insert(schema.investmentPackages).values(packageData).returning();
    return created;
  }

  async updateInvestmentPackage(id: string, packageData: Partial<InsertInvestmentPackage>): Promise<InvestmentPackage | undefined> {
    const [updated] = await db.update(schema.investmentPackages)
      .set(packageData)
      .where(eq(schema.investmentPackages.id, id))
      .returning();
    return updated;
  }

  // Cash flow operations
  async createCashFlowTransaction(transaction: InsertTransaction): Promise<Transaction> {
    return this.createTransaction(transaction);
  }

  async getCashFlowTransactions(userId?: string): Promise<Transaction[]> {
    if (userId) {
      return await db.select().from(schema.transactions).where(eq(schema.transactions.userId, userId));
    }
    return await db.select().from(schema.transactions);
  }

  async getCashFlowTransactionsByType(type: string): Promise<Transaction[]> {
    return await db.select().from(schema.transactions).where(eq(schema.transactions.type, type));
  }

  async approveCashFlowTransaction(transactionId: string, approvedBy: string): Promise<Transaction | undefined> {
    const [updated] = await db.update(schema.transactions)
      .set({ status: 'approved', approvedBy, approvedAt: new Date() })
      .where(eq(schema.transactions.id, transactionId))
      .returning();
    return updated;
  }

  async rejectCashFlowTransaction(transactionId: string, approvedBy: string, reason?: string): Promise<Transaction | undefined> {
    const [updated] = await db.update(schema.transactions)
      .set({ status: 'rejected', approvedBy, description: reason || '' })
      .where(eq(schema.transactions.id, transactionId))
      .returning();
    return updated;
  }

  calculateWithdrawalTax(amount: number): number {
    if (amount <= 10000000) return 0;
    return Math.floor((amount - 10000000) * 0.1);
  }

  // System config operations
  async getSystemConfigs(): Promise<SystemConfig[]> {
    return await db.select().from(schema.systemConfigs);
  }

  async getSystemConfig(configKey: string): Promise<SystemConfig | undefined> {
    const [config] = await db.select().from(schema.systemConfigs).where(eq(schema.systemConfigs.configKey, configKey));
    return config;
  }

  async updateSystemConfig(configKey: string, configValue: string, description?: string, updatedBy?: string): Promise<SystemConfig> {
    const existing = await this.getSystemConfig(configKey);
    
    if (existing) {
      const [updated] = await db.update(schema.systemConfigs)
        .set({ configValue, description: description || existing.description, updatedBy, updatedAt: new Date() })
        .where(eq(schema.systemConfigs.configKey, configKey))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(schema.systemConfigs)
        .values({ configKey, configValue, description, updatedBy })
        .returning();
      return created;
    }
  }

  // Audit log operations
  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return await db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt)).limit(limit);
  }

  async createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(schema.auditLogs).values(auditLog).returning();
    return created;
  }

  async updateUserRole(userId: string, role: string, updatedBy: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    await this.createAuditLog({
      userId: updatedBy,
      action: 'user_role_change',
      entityType: 'user',
      entityId: userId,
      oldValue: user.role,
      newValue: role,
    });

    return this.updateUser(userId, { role });
  }

  async exportReportData(reportType: string, dateFrom?: string, dateTo?: string): Promise<any[]> {
    return [];
  }

  // User balance operations
  async getUserBalance(userId: string): Promise<UserBalance | undefined> {
    const [balance] = await db.select().from(schema.userBalances).where(eq(schema.userBalances.userId, userId));
    return balance;
  }

  async createUserBalance(balance: InsertUserBalance): Promise<UserBalance> {
    const [created] = await db.insert(schema.userBalances).values(balance).returning();
    return created;
  }

  async updateUserBalance(userId: string, balance: Partial<InsertUserBalance>): Promise<UserBalance | undefined> {
    const [updated] = await db.update(schema.userBalances)
      .set({ ...balance, updatedAt: new Date() })
      .where(eq(schema.userBalances.userId, userId))
      .returning();
    return updated;
  }

  async addToUserBalance(userId: string, amount: number, description: string): Promise<UserBalance> {
    const existing = await this.getUserBalance(userId);
    const currentBalance = existing ? parseFloat(existing.balance || "0") : 0;
    const newBalance = currentBalance + amount;

    if (existing) {
      return (await this.updateUserBalance(userId, { balance: newBalance.toString() }))!;
    } else {
      return await this.createUserBalance({ userId, balance: newBalance.toString() });
    }
  }

  // Deposit request operations
  async getDepositRequests(): Promise<DepositRequest[]> {
    return await db.select().from(schema.depositRequests);
  }

  async getDepositRequest(id: string): Promise<DepositRequest | undefined> {
    const [request] = await db.select().from(schema.depositRequests).where(eq(schema.depositRequests.id, id));
    return request;
  }

  async getUserDepositRequests(userId: string): Promise<DepositRequest[]> {
    return await db.select().from(schema.depositRequests).where(eq(schema.depositRequests.userId, userId));
  }

  async createDepositRequest(request: InsertDepositRequest): Promise<DepositRequest> {
    const [created] = await db.insert(schema.depositRequests).values(request).returning();
    return created;
  }

  async approveDepositRequest(requestId: string, approvedBy: string): Promise<DepositRequest | undefined> {
    const [updated] = await db.update(schema.depositRequests)
      .set({ status: 'approved', approvedBy, approvedAt: new Date() })
      .where(eq(schema.depositRequests.id, requestId))
      .returning();
    return updated;
  }

  async rejectDepositRequest(requestId: string, approvedBy: string, reason: string): Promise<DepositRequest | undefined> {
    const [updated] = await db.update(schema.depositRequests)
      .set({ status: 'rejected', approvedBy, rejectionReason: reason })
      .where(eq(schema.depositRequests.id, requestId))
      .returning();
    return updated;
  }

  // User shares history operations
  async getUserSharesHistory(userId: string): Promise<UserSharesHistory[]> {
    return await db.select().from(schema.userSharesHistory).where(eq(schema.userSharesHistory.userId, userId));
  }

  async createUserSharesHistory(history: InsertUserSharesHistory): Promise<UserSharesHistory> {
    const [created] = await db.insert(schema.userSharesHistory).values(history).returning();
    return created;
  }

  // Business tier config operations
  async getBusinessTierConfigs(): Promise<BusinessTierConfig[]> {
    return await db.select().from(schema.businessTierConfigs);
  }

  async getBusinessTierConfig(tierName: string): Promise<BusinessTierConfig | undefined> {
    const [config] = await db.select().from(schema.businessTierConfigs).where(eq(schema.businessTierConfigs.tierName, tierName));
    return config;
  }

  async createBusinessTierConfig(config: InsertBusinessTierConfig): Promise<BusinessTierConfig> {
    const [created] = await db.insert(schema.businessTierConfigs).values(config).returning();
    return created;
  }

  async updateBusinessTierConfig(tierName: string, config: Partial<InsertBusinessTierConfig>): Promise<BusinessTierConfig | undefined> {
    const [updated] = await db.update(schema.businessTierConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(schema.businessTierConfigs.tierName, tierName))
      .returning();
    return updated;
  }

  // Business tier operations
  async upgradeUserBusinessTier(userId: string, newTier: string, investmentAmount: number): Promise<User | undefined> {
    const shareAmount = await this.calculateUserShares(userId, investmentAmount);
    const [updated] = await db.update(schema.users)
      .set({ 
        businessTier: newTier, 
        investmentAmount: investmentAmount.toString(),
        totalShares: shareAmount.toString(),
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, userId))
      .returning();
    return updated;
  }

  async calculateUserShares(userId: string, amount: number): Promise<number> {
    return Math.floor(amount / 1000000);
  }

  async updateUserShares(userId: string, shareAmount: number, description: string, transactionType: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const currentShares = parseFloat(user.totalShares || "0");
    const newShares = currentShares + shareAmount;

    await db.update(schema.users)
      .set({ totalShares: newShares.toString(), updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    await this.createUserSharesHistory({
      userId,
      transactionType,
      shareAmount: shareAmount.toString(),
      description,
    });
  }

  async checkMaxoutLimit(userId: string): Promise<{ reached: boolean; limit: number; current: number }> {
    return { reached: false, limit: 0, current: 0 };
  }

  // QR check-in operations
  async createQrCheckin(checkin: { cardId: string; sessionType: string; notes?: string }): Promise<void> {
    await db.update(schema.cards)
      .set({ lastCheckIn: new Date() })
      .where(eq(schema.cards.id, checkin.cardId));
  }

  async updateCardSessions(cardId: string, decrement: number): Promise<Card | undefined> {
    const card = await this.getCard(cardId);
    if (!card) return undefined;

    const newSessions = Math.max(0, (card.remainingSessions || 0) - decrement);
    return this.updateCard(cardId, { remainingSessions: newSessions });
  }

  // Withdrawal operations
  async createWithdrawalRequest(userId: string, amount: number, description: string): Promise<Transaction> {
    const tax = this.calculateWithdrawalTax(amount);
    return this.createTransaction({
      userId,
      amount: amount.toString(),
      type: 'withdraw',
      description,
      status: 'pending',
      taxAmount: tax.toString(),
    });
  }

  async validateWithdrawalBalance(userId: string, amount: number): Promise<{ valid: boolean; availableBalance: number }> {
    const balance = await this.getUserBalance(userId);
    const availableBalance = balance ? parseFloat(balance.balance || "0") : 0;
    return { valid: availableBalance >= amount && amount >= 5000000, availableBalance };
  }
}
