// Mock database for development without PostgreSQL
import * as schema from "@shared/schema";

// Mock data
const mockUsers = [
  {
    id: "1",
    email: "admin@vcareglobal.com",
    password: "$2b$10$mock", // bcrypt hash for "password"
    role: "admin",
    name: "Admin User",
    status: "active",
    refCode: "ADMIN001",
    businessTier: "founder",
    investmentAmount: "245000000",
    totalShares: "245",
    padToken: "73500",
    maxoutReached: false,
    inheritanceRight: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    email: "customer@vcareglobal.com",
    password: "$2b$10$mock", // bcrypt hash for "password"
    role: "customer",
    name: "Test Customer",
    status: "active",
    refCode: "CUST001",
    businessTier: "card_customer",
    investmentAmount: "2000000",
    totalShares: "2",
    padToken: "200",
    maxoutReached: false,
    inheritanceRight: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

const mockCards = [
  {
    id: "1",
    cardNumber: "VCG001",
    cardType: "Gold",
    customerName: "Test Customer",
    ownerId: "2",
    status: "active",
    price: "2000000",
    remainingSessions: 12,
    consultationSessions: 12,
    shareHistory: "",
    connectionCommission: "8.0",
    vipSupport: "5.0",
    profitSharePercentage: "49.0",
    padToken: "200",
    currentShares: "2",
    maxoutLimit: "4200000",
    issuedDate: new Date(),
    lastCheckIn: null,
  }
];

const mockBranches = [
  {
    id: "1",
    name: "Chi nhánh Hà Nội",
    address: "123 Đường ABC, Hà Nội",
    monthlyRevenue: "50000000",
    staffCount: 5,
    currentKpi: "85.5",
    monthlyTarget: "100000000",
    padToken: "20000",
  },
  {
    id: "2",
    name: "Chi nhánh TP.HCM",
    address: "456 Đường XYZ, TP.HCM",
    monthlyRevenue: "75000000",
    staffCount: 8,
    currentKpi: "92.3",
    monthlyTarget: "120000000",
    padToken: "25000",
  }
];

const mockTransactions = [
  {
    id: "1",
    type: "income",
    amount: "2000000",
    description: "Mua thẻ chăm sóc Gold",
    contributionType: "card",
    padTokenAmount: "200",
    status: "completed",
    date: new Date(),
  },
  {
    id: "2",
    type: "income", 
    amount: "5000000",
    description: "Đầu tư gói Founder",
    contributionType: "cash",
    padTokenAmount: "15000",
    status: "completed",
    date: new Date(),
  }
];

const mockSystemConfigs = [
  { configKey: "maxout_limit_percentage", configValue: "210", description: "Maximum payout limit as percentage of card price" },
  { configKey: "kpi_threshold_points", configValue: "50", description: "Minimum KPI points required per quarter for shares" },
  { configKey: "profit_share_rate", configValue: "49", description: "Percentage of quarterly profit distributed to shareholders" },
  { configKey: "withdrawal_minimum", configValue: "5000000", description: "Minimum withdrawal amount in VND" },
  { configKey: "withdrawal_tax_rate", configValue: "10", description: "Tax rate percentage for withdrawals over 10M VND" },
  { configKey: "corporate_tax_rate", configValue: "20", description: "Corporate tax rate percentage on gross profit" },
];

// Mock database interface that mimics drizzle ORM
export class MockDatabase {
  users = mockUsers;
  cards = mockCards;
  branches = mockBranches;
  transactions = mockTransactions;
  staff: any[] = [];
  kpis: any[] = [];
  referrals: any[] = [];
  profitSharing: any[] = [];
  profitDistribution: any[] = [];
  investmentPackages: any[] = [];
  systemConfigs = mockSystemConfigs;
  auditLogs: any[] = [];
  userBalances: any[] = [];
  depositRequests: any[] = [];
  userSharesHistory: any[] = [];
  padTokenHistory: any[] = [];
  businessTierConfigs: any[] = [];
  roles: any[] = [];
  userRoles: any[] = [];
  assetContributions: any[] = [];
  checkIns: any[] = [];
  staffKpis: any[] = [];

  // Mock query methods that return the right structure
  select() {
    return {
      from: (table: any) => ({
        where: (condition: any) => ({
          execute: async () => {
            // Mock implementation - return empty array for now
            return [];
          }
        }),
        execute: async () => {
          // Return mock data based on table
          if (table === schema.systemConfigs) {
            return this.systemConfigs;
          } else if (table === schema.users) {
            return this.users;
          } else if (table === schema.cards) {
            return this.cards;
          } else if (table === schema.branches) {
            return this.branches;
          } else if (table === schema.transactions) {
            return this.transactions;
          }
          return [];
        }
      })
    };
  }

  insert(table: any) {
    return {
      values: (data: any) => ({
        returning: () => ({
          execute: async () => {
            // Mock implementation - return the inserted data
            const newData = { ...data, id: Math.random().toString() };
            return [newData];
          }
        }),
        execute: async () => {
          // Mock implementation - return the inserted data
          const newData = { ...data, id: Math.random().toString() };
          return [newData];
        }
      })
    };
  }

  update(table: any) {
    return {
      set: (data: any) => ({
        where: (condition: any) => ({
          returning: () => ({
            execute: async () => {
              // Mock implementation
              return [];
            }
          }),
          execute: async () => {
            // Mock implementation
            return [];
          }
        })
      })
    };
  }

  delete(table: any) {
    return {
      where: (condition: any) => ({
        returning: () => ({
          execute: async () => {
            // Mock implementation
            return [];
          }
        }),
        execute: async () => {
          // Mock implementation
          return [];
        }
      })
    };
  }
}

export const mockDb = new MockDatabase();
