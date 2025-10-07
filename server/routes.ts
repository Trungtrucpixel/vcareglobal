import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertCardSchema, 
  insertBranchSchema, 
  insertStaffSchema, 
  insertTransactionSchema, 
  insertKpiSchema, 
  insertStaffKpiSchema, 
  insertReferralSchema,
  insertAssetContributionSchema,
  profitSharingValidationSchema,
  profitSharingProcessSchema,
  profitDistributionValidationSchema,
  quarterlyPeriodSchema,
  validateQuarterBoundaries
} from "@shared/schema";
import { z } from "zod";

// Legacy validation schema for KPI endpoints (keeping backward compatibility)
const legacyKpiValidationSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  period: z.enum(["month", "quarter", "year"], { 
    errorMap: () => ({ message: "Period must be 'month', 'quarter', or 'year'" }) 
  }).default("month"),
  periodValue: z.string().min(1, "Period value is required").default("2024-11")
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Card routes
  app.get("/api/cards", async (req, res) => {
    try {
      const cards = await storage.getCards();
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  app.post("/api/cards", async (req, res) => {
    try {
      const cardData = insertCardSchema.parse(req.body);
      
      // Tính PAD Token (100 PAD = 1 triệu VNĐ)
      const price = parseFloat(cardData.price);
      const padToken = (price / 1000000) * 100; // VNĐ to triệu, then * 100
      
      // Set consultation sessions dựa trên loại thẻ
      const consultationSessionsMap: Record<string, number> = {
        "Standard": 12,
        "Silver": 15,
        "Gold": 18,
        "Platinum": 21,
        "Diamond": 24
      };
      const consultationSessions = consultationSessionsMap[cardData.cardType] || 12;
      
      // Enrich card data với PAD Token và consultation sessions
      const enrichedCardData = {
        ...cardData,
        padToken: padToken.toString(),
        consultationSessions
      };
      
      const card = await storage.createCard(enrichedCardData);
      
      // Auto-upgrade role nếu user đã xác thực
      if (req.isAuthenticated() && req.user && card.ownerId) {
        const userId = card.ownerId;
        
        // Tính tổng giá trị góp từ thẻ
        const userCards = await storage.getCards();
        const totalCardValue = userCards
          .filter(c => c.ownerId === userId)
          .reduce((sum, c) => sum + parseFloat(c.price), 0);
        
        // Nếu tổng > 101 triệu, auto-upgrade từ Khách hàng → Thiên thần
        if (totalCardValue > 101000000) {
          const user = await storage.getUser(userId);
          if (user && user.role === "customer") {
            await storage.updateUser(userId, { role: "shareholder" });
            console.log(`✅ Auto-upgraded user ${user.email} from customer to shareholder (total cards: ${(totalCardValue/1000000).toFixed(1)}M VNĐ)`);
          }
        }
      }
      
      res.status(201).json(card);
    } catch (error) {
      console.error("Card creation error:", error);
      res.status(400).json({ message: "Invalid card data" });
    }
  });

  app.put("/api/cards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const card = await storage.updateCard(id, updateData);
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.json(card);
    } catch (error) {
      res.status(400).json({ message: "Failed to update card" });
    }
  });

  app.delete("/api/cards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCard(id);
      if (!deleted) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete card" });
    }
  });

  // Branch routes
  app.get("/api/branches", async (req, res) => {
    try {
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch branches" });
    }
  });

  app.post("/api/branches", async (req, res) => {
    try {
      const branchData = insertBranchSchema.parse(req.body);
      const branch = await storage.createBranch(branchData);
      res.status(201).json(branch);
    } catch (error) {
      res.status(400).json({ message: "Invalid branch data" });
    }
  });

  // Staff routes
  app.get("/api/staff", async (req, res) => {
    try {
      const staff = await storage.getStaff();
      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.post("/api/staff", async (req, res) => {
    try {
      const staffData = insertStaffSchema.parse(req.body);
      const staffMember = await storage.createStaffMember(staffData);
      res.status(201).json(staffMember);
    } catch (error) {
      res.status(400).json({ message: "Invalid staff data" });
    }
  });

  app.put("/api/staff/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const staffMember = await storage.updateStaffMember(id, updateData);
      if (!staffMember) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      res.json(staffMember);
    } catch (error) {
      res.status(400).json({ message: "Failed to update staff member" });
    }
  });

  app.delete("/api/staff/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteStaffMember(id);
      if (!deleted) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(transactionData);
      
      // AUTOMATION: Automatically process referral commissions for income transactions
      const { referralCode } = req.body;
      if (referralCode && transaction.type === "income") {
        try {
          const referral = await storage.processFirstTransaction(referralCode, transaction.id);
          if (referral) {
            console.log(`✅ Automatically processed referral commission for code: ${referralCode}, transaction: ${transaction.id}`);
          }
        } catch (referralError) {
          // Log referral processing errors but don't fail the transaction
          console.error(`⚠️ Referral processing failed for code ${referralCode}:`, referralError instanceof Error ? referralError.message : 'Unknown error');
        }
      }
      
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid transaction data" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      const cards = await storage.getCards();
      const branches = await storage.getBranches();
      const staff = await storage.getStaff();

      // Calculate total revenue from income transactions
      const totalRevenue = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      // Get current user's PAD Token (if authenticated)
      let userPadToken = 0;
      if (req.isAuthenticated() && req.user) {
        const currentUser = await storage.getUser((req.user as any).id);
        userPadToken = currentUser?.padToken ? parseFloat(currentUser.padToken.toString()) : 0;
      }

      const metrics = {
        totalRevenue: totalRevenue.toLocaleString('vi-VN'),
        activeCards: cards.filter(c => c.status === "active").length,
        branches: branches.length,
        staff: staff.length,
        padToken: userPadToken
      };

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Revenue chart data
  app.get("/api/dashboard/revenue-chart", async (req, res) => {
    try {
      // Mock revenue data for 6 months
      const revenueData = {
        labels: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6'],
        data: [120, 150, 180, 140, 200, 245]
      };
      res.json(revenueData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue chart data" });
    }
  });

  // Business overview data for enhanced dashboard
  app.get("/api/dashboard/business-overview", async (req, res) => {
    try {
      const businessData = {
        quarterlyData: {
          labels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'],
          revenue: [1000, 1200, 950, 1100],
          expenses: [600, 720, 570, 660], 
          profitAfterTax: [300, 360, 285, 330]
        },
        cardMaxoutStatus: [
          { type: 'VIP Gold', current: 85, max: 100, percentage: 85 },
          { type: 'VIP Silver', current: 45, max: 75, percentage: 60 },
          { type: 'Member', current: 120, max: 200, percentage: 60 }
        ],
        profitAllocation: {
          roles: 49,
          operations: 30,
          expansion: 21,
          capitalBased: 30,
          laborBased: 19
        },
        profitAllocationBreakdown: {
          capital: {
            percentage: 30,
            roles: ['Sáng lập', 'Thiên thần', 'Phát triển', 'Đồng hành', 'Góp tài sản', 'Khách hàng']
          },
          labor: {
            percentage: 19,
            roles: ['Sweat Equity', 'Chi nhánh đạt KPI']
          }
        },
        roiPredictions: [
          { role: 'Sáng lập', investment: 300, sixMonths: 12000, oneYear: 15000, threeYears: 25000, fiveYears: 40000, fiveYearROI: 597 },
          { role: 'Thiên thần', investment: 150, sixMonths: 12000, oneYear: 15000, threeYears: 25000, fiveYears: 40000, fiveYearROI: 500 },
          { role: 'Phát triển', investment: 100, sixMonths: 12000, oneYear: 15000, threeYears: 25000, fiveYears: 40000, fiveYearROI: 400 },
          { role: 'Đồng hành', investment: 50, sixMonths: 12000, oneYear: 15000, threeYears: 25000, fiveYears: 40000, fiveYearROI: 380 },
          { role: 'Góp tài sản', investment: 200, sixMonths: 12000, oneYear: 15000, threeYears: 25000, fiveYears: 40000, fiveYearROI: 450 }
        ],
        alerts: [
          { type: 'danger', message: 'Chi nhánh Quận 3 có KPI thấp (65%)', severity: 'high' },
          { type: 'warning', message: 'Thẻ VIP Gold sắp đạt giới hạn (85%)', severity: 'medium' }
        ],
        topBranches: [
          { rank: 1, name: 'Branch A', score: 95, kpi: 95 },
          { rank: 2, name: 'Branch B', score: 87, kpi: 87 },
          { rank: 3, name: 'Branch C', score: 82, kpi: 82 }
        ]
      };
      res.json(businessData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch business overview data" });
    }
  });

  // Check-in routes
  app.post("/api/cards/:id/checkin", async (req, res) => {
    try {
      const { id } = req.params;
      const { sessionType, notes } = req.body;
      
      const card = await storage.getCard(id);
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }

      // Update card's remaining sessions and last check-in
      const updatedCard = await storage.updateCard(id, {
        remainingSessions: Math.max(0, (card.remainingSessions || 0) - 1)
      });
      
      res.json({ success: true, card: updatedCard, message: "Check-in successful" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process check-in" });
    }
  });

  // Card types and pricing
  app.get("/api/cards/types", async (req, res) => {
    try {
      const cardTypes = [
        { type: "Standard", price: 2000000, maxSessions: 5 },
        { type: "Silver", price: 10000000, maxSessions: 15 },
        { type: "Gold", price: 30000000, maxSessions: 30 },
        { type: "Platinum", price: 70000000, maxSessions: 50 },
        { type: "Diamond", price: 100000000, maxSessions: 80 }
      ];
      res.json(cardTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch card types" });
    }
  });

  // Card benefits analysis
  app.get("/api/cards/:id/benefits", async (req, res) => {
    try {
      const { id } = req.params;
      const card = await storage.getCard(id);
      
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      
      const price = parseFloat(card.price);
      const currentShares = parseFloat(card.currentShares || "0");
      const maxoutLimit = price * 2.1; // 210% of card value
      const shareValue = currentShares * 1000000; // 1M VND = 1 share
      
      let status = "active";
      if (shareValue >= maxoutLimit * 0.9) {
        status = "near_maxout";
      } else if (shareValue >= maxoutLimit) {
        status = "stopped";
      }
      
      const benefits = {
        cardId: id,
        cardType: card.cardType,
        price: price,
        currentShares: currentShares,
        shareValue: shareValue,
        maxoutLimit: maxoutLimit,
        maxoutPercentage: (shareValue / maxoutLimit) * 100,
        status: status,
        connectionCommission: parseFloat(card.connectionCommission || "8"),
        vipSupport: parseFloat(card.vipSupport || "5"),
        profitSharePercentage: parseFloat(card.profitSharePercentage || "49"),
        padToken: parseFloat(card.padToken || "0"),
        consultationSessions: card.consultationSessions || 12,
        isNearMaxout: shareValue >= maxoutLimit * 0.9
      };
      
      res.json(benefits);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate benefits" });
    }
  });

  // KPI routes (protected)
  app.get("/api/kpis", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const kpis = await storage.getKpis();
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  app.get("/api/kpis/branch/:branchId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { branchId } = req.params;
      const kpis = await storage.getKpisByBranch(branchId);
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch branch KPIs" });
    }
  });

  app.get("/api/kpis/period/:period/:periodValue", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { period, periodValue } = req.params;
      const kpis = await storage.getKpisByPeriod(period, periodValue);
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch period KPIs" });
    }
  });

  // Branch performance and ranking (protected)
  app.get("/api/branches/performance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { period = "month", periodValue = "2024-11" } = req.query;
      const branches = await storage.getBranches();
      const branchPerformance = [];
      
      for (const branch of branches) {
        const kpiScore = await storage.calculateBranchKpi(branch.id, period as string, periodValue as string);
        const kpis = await storage.getKpisByBranch(branch.id);
        const currentKpis = kpis.filter(k => k.period === period && k.periodValue === periodValue);
        
        // Revenue predictions based on franchise tier
        const revenuePredictions = {
          sixMonths: 80000000,    // 80 triệu/tháng
          oneYear: 120000000,     // 120 triệu/tháng
          threeYears: 200000000,  // 200 triệu/tháng
          fiveYears: 350000000    // 350 triệu/tháng
        };
        
        branchPerformance.push({
          ...branch,
          kpiScore,
          cardSales: currentKpis.reduce((sum, k) => sum + (k.cardSales || 0), 0),
          revisitRate: currentKpis.length > 0 ? 
            currentKpis.reduce((sum, k) => sum + parseFloat(k.revisitRate || "0"), 0) / currentKpis.length : 0,
          deviceRevenue: currentKpis.reduce((sum, k) => sum + parseFloat(k.deviceRevenue || "0"), 0),
          totalRevenue: currentKpis.reduce((sum, k) => sum + parseFloat(k.totalRevenue || "0"), 0),
          isUnderperforming: kpiScore < 70,
          padTokenValue: parseFloat(branch.padToken || "20000"), // 200 shares = 20,000 PAD
          revenuePredictions
        });
      }
      
      // Sort by KPI score descending for ranking
      branchPerformance.sort((a, b) => b.kpiScore - a.kpiScore);
      
      res.json(branchPerformance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch branch performance" });
    }
  });

  // KPI alerts for underperforming branches (protected)
  app.get("/api/kpis/alerts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { period = "month", periodValue = "2024-11" } = req.query;
      const branches = await storage.getBranches();
      const alerts = [];
      
      for (const branch of branches) {
        const kpiScore = await storage.calculateBranchKpi(branch.id, period as string, periodValue as string);
        
        if (kpiScore < 70) {
          alerts.push({
            type: "danger",
            severity: kpiScore < 50 ? "critical" : "high",
            message: `Chi nhánh ${branch.name} có KPI thấp (${kpiScore}%)`,
            branchId: branch.id,
            branchName: branch.name,
            kpiScore: kpiScore
          });
        } else if (kpiScore < 80) {
          alerts.push({
            type: "warning",
            severity: "medium",
            message: `Chi nhánh ${branch.name} cần cải thiện KPI (${kpiScore}%)`,
            branchId: branch.id,
            branchName: branch.name,
            kpiScore: kpiScore
          });
        }
      }
      
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch KPI alerts" });
    }
  });

  // Create new KPI record (protected)
  app.post("/api/kpis", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const kpiData = insertKpiSchema.parse(req.body);
      const kpi = await storage.createKpi(kpiData);
      res.status(201).json(kpi);
    } catch (error) {
      res.status(400).json({ message: "Invalid KPI data" });
    }
  });

  // Profit sharing validation (protected) - Updated for quarterly-only processing
  app.post("/api/profit-sharing/validate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Validate request body with new quarterly-only schema
      const validationResult = profitSharingValidationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      
      const { period, periodValue } = validationResult.data;
      
      // Validate quarter boundaries
      const { isValid } = validateQuarterBoundaries(periodValue);
      if (!isValid) {
        return res.status(400).json({ 
          message: "Invalid quarter period",
          errors: [{ field: "periodValue", message: "Period value must be in format YYYY-Q[1-4]" }]
        });
      }
      
      // Check if profit sharing already exists for this period
      const existingProfitSharing = await storage.getProfitSharingByPeriod(period, periodValue);
      const alreadyProcessed = existingProfitSharing && existingProfitSharing.distributionStatus === "completed";
      
      // Calculate quarterly profit for validation
      let profitData;
      try {
        profitData = await storage.calculateQuarterlyProfit(period, periodValue);
      } catch (error) {
        return res.status(400).json({ 
          message: "Failed to calculate quarterly profit",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      const validation = {
        period,
        periodValue,
        isValid: true,
        alreadyProcessed,
        profitData,
        profitSharePool: profitData.profit * 0.49,
        canProcess: profitData.profit > 0 && !alreadyProcessed,
        message: alreadyProcessed ? 
          `Profit sharing for ${periodValue} has already been processed` :
          profitData.profit > 0 ?
            `Ready to process profit sharing for ${periodValue} with ${(profitData.profit * 0.49).toLocaleString('vi-VN')} VND profit pool` :
            `Cannot process profit sharing for ${periodValue}: No profit to distribute`
      };
      
      res.json(validation);
    } catch (error) {
      console.error("Error validating profit sharing:", error);
      res.status(500).json({ message: "Failed to validate profit sharing" });
    }
  });

  // Staff KPI routes (protected)
  app.get("/api/staff-kpis", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const staffKpis = await storage.getStaffKpis();
      res.json(staffKpis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff KPIs" });
    }
  });

  app.get("/api/staff-kpis/staff/:staffId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { staffId } = req.params;
      const staffKpis = await storage.getStaffKpisByStaff(staffId);
      res.json(staffKpis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff KPIs" });
    }
  });

  app.get("/api/staff-kpis/period/:period/:periodValue", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { period, periodValue } = req.params;
      const staffKpis = await storage.getStaffKpisByPeriod(period, periodValue);
      res.json(staffKpis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff KPIs for period" });
    }
  });

  app.post("/api/staff-kpis", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const staffKpiData = insertStaffKpiSchema.parse(req.body);
      const staffKpi = await storage.createStaffKpi(staffKpiData);
      res.status(201).json(staffKpi);
    } catch (error) {
      res.status(400).json({ message: "Invalid staff KPI data" });
    }
  });

  app.put("/api/staff-kpis/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { id } = req.params;
      const updateData = req.body;
      const staffKpi = await storage.updateStaffKpi(id, updateData);
      if (!staffKpi) {
        return res.status(404).json({ message: "Staff KPI not found" });
      }
      res.json(staffKpi);
    } catch (error) {
      res.status(500).json({ message: "Failed to update staff KPI" });
    }
  });

  // Staff KPI calculation and share processing
  app.get("/api/staff-kpis/calculate/:staffId/:period/:periodValue", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { staffId, period, periodValue } = req.params;
      const points = await storage.calculateStaffKpiPoints(staffId, period, periodValue);
      const slotsEarned = Math.floor(points / 50); // ≥50 points = 1 slot
      const sharesEarned = slotsEarned * 50; // 1 slot = 50 shares
      const padTokenEarned = points * 10; // 1 KPI point = 10 PAD Token
      
      res.json({
        staffId,
        period,
        periodValue,
        totalPoints: points,
        slotsEarned,
        sharesEarned,
        padTokenEarned,
        isEligible: points >= 50
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate staff KPI points" });
    }
  });

  app.post("/api/staff-kpis/process-quarterly-shares", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { period, periodValue } = req.body;
      
      if (!period || !periodValue) {
        return res.status(400).json({ message: "Period and periodValue are required" });
      }
      
      await storage.processQuarterlyShares(period, periodValue);
      res.json({ 
        message: `Successfully processed quarterly shares for ${period} ${periodValue}`,
        period,
        periodValue
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process quarterly shares" });
    }
  });

  // Labor pool (19%) - Phân bổ pool công cho Sweat Equity và Chi nhánh đạt KPI
  app.get("/api/staff/labor-pool", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const staffKpis = await storage.getStaffKpis();
      const allStaff = await storage.getStaff();
      
      // Calculate total PAD Token earned from KPI (19% labor pool)
      const totalPadTokenFromKpi = staffKpis.reduce((sum, kpi) => {
        return sum + parseFloat(kpi.padTokenEarned || "0");
      }, 0);
      
      // Calculate total shares from sweat equity
      const totalSweatEquityShares = staffKpis.reduce((sum, kpi) => {
        return sum + parseFloat(kpi.sharesAwarded || "0");
      }, 0);
      
      // Get staff with PAD tokens
      const staffWithPadTokens = allStaff.map(s => ({
        id: s.id,
        name: s.name,
        position: s.position,
        padToken: parseFloat(s.padToken || "0"),
        shares: s.shares || 0
      })).filter(s => s.padToken > 0 || s.shares > 0);
      
      res.json({
        totalPadTokenFromKpi,
        totalSweatEquityShares,
        laborPoolPercentage: 19,
        staffDistribution: staffWithPadTokens,
        poolValueInVnd: totalPadTokenFromKpi * 10000 // 100 PAD = 1M VND, so 1 PAD = 10,000 VND
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch labor pool data" });
    }
  });

  // Referral routes (protected)
  app.get("/api/referrals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const referrals = await storage.getReferrals();
      res.json(referrals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get("/api/referrals/referrer/:referrerId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { referrerId } = req.params;
      const referrals = await storage.getReferralsByReferrer(referrerId);
      
      // Calculate summary statistics
      const totalReferrals = referrals.length;
      const totalContributionValue = referrals.reduce((sum, r) => sum + parseFloat(r.contributionValue || "0"), 0);
      const totalCommissionEarned = referrals.reduce((sum, r) => sum + parseFloat(r.commissionAmount || "0"), 0);
      const totalCommissionPaid = referrals.reduce((sum, r) => sum + parseFloat(r.commissionPaid || "0"), 0);
      const pendingCommission = totalCommissionEarned - totalCommissionPaid;
      
      res.json({
        referrals,
        summary: {
          totalReferrals,
          totalContributionValue,
          totalCommissionEarned,
          totalCommissionPaid,
          pendingCommission
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referrals by referrer" });
    }
  });

  app.get("/api/referrals/code/:referralCode", async (req, res) => {
    try {
      const { referralCode } = req.params;
      const referral = await storage.getReferralByCode(referralCode);
      
      if (!referral) {
        return res.status(404).json({ message: "Referral code not found" });
      }
      
      res.json(referral);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral by code" });
    }
  });

  app.post("/api/referrals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const referralData = insertReferralSchema.parse(req.body);
      const referral = await storage.createReferral(referralData);
      res.status(201).json(referral);
    } catch (error) {
      res.status(400).json({ message: "Invalid referral data" });
    }
  });

  app.put("/api/referrals/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { id } = req.params;
      const updateData = req.body;
      const referral = await storage.updateReferral(id, updateData);
      if (!referral) {
        return res.status(404).json({ message: "Referral not found" });
      }
      res.json(referral);
    } catch (error) {
      res.status(500).json({ message: "Failed to update referral" });
    }
  });

  // Generate referral code for staff
  app.post("/api/referrals/generate-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { staffId } = req.body;
      
      if (!staffId) {
        return res.status(400).json({ message: "Staff ID is required" });
      }
      
      const referralCode = await storage.generateReferralCode(staffId);
      res.json({ 
        staffId,
        referralCode,
        referralUrl: `${req.protocol}://${req.get('host')}/referral/${referralCode}`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate referral code" });
    }
  });

  // CTV Pool (8%) - Pool hoa hồng từ kết nối/giới thiệu
  app.get("/api/referrals/ctv-pool", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const referrals = await storage.getReferrals();
      
      // Calculate total commission from 8% CTV pool
      const totalCommissionEarned = referrals.reduce((sum, r) => {
        return sum + parseFloat(r.commissionAmount || "0");
      }, 0);
      
      const totalCommissionPaid = referrals.reduce((sum, r) => {
        return sum + parseFloat(r.commissionPaid || "0");
      }, 0);
      
      const pendingCommission = totalCommissionEarned - totalCommissionPaid;
      
      // Calculate total PAD Token from referrals
      const totalPadTokenFromReferrals = referrals.reduce((sum, r) => {
        return sum + parseFloat(r.padTokenAmount || "0");
      }, 0);
      
      // Group by referrer
      const referrerSummary: Record<string, { name: string; totalCommission: number; totalPaid: number; pending: number; padToken: number; count: number }> = {};
      
      for (const ref of referrals) {
        const referrerId = ref.referrerId || 'unknown';
        if (!referrerSummary[referrerId]) {
          referrerSummary[referrerId] = {
            name: 'Unknown',
            totalCommission: 0,
            totalPaid: 0,
            pending: 0,
            padToken: 0,
            count: 0
          };
        }
        
        referrerSummary[referrerId].totalCommission += parseFloat(ref.commissionAmount || "0");
        referrerSummary[referrerId].totalPaid += parseFloat(ref.commissionPaid || "0");
        referrerSummary[referrerId].pending = referrerSummary[referrerId].totalCommission - referrerSummary[referrerId].totalPaid;
        referrerSummary[referrerId].padToken += parseFloat(ref.padTokenAmount || "0");
        referrerSummary[referrerId].count += 1;
      }
      
      res.json({
        totalCommissionEarned,
        totalCommissionPaid,
        pendingCommission,
        totalPadTokenFromReferrals,
        commissionRate: 8,
        referrerSummary,
        totalReferrals: referrals.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch CTV pool data" });
    }
  });

  // Calculate referral commission
  app.get("/api/referrals/commission/:referralId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { referralId } = req.params;
      const commission = await storage.calculateReferralCommission(referralId);
      res.json({ referralId, commission });
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate referral commission" });
    }
  });

  // Process first transaction for referral - SECURED: No client-controlled amounts
  app.post("/api/referrals/process-transaction", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { referralCode, transactionId } = req.body;
      
      if (!referralCode || !transactionId) {
        return res.status(400).json({ 
          message: "Missing required fields: referralCode, transactionId" 
        });
      }
      
      const referral = await storage.processFirstTransaction(referralCode, transactionId);
      if (!referral) {
        return res.status(404).json({ message: "Referral code not found" });
      }
      
      res.json(referral);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process first transaction";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Mark commission as paid - SECURED: Admin/Finance only
  app.post("/api/referrals/:referralId/mark-paid", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // AUTHORIZATION: Only admin and finance roles can process payments
    const user = req.user as any;
    if (!user || (user.role !== 'admin' && user.role !== 'finance')) {
      return res.status(403).json({ message: "Access denied. Only admin and finance users can process commission payments." });
    }
    
    try {
      const { referralId } = req.params;
      const { paidAmount } = req.body;
      
      if (typeof paidAmount !== 'number' || paidAmount <= 0) {
        return res.status(400).json({ message: "Invalid paid amount" });
      }
      
      const referral = await storage.markCommissionPaid(referralId, paidAmount);
      if (!referral) {
        return res.status(404).json({ message: "Referral not found" });
      }
      
      res.json(referral);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to mark commission as paid";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Process all commission payments for a referrer - SECURED: Admin/Finance only
  app.post("/api/referrals/process-payments/:referrerId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // AUTHORIZATION: Only admin and finance roles can process payments
    const user = req.user as any;
    if (!user || (user.role !== 'admin' && user.role !== 'finance')) {
      return res.status(403).json({ message: "Access denied. Only admin and finance users can process commission payments." });
    }
    
    try {
      const { referrerId } = req.params;
      const totalPaid = await storage.processCommissionPayments(referrerId);
      
      res.json({ 
        referrerId,
        totalPaid,
        message: `Successfully processed commission payments totaling ${totalPaid.toLocaleString('vi-VN')} VND`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process commission payments";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Profit sharing routes
  // Get all profit sharings
  app.get("/api/profit-sharings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const profitSharings = await storage.getProfitSharings();
      res.json(profitSharings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profit sharings" });
    }
  });

  // Get profit sharing by period
  app.get("/api/profit-sharings/period/:period/:periodValue", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { period, periodValue } = req.params;
      const profitSharing = await storage.getProfitSharingByPeriod(period, periodValue);
      
      if (!profitSharing) {
        return res.status(404).json({ message: "Profit sharing not found for this period" });
      }
      
      res.json(profitSharing);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profit sharing" });
    }
  });

  // Calculate quarterly profit
  app.get("/api/profit-sharings/calculate/:period/:periodValue", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { period, periodValue } = req.params;
      const profitData = await storage.calculateQuarterlyProfit(period, periodValue);
      
      res.json({
        period,
        periodValue,
        ...profitData,
        profitSharePool: profitData.profit * 0.49
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate quarterly profit" });
    }
  });

  // Process quarterly profit sharing
  app.post("/api/profit-sharings/process", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Role-based access control for sensitive profit operations
    const user = req.user as any;
    if (!user || !["admin", "finance"].includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions. Admin or finance role required." });
    }
    
    try {
      // Validate request with enhanced schema
      const validationResult = profitSharingProcessSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      
      const { period, periodValue } = validationResult.data;
      
      console.log(`🔄 Processing profit sharing for ${periodValue}`);
      
      const profitSharing = await storage.processQuarterlyProfitSharing(period, periodValue);
      
      // Get the created distributions for response
      const distributions = await storage.getProfitDistributionsBySharing(profitSharing.id);
      
      res.json({
        profitSharing,
        distributions,
        summary: {
          totalProfit: parseFloat(profitSharing.netProfit || "0"),
          profitSharePool: parseFloat(profitSharing.profitSharePool || "0"),
          totalShares: profitSharing.totalShares,
          profitPerShare: parseFloat(profitSharing.profitPerShare || "0"),
          distributionsCreated: distributions.length,
          totalDistributed: distributions.reduce((sum, d) => sum + parseFloat(d.distributionAmount || "0"), 0)
        }
      });
    } catch (error: any) {
      console.error("❌ Profit sharing processing failed:", error);
      res.status(400).json({ 
        message: error.message || "Failed to process quarterly profit sharing",
        error: error.message
      });
    }
  });

  // Get profit distributions
  app.get("/api/profit-distributions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const distributions = await storage.getProfitDistributions();
      res.json(distributions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profit distributions" });
    }
  });

  // Get profit distributions by sharing ID
  app.get("/api/profit-distributions/sharing/:profitSharingId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { profitSharingId } = req.params;
      const distributions = await storage.getProfitDistributionsBySharing(profitSharingId);
      res.json(distributions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profit distributions" });
    }
  });

  // Mark distribution as paid
  app.post("/api/profit-distributions/:distributionId/mark-paid", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Role-based access control for payment operations
    const user = req.user as any;
    if (!user || !["admin", "finance"].includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions. Admin or finance role required." });
    }
    
    try {
      const { distributionId } = req.params;
      
      // Validate distribution ID format
      const validationResult = z.string().uuid().safeParse(distributionId);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid distribution ID format",
          error: "Distribution ID must be a valid UUID"
        });
      }
      
      const distribution = await storage.markDistributionPaid(distributionId);
      
      if (!distribution) {
        return res.status(404).json({ message: "Distribution not found" });
      }
      
      res.json({
        distribution,
        message: `Successfully marked distribution as paid: ${parseFloat(distribution.distributionAmount || "0").toLocaleString('vi-VN')} VND`
      });
    } catch (error: any) {
      console.error("❌ Failed to mark distribution as paid:", error);
      res.status(400).json({ 
        message: error.message || "Failed to mark distribution as paid",
        error: error.message
      });
    }
  });

  // Process all distribution payments for a profit sharing
  app.post("/api/profit-distributions/process-payments/:profitSharingId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Role-based access control for payment operations
    const user = req.user as any;
    if (!user || !["admin", "finance"].includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions. Admin or finance role required." });
    }
    
    try {
      const { profitSharingId } = req.params;
      
      // Validate profit sharing ID format
      const validationResult = z.string().uuid().safeParse(profitSharingId);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid profit sharing ID format",
          error: "Profit sharing ID must be a valid UUID"
        });
      }
      
      console.log(`💰 Processing all distribution payments for profit sharing: ${profitSharingId}`);
      
      const totalPaid = await storage.processAllDistributionPayments(profitSharingId);
      
      // Get updated distributions for response
      const distributions = await storage.getProfitDistributionsBySharing(profitSharingId);
      const paidDistributions = distributions.filter(d => d.paymentStatus === "paid");
      
      res.json({
        profitSharingId,
        totalPaid,
        paymentsProcessed: paidDistributions.length,
        distributionsSummary: distributions.map(d => ({
          id: d.id,
          staffName: d.staffName,
          amount: parseFloat(d.distributionAmount || "0"),
          status: d.paymentStatus,
          paidAt: d.paidAt
        })),
        message: `Successfully processed ${paidDistributions.length} distribution payments totaling ${totalPaid.toLocaleString('vi-VN')} VND`
      });
    } catch (error: any) {
      console.error("❌ Failed to process distribution payments:", error);
      res.status(400).json({ 
        message: error.message || "Failed to process distribution payments",
        error: error.message
      });
    }
  });

  // Investment package routes
  // Get all investment packages
  app.get("/api/investment-packages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const packages = await storage.getInvestmentPackages();
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch investment packages" });
    }
  });

  // Get active investment packages
  app.get("/api/investment-packages/active", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const packages = await storage.getActiveInvestmentPackages();
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active investment packages" });
    }
  });

  // Create investment package (admin only)
  app.post("/api/investment-packages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const packageData = req.body;
      const newPackage = await storage.createInvestmentPackage(packageData);
      res.json(newPackage);
    } catch (error) {
      res.status(500).json({ message: "Failed to create investment package" });
    }
  });

  // Cash flow transaction routes
  // Get cash flow transactions for current user
  app.get("/api/cash-flow/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const transactions = await storage.getCashFlowTransactions(user.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get all cash flow transactions (admin only)
  app.get("/api/cash-flow/transactions/all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || !["admin", "finance"].includes(user.role)) {
      return res.status(403).json({ message: "Admin or finance access required" });
    }
    
    try {
      const transactions = await storage.getCashFlowTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all transactions" });
    }
  });

  // Create deposit/investment request
  app.post("/api/cash-flow/deposit", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const { type, amount, description, packageId } = req.body;
      
      if (!type || !amount || !description || !packageId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const transaction = await storage.createCashFlowTransaction({
        type,
        amount: amount.toString(),
        description,
        userId: user.id,
        packageId,
        status: "pending"
      });
      
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to create deposit request" });
    }
  });

  // Create withdrawal request
  app.post("/api/cash-flow/withdraw", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const { amount, description } = req.body;
      
      if (!amount || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (amount < 5000000) {
        return res.status(400).json({ message: "Minimum withdrawal amount is 5,000,000 VND" });
      }
      
      // Calculate tax (10% if amount > 10M)
      const taxAmount = storage.calculateWithdrawalTax(amount);
      
      const transaction = await storage.createCashFlowTransaction({
        type: "withdraw",
        amount: amount.toString(),
        description,
        userId: user.id,
        status: "pending",
        taxAmount: taxAmount.toString()
      });
      
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to create withdrawal request" });
    }
  });

  // Approve transaction (admin only)
  app.post("/api/cash-flow/transactions/:transactionId/approve", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || !["admin", "finance"].includes(user.role)) {
      return res.status(403).json({ message: "Admin or finance access required" });
    }
    
    try {
      const { transactionId } = req.params;
      const transaction = await storage.approveCashFlowTransaction(transactionId, user.id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve transaction" });
    }
  });

  // Reject transaction (admin only)
  app.post("/api/cash-flow/transactions/:transactionId/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || !["admin", "finance"].includes(user.role)) {
      return res.status(403).json({ message: "Admin or finance access required" });
    }
    
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;
      const transaction = await storage.rejectCashFlowTransaction(transactionId, user.id, reason);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject transaction" });
    }
  });

  // Asset contribution routes
  app.post("/api/contributions/asset", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as any;
      
      // Validate input with Zod schema
      const validatedData = insertAssetContributionSchema.parse({
        ...req.body,
        userId: user.id,
        status: 'pending',
      });
      
      // Ensure valuationAmount is a valid number
      const valuationNum = parseFloat(validatedData.valuationAmount);
      if (isNaN(valuationNum) || valuationNum <= 0) {
        return res.status(400).json({ message: "Valuation amount must be a positive number" });
      }
      
      // Calculate PAD Token: 100 PAD = 1M VND
      const padTokenAmount = (valuationNum / 1000000) * 100;
      
      const contribution = await storage.createAssetContribution({
        ...validatedData,
        valuationAmount: valuationNum.toString(),
        padTokenAmount: padTokenAmount.toString(),
        status: 'pending',
      });
      
      res.status(201).json(contribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Asset contribution error:", error);
      res.status(500).json({ message: "Failed to create asset contribution" });
    }
  });

  app.get("/api/contributions/asset", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as any;
      const contributions = await storage.getAssetContributions(user.id);
      res.json(contributions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch asset contributions" });
    }
  });

  app.post("/api/contributions/asset/:id/approve", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const { id } = req.params;
      const contribution = await storage.approveAssetContribution(id, user.id);
      
      if (!contribution) {
        return res.status(404).json({ message: "Contribution not found" });
      }
      
      res.json(contribution);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve contribution" });
    }
  });

  app.post("/api/contributions/asset/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      const contribution = await storage.rejectAssetContribution(id, user.id, reason);
      
      if (!contribution) {
        return res.status(404).json({ message: "Contribution not found" });
      }
      
      res.json(contribution);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject contribution" });
    }
  });

  // PAD Token routes
  app.get("/api/pad-token/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as any;
      const history = await storage.getPadTokenHistory(user.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PAD Token history" });
    }
  });

  app.get("/api/pad-token/roi-projection", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as any;
      const periods = [6, 12, 36, 60]; // 6 months, 1 year, 3 years, 5 years
      const projection = await storage.calculateRoiProjection(user.id, periods);
      res.json(projection);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate ROI projection" });
    }
  });

  // Admin routes - only accessible to admin users
  
  // Get all users (admin only)
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (admin only)
  app.post("/api/admin/users/:userId/role", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!role || !["admin", "accountant", "branch", "customer", "staff", "shareholder"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.updateUserRole(userId, role, user.id);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Get pending transactions (admin only)
  app.get("/api/admin/transactions/pending", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || !["admin", "accountant"].includes(user.role)) {
      return res.status(403).json({ message: "Admin or accountant access required" });
    }
    
    try {
      const transactions = await storage.getPendingTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending transactions" });
    }
  });

  // Get system configurations (admin only)
  app.get("/api/admin/configs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const configs = await storage.getSystemConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system configs" });
    }
  });

  // Update system configuration (admin only)
  app.post("/api/admin/configs/:configKey", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const { configKey } = req.params;
      const { configValue, description } = req.body;
      
      if (!configValue) {
        return res.status(400).json({ message: "Config value is required" });
      }
      
      const config = await storage.updateSystemConfig(configKey, configValue, description, user.id);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to update system config" });
    }
  });

  // Get audit logs (admin only)
  app.get("/api/admin/audit-logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Export report data (admin only)
  app.post("/api/admin/reports/export", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || !["admin", "accountant"].includes(user.role)) {
      return res.status(403).json({ message: "Admin or accountant access required" });
    }
    
    try {
      const { reportType, dateFrom, dateTo } = req.body;
      
      if (!reportType || !["finance", "tax", "transactions", "users"].includes(reportType)) {
        return res.status(400).json({ message: "Invalid report type" });
      }
      
      const data = await storage.exportReportData(reportType, dateFrom, dateTo);
      
      // Log the export
      await storage.createAuditLog({
        userId: user.id,
        action: "report_export",
        entityType: "report",
        entityId: null,
        oldValue: null,
        newValue: JSON.stringify({ reportType, dateFrom, dateTo }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to export report data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
