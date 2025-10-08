import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  requireAuth, 
  requireRole, 
  requireAnyRole, 
  requireAdmin, 
  requireStaff, 
  requireCustomer,
  requireMinPadToken,
  addPadTokenCalculations,
  logUserAction,
  calculatePadTokenFromAmount,
  calculateAmountFromPadToken,
  calculatePadTokenFromRole,
  calculateReferralPadToken,
  calculateVipPadToken
} from "./middleware";
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

  // Home page endpoint - Dynamic data from database
  app.get("/", async (req, res) => {
    try {
      // Fetch all data from database
      const [cards, branches, transactions, users] = await Promise.all([
        storage.getCards(),
        storage.getBranches(),
        storage.getTransactions(),
        storage.getUsers()
      ]);

      // Calculate active cards (cards with status "active")
      const activeCards = cards.filter(c => c.status === "active").length;
      
      // Calculate total branches
      const totalBranches = branches.length;
      
      // Calculate total revenue from income transactions
      const totalRevenue = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      // Calculate total PAD Token distributed
      const totalPadTokenDistributed = users.reduce((sum, user) => {
        return sum + parseFloat(user.padToken || 0);
      }, 0);

      // Calculate profit sharing percentage (fixed at 49% as per requirements)
      const profitSharingPercentage = 49;

      // Calculate additional metrics
      const totalUsers = users.length;
      const totalTransactions = transactions.length;
      
      // Calculate monthly growth (mock data for now)
      const monthlyGrowth = Math.floor(Math.random() * 20) + 5; // 5-25% growth
      
      // Calculate average investment per user
      const averageInvestment = totalUsers > 0 ? totalRevenue / totalUsers : 0;

      const homeStats = {
        // Main statistics for display
        activeCards: activeCards,
        totalBranches: totalBranches,
        profitSharingPercentage: profitSharingPercentage,
        totalRevenue: totalRevenue,
        totalPadTokenDistributed: totalPadTokenDistributed,
        
        // Additional metrics
        totalUsers: totalUsers,
        totalTransactions: totalTransactions,
        monthlyGrowth: monthlyGrowth,
        averageInvestment: averageInvestment,
        
        // Card types with dynamic pricing
        cardTypes: [
          { 
            name: "Standard", 
            price: 12000000, 
            sessions: 12, 
            description: "Thẻ cơ bản với 12 lượt tư vấn",
            padToken: 1200,
            count: cards.filter(c => c.cardType === "Standard").length
          },
          { 
            name: "Silver", 
            price: 15000000, 
            sessions: 15, 
            description: "Thẻ bạc với 15 lượt tư vấn",
            padToken: 1500,
            count: cards.filter(c => c.cardType === "Silver").length
          },
          { 
            name: "Gold", 
            price: 18000000, 
            sessions: 18, 
            description: "Thẻ vàng với 18 lượt tư vấn",
            padToken: 1800,
            count: cards.filter(c => c.cardType === "Gold").length
          },
          { 
            name: "Platinum", 
            price: 21000000, 
            sessions: 21, 
            description: "Thẻ bạch kim với 21 lượt tư vấn",
            padToken: 2100,
            count: cards.filter(c => c.cardType === "Platinum").length
          },
          { 
            name: "Diamond", 
            price: 24000000, 
            sessions: 24, 
            description: "Thẻ kim cương với 24 lượt tư vấn",
            padToken: 2400,
            count: cards.filter(c => c.cardType === "Diamond").length
          }
        ],
        
        // Investment roles with dynamic data
        investmentRoles: [
          { 
            name: "Cổ đông", 
            minAmount: 100000000, 
            description: "Đầu tư từ 100 triệu VNĐ",
            count: users.filter(u => u.role === "shareholder").length,
            padTokenMultiplier: 2.0
          },
          { 
            name: "Angel", 
            minAmount: 50000000, 
            description: "Đầu tư từ 50 triệu VNĐ",
            count: users.filter(u => u.role === "angel").length,
            padTokenMultiplier: 1.5
          },
          { 
            name: "Seed", 
            minAmount: 20000000, 
            description: "Đầu tư từ 20 triệu VNĐ",
            count: users.filter(u => u.role === "seed").length,
            padTokenMultiplier: 1.2
          },
          { 
            name: "Retail", 
            minAmount: 1000000, 
            description: "Đầu tư từ 1 triệu VNĐ",
            count: users.filter(u => u.role === "retail").length,
            padTokenMultiplier: 1.0
          }
        ],
        
        // System benefits
        benefits: {
          profitSharing: "49% chia lãi cho nhà đầu tư",
          capitalPool: "30% Pool Vốn",
          workPool: "19% Pool Công ty",
          transparency: "Minh bạch 100% quyền lợi",
          referral: "8% Referral & 5% VIP",
          guarantee: "Không cam kết lợi nhuận, chỉ chia sẻ khi có hiệu quả"
        },
        
        // Recent activity (last 30 days)
        recentActivity: {
          newRegistrations: users.filter(u => {
            const createdAt = new Date(u.createdAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return createdAt >= thirtyDaysAgo;
          }).length,
          newCards: cards.filter(c => {
            const createdAt = new Date(c.createdAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return createdAt >= thirtyDaysAgo;
          }).length,
          totalInvestment: totalRevenue
        },
        
        // Timestamp for cache control
        lastUpdated: new Date().toISOString()
      };

      res.json(homeStats);
    } catch (error) {
      console.error("Error loading home stats:", error);
      res.status(500).json({ 
        message: "Failed to load home statistics",
        error: error.message 
      });
    }
  });

  // Card and Role Registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { 
        email, 
        phone, 
        name, 
        cardType, 
        roles = [], 
        investmentAmount = 0,
        referralCode = null,
        redirectToCardSelection = false // New parameter for redirect logic
      } = req.body;

      // Validate required fields
      if (!email || !phone || !name) {
        return res.status(400).json({ 
          message: "Email, phone, and name are required" 
        });
      }

      // Check if user already exists
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          email,
          name,
          phone,
          password: "temp_password_" + Math.random().toString(36).substring(7), // Temporary password
          role: "customer",
          status: "active"
        });
      }

      let padTokenEarned = 0;
      let cardCreated = null;
      let tempCardRecord = null;
      let rolesAssigned = [];

      // Handle role registration first
      if (roles && roles.length > 0) {
        const validRoles = ["Cổ đông", "Angel", "Seed", "Retail", "Sáng lập", "Thiên thần", "Phát triển", "Đồng hành"];
        
        for (const roleName of roles) {
          if (validRoles.includes(roleName)) {
            // Find or create role
            let role = await storage.getRoleByName(roleName);
            if (!role) {
              role = await storage.createRole({
                name: roleName,
                displayName: roleName,
                description: `Vai trò ${roleName}`,
                permissions: JSON.stringify([]),
                isActive: true
              });
            }

            // Assign role to user
            await storage.assignUserRole(user.id, role.id);
            rolesAssigned.push(roleName);

            // Calculate additional PAD Token based on role
            const rolePadToken = calculatePadTokenFromRole(roleName, investmentAmount);
            if (rolePadToken > 0) {
              padTokenEarned += rolePadToken;
              
              const currentPadToken = parseFloat(user.padToken || "0");
              const newPadToken = currentPadToken + rolePadToken;
              
              await storage.updateUserPadToken(
                user.id, 
                newPadToken, 
                `Đăng ký vai trò ${roleName} - ${investmentAmount.toLocaleString('vi-VN')} VNĐ`,
                user.id
              );
            }
          }
        }
      }

      // Handle investment amount
      if (investmentAmount > 0) {
        const investmentPadToken = calculatePadTokenFromAmount(investmentAmount);
        padTokenEarned += investmentPadToken;
        
        const currentPadToken = parseFloat(user.padToken || "0");
        const newPadToken = currentPadToken + investmentPadToken;
        
        await storage.updateUserPadToken(
          user.id, 
          newPadToken, 
          `Đầu tư ${investmentAmount.toLocaleString('vi-VN')} VNĐ`,
          user.id
        );
      }

      // Handle card registration - create temp record if redirecting to card selection
      if (cardType) {
        const cardPrices = {
          "Standard": 2000000,    // Updated prices as per requirements
          "Silver": 8000000,
          "Gold": 18000000,
          "Platinum": 38000000,
          "Diamond": 100000000
        };

        const cardSessions = {
          "Standard": 12,
          "Silver": 15,
          "Gold": 18,
          "Platinum": 20,
          "Diamond": 24
        };

        const price = cardPrices[cardType];
        const sessions = cardSessions[cardType];

        if (!price) {
          return res.status(400).json({ 
            message: "Invalid card type" 
          });
        }

        // Calculate PAD Token (100 PAD = 1 million VNĐ)
        const padToken = calculatePadTokenFromAmount(price);

        if (redirectToCardSelection) {
          // Create temporary card record (not paid yet)
          tempCardRecord = await storage.createCard({
            cardType,
            price: price.toString(),
            padToken: padToken.toString(),
            consultationSessions: sessions,
            ownerId: user.id,
            status: "pending", // Pending payment
            description: `Thẻ ${cardType} với ${sessions} lượt tư vấn (Chưa thanh toán)`,
            paymentStatus: "pending",
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          // Create active card (immediate payment)
          cardCreated = await storage.createCard({
            cardType,
            price: price.toString(),
            padToken: padToken.toString(),
            consultationSessions: sessions,
            ownerId: user.id,
            status: "active",
            description: `Thẻ ${cardType} với ${sessions} lượt tư vấn`,
            paymentStatus: "completed"
          });

          padTokenEarned += padToken;

          // Update user PAD Token
          const currentPadToken = parseFloat(user.padToken || "0");
          const newPadToken = currentPadToken + padToken;
          
          await storage.updateUserPadToken(
            user.id, 
            newPadToken, 
            `Đăng ký thẻ ${cardType} - ${price.toLocaleString('vi-VN')} VNĐ`,
            user.id
          );
        }
      }

      // Create transaction record only if card is paid
      if (cardCreated || investmentAmount > 0) {
        await storage.createTransaction({
          type: "income",
          amount: ((cardCreated ? parseFloat(cardCreated.price) : 0) + investmentAmount).toString(),
          description: `Đăng ký ${cardType ? `thẻ ${cardType}` : ''} ${roles.length > 0 ? `vai trò ${roles.join(', ')}` : ''}`,
          userId: user.id,
          status: cardCreated ? "completed" : "pending"
        });
      }

      // Log the registration
      await storage.createAuditLog({
        userId: user.id,
        action: "registration",
        entityType: "user",
        entityId: user.id,
        oldValue: null,
        newValue: JSON.stringify({
          cardType,
          roles,
          investmentAmount,
          padTokenEarned,
          redirectToCardSelection,
          tempCardId: tempCardRecord?.id
        }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      // Prepare response data
      const responseData = {
        success: true,
        message: redirectToCardSelection ? "Đăng ký thành công! Chuyển đến chọn gói thẻ..." : "Đăng ký thành công!",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone
          },
          card: cardCreated ? {
            id: cardCreated.id,
            type: cardCreated.cardType,
            price: cardCreated.price,
            sessions: cardCreated.consultationSessions,
            padToken: cardCreated.padToken,
            status: cardCreated.status
          } : tempCardRecord ? {
            id: tempCardRecord.id,
            type: tempCardRecord.cardType,
            price: tempCardRecord.price,
            sessions: tempCardRecord.consultationSessions,
            padToken: tempCardRecord.padToken,
            status: tempCardRecord.status
          } : null,
          roles: rolesAssigned,
          padTokenEarned: padTokenEarned,
          totalPadToken: parseFloat(user.padToken || "0") + padTokenEarned,
          redirectToCardSelection: redirectToCardSelection
        }
      };

           // Handle redirect logic
           if (redirectToCardSelection) {
             // Return JSON with redirect information
             responseData.redirect = {
               url: "/card-selection",
               message: "Chuyển đến giao diện chọn gói thẻ",
               showCardSelection: true
             };
           }

      res.status(201).json(responseData);

    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ 
        message: "Registration failed", 
        error: error.message 
      });
    }
  });

  // Buy card package endpoint (from card selection interface)
  app.post("/api/buy-card", async (req, res) => {
    try {
      const { 
        userId,
        cardType, 
        price,
        sessions,
        paymentMethod = "bank_transfer",
        paymentStatus = "pending", // Default to pending for offline payment
        notes = ""
      } = req.body;

      // Validate required fields
      if (!userId || !cardType || !price || !sessions) {
        return res.status(400).json({ 
          message: "User ID, card type, price, and sessions are required" 
        });
      }

      // Validate card type and price
      const validCardTypes = {
        "Standard": { price: 2000000, sessions: 12 },
        "Silver": { price: 8000000, sessions: 15 },
        "Gold": { price: 18000000, sessions: 18 },
        "Platinum": { price: 38000000, sessions: 20 },
        "Diamond": { price: 100000000, sessions: 24 }
      };

      if (!validCardTypes[cardType]) {
        return res.status(400).json({ 
          message: "Invalid card type" 
        });
      }

      const expectedPrice = validCardTypes[cardType].price;
      const expectedSessions = validCardTypes[cardType].sessions;

      if (price !== expectedPrice || sessions !== expectedSessions) {
        return res.status(400).json({ 
          message: "Invalid price or sessions for selected card type" 
        });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ 
          message: "User not found" 
        });
      }

      // Calculate PAD Token (100 PAD = 1 million VNĐ)
      const padToken = calculatePadTokenFromAmount(price);
      const padTokenValue = padToken * 10000; // 1 PAD = 10,000 VNĐ

      // Check if user already has this card type
      const existingCards = await storage.getCards();
      const userCards = existingCards.filter(card => 
        card.ownerId === user.id && 
        card.cardType === cardType && 
        card.status === "active"
      );

      if (userCards.length > 0) {
        return res.status(400).json({ 
          message: `Bạn đã sở hữu thẻ ${cardType}. Không thể mua thêm.` 
        });
      }

      // Create card with appropriate status
      const cardCreated = await storage.createCard({
        cardType,
        price: price.toString(),
        padToken: padToken.toString(),
        consultationSessions: sessions,
        ownerId: user.id,
        status: paymentStatus === "completed" ? "active" : "pending",
        description: `Thẻ ${cardType} với ${sessions} lượt tư vấn`,
        paymentStatus: paymentStatus,
        notes: notes || `Mua thẻ ${cardType} - ${price.toLocaleString('vi-VN')} VNĐ`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update user PAD Token only if payment is completed
      let newPadToken = parseFloat(user.padToken || "0");
      if (paymentStatus === "completed") {
        newPadToken = newPadToken + padToken;
        
        await storage.updateUserPadToken(
          user.id, 
          newPadToken, 
          `Mua thẻ ${cardType} - ${price.toLocaleString('vi-VN')} VNĐ`,
          user.id
        );
      }

      // Create transaction record
      const transaction = await storage.createTransaction({
        type: "income",
        amount: price.toString(),
        description: `Mua thẻ ${cardType} - ${paymentStatus === "completed" ? "Đã thanh toán" : "Chờ thanh toán"}`,
        userId: user.id,
        status: paymentStatus === "completed" ? "completed" : "pending",
        notes: notes || `Giao dịch mua thẻ ${cardType}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create payment record if needed
      if (paymentStatus === "pending") {
        // You can add payment tracking logic here
        // For example, create a payment request record
        console.log(`Payment pending for card ${cardType} - User: ${user.email}`);
      }

      // Log the purchase
      await storage.createAuditLog({
        userId: user.id,
        action: "card_purchase",
        entityType: "card",
        entityId: cardCreated.id,
        oldValue: null,
        newValue: JSON.stringify({
          cardType,
          price,
          sessions,
          padToken,
          paymentMethod,
          paymentStatus,
          transactionId: transaction.id
        }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      // Prepare response data
      const responseData = {
        success: true,
        message: paymentStatus === "completed" 
          ? `Mua gói ${cardType} thành công!` 
          : `Đơn hàng ${cardType} đã được tạo. Vui lòng thanh toán để kích hoạt thẻ.`,
        data: {
          card: {
            id: cardCreated.id,
            type: cardCreated.cardType,
            price: cardCreated.price,
            sessions: cardCreated.consultationSessions,
            padToken: cardCreated.padToken,
            status: cardCreated.status,
            paymentStatus: cardCreated.paymentStatus
          },
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            totalPadToken: newPadToken
          },
          transaction: {
            id: transaction.id,
            amount: transaction.amount,
            status: transaction.status,
            description: transaction.description
          },
          padTokenEarned: paymentStatus === "completed" ? padToken : 0,
          paymentInfo: {
            method: paymentMethod,
            status: paymentStatus,
            amount: price,
            currency: "VNĐ"
          }
        }
      };

      // Add payment instructions if pending
      if (paymentStatus === "pending") {
        responseData.paymentInstructions = {
          message: "Vui lòng thanh toán để kích hoạt thẻ",
          bankInfo: {
            bankName: "Vietcombank",
            accountNumber: "1234567890",
            accountName: "Phúc An Dương",
            amount: price,
            content: `MUA THE ${cardType.toUpperCase()} - ${user.phone}`
          },
          qrCode: `https://api.vietqr.io/v2/generate?accountNo=1234567890&accountName=Phuc%20An%20Duong&amount=${price}&description=MUA%20THE%20${cardType.toUpperCase()}`
        };
      }

      res.status(201).json(responseData);

    } catch (error) {
      console.error("Card purchase error:", error);
      res.status(500).json({ 
        message: "Card purchase failed", 
        error: error.message 
      });
    }
  });

  // Payment confirmation endpoint
  app.post("/api/confirm-payment", async (req, res) => {
    try {
      const { 
        cardId,
        paymentMethod = "bank_transfer",
        paymentReference = "",
        notes = ""
      } = req.body;

      // Validate required fields
      if (!cardId) {
        return res.status(400).json({ 
          message: "Card ID is required" 
        });
      }

      // Get card
      const card = await storage.getCard(cardId);
      if (!card) {
        return res.status(404).json({ 
          message: "Card not found" 
        });
      }

      // Check if card is already active
      if (card.status === "active") {
        return res.status(400).json({ 
          message: "Card is already active" 
        });
      }

      // Get user
      const user = await storage.getUser(card.ownerId);
      if (!user) {
        return res.status(404).json({ 
          message: "User not found" 
        });
      }

      // Update card status to active
      const updatedCard = await storage.updateCard(cardId, {
        status: "active",
        paymentStatus: "completed",
        notes: notes || `Thanh toán xác nhận - ${paymentMethod}`,
        updatedAt: new Date()
      });

      // Calculate and update PAD Token
      const padToken = parseFloat(card.padToken || "0");
      const currentPadToken = parseFloat(user.padToken || "0");
      const newPadToken = currentPadToken + padToken;
      
      await storage.updateUserPadToken(
        user.id, 
        newPadToken, 
        `Kích hoạt thẻ ${card.cardType} - ${card.price} VNĐ`,
        user.id
      );

      // Update transaction status
      const transactions = await storage.getTransactions();
      const cardTransaction = transactions.find(t => 
        t.userId === user.id && 
        t.description.includes(`Mua thẻ ${card.cardType}`) &&
        t.status === "pending"
      );

      if (cardTransaction) {
        await storage.updateTransaction(cardTransaction.id, {
          status: "completed",
          notes: `Thanh toán xác nhận - ${paymentMethod}`,
          updatedAt: new Date()
        });
      }

      // Log the payment confirmation
      await storage.createAuditLog({
        userId: user.id,
        action: "payment_confirmed",
        entityType: "card",
        entityId: cardId,
        oldValue: JSON.stringify({
          status: card.status,
          paymentStatus: card.paymentStatus
        }),
        newValue: JSON.stringify({
          status: "active",
          paymentStatus: "completed",
          paymentMethod,
          paymentReference
        }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.status(200).json({
        success: true,
        message: `Thẻ ${card.cardType} đã được kích hoạt thành công!`,
        data: {
          card: {
            id: updatedCard.id,
            type: updatedCard.cardType,
            price: updatedCard.price,
            sessions: updatedCard.consultationSessions,
            padToken: updatedCard.padToken,
            status: updatedCard.status,
            paymentStatus: updatedCard.paymentStatus
          },
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            totalPadToken: newPadToken
          },
          padTokenEarned: padToken,
          paymentInfo: {
            method: paymentMethod,
            reference: paymentReference,
            confirmedAt: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      console.error("Payment confirmation error:", error);
      res.status(500).json({ 
        message: "Payment confirmation failed", 
        error: error.message 
      });
    }
  });

  // Get user cards endpoint
  app.get("/api/user-cards/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ 
          message: "User ID is required" 
        });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ 
          message: "User not found" 
        });
      }

      // Get user's cards
      const allCards = await storage.getCards();
      const userCards = allCards.filter(card => card.ownerId === userId);

      // Get user's transactions
      const allTransactions = await storage.getTransactions();
      const userTransactions = allTransactions.filter(t => t.userId === userId);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            totalPadToken: parseFloat(user.padToken || "0")
          },
          cards: userCards.map(card => ({
            id: card.id,
            type: card.cardType,
            price: card.price,
            sessions: card.consultationSessions,
            padToken: card.padToken,
            status: card.status,
            paymentStatus: card.paymentStatus,
            description: card.description,
            createdAt: card.createdAt,
            updatedAt: card.updatedAt
          })),
          transactions: userTransactions.map(t => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            description: t.description,
            status: t.status,
            createdAt: t.createdAt
          }))
        }
      });

    } catch (error) {
      console.error("Get user cards error:", error);
      res.status(500).json({ 
        message: "Failed to get user cards", 
        error: error.message 
      });
    }
  });

  // Get registration info endpoint
  app.get("/api/register/info", async (req, res) => {
    try {
      const cardTypes = [
        { name: "Standard", price: 2000000, sessions: 12, description: "Thẻ cơ bản với 12 lượt tư vấn", padToken: 200 },
        { name: "Silver", price: 8000000, sessions: 15, description: "Thẻ bạc với 15 lượt tư vấn", padToken: 800 },
        { name: "Gold", price: 18000000, sessions: 18, description: "Thẻ vàng với 18 lượt tư vấn", padToken: 1800 },
        { name: "Platinum", price: 38000000, sessions: 20, description: "Thẻ bạch kim với 20 lượt tư vấn", padToken: 3800 },
        { name: "Diamond", price: 100000000, sessions: 24, description: "Thẻ kim cương với 24 lượt tư vấn", padToken: 10000 }
      ];

      const investmentRoles = [
        { 
          name: "Cổ đông", 
          minAmount: 100000000, 
          description: "Đầu tư từ 100 triệu VNĐ",
          padTokenMultiplier: 2.0,
          benefits: ["Quyền biểu quyết", "Chia lãi cao nhất", "Ưu tiên thông tin"]
        },
        { 
          name: "Angel", 
          minAmount: 50000000, 
          description: "Đầu tư từ 50 triệu VNĐ",
          padTokenMultiplier: 1.5,
          benefits: ["Chia lãi ưu đãi", "Tham gia quản lý", "Báo cáo định kỳ"]
        },
        { 
          name: "Seed", 
          minAmount: 20000000, 
          description: "Đầu tư từ 20 triệu VNĐ",
          padTokenMultiplier: 1.2,
          benefits: ["Chia lãi cơ bản", "Cập nhật tiến độ", "Hỗ trợ tư vấn"]
        },
        { 
          name: "Retail", 
          minAmount: 1000000, 
          description: "Đầu tư từ 1 triệu VNĐ",
          padTokenMultiplier: 1.0,
          benefits: ["Chia lãi cơ bản", "Theo dõi đầu tư", "Hỗ trợ cơ bản"]
        },
        { 
          name: "Sáng lập", 
          minAmount: 500000000, 
          description: "Đầu tư từ 500 triệu VNĐ",
          padTokenMultiplier: 3.0,
          benefits: ["Quyền cao nhất", "Chia lãi tối đa", "Tham gia điều hành"]
        },
        { 
          name: "Thiên thần", 
          minAmount: 200000000, 
          description: "Đầu tư từ 200 triệu VNĐ",
          padTokenMultiplier: 2.5,
          benefits: ["Quyền đặc biệt", "Chia lãi cao", "Ưu tiên cao"]
        },
        { 
          name: "Phát triển", 
          minAmount: 100000000, 
          description: "Đầu tư từ 100 triệu VNĐ",
          padTokenMultiplier: 1.8,
          benefits: ["Tham gia phát triển", "Chia lãi ưu đãi", "Cập nhật chi tiết"]
        },
        { 
          name: "Đồng hành", 
          minAmount: 50000000, 
          description: "Đầu tư từ 50 triệu VNĐ",
          padTokenMultiplier: 1.3,
          benefits: ["Hỗ trợ đặc biệt", "Chia lãi tốt", "Thông tin ưu tiên"]
        }
      ];

      res.json({
        success: true,
        data: {
          cardTypes,
          investmentRoles,
          padTokenRate: {
            description: "100 PAD = 1 triệu VNĐ (1 PAD = 10,000 VNĐ)",
            rate: 100,
            valuePerPad: 10000
          },
          benefits: {
            profitSharing: "49% chia lãi cho nhà đầu tư",
            capitalPool: "30% Pool Vốn",
            workPool: "19% Pool Công",
            transparency: "Minh bạch 100% quyền lợi"
          }
        }
      });
    } catch (error) {
      console.error("Error loading registration info:", error);
      res.status(500).json({ message: "Failed to load registration info" });
    }
  });

  // Card routes
  app.get("/api/cards", requireAuth, addPadTokenCalculations, async (req, res) => {
    try {
      const cards = await storage.getCards();
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  app.post("/api/cards", requireAuth, requireCustomer, logUserAction("card_purchase"), async (req, res) => {
    try {
      const cardData = insertCardSchema.parse(req.body);
      
      // Tính PAD Token (100 PAD = 1 triệu VNĐ)
      const price = parseFloat(cardData.price);
      const padToken = calculatePadTokenFromAmount(price);
      
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
        consultationSessions,
        ownerId: req.user?.id // Set owner to current user
      };
      
      const card = await storage.createCard(enrichedCardData);
      
      // Update user PAD Token
      if (req.user) {
        const currentPadToken = req.user.padToken || 0;
        const newPadToken = currentPadToken + padToken;
        
        await storage.updateUserPadToken(
          req.user.id, 
          newPadToken, 
          `Mua thẻ ${cardData.cardType} - ${price.toLocaleString('vi-VN')} VNĐ`,
          req.user.id
        );
        
        // Auto-upgrade role based on total investment
        const userCards = await storage.getCards();
        const totalCardValue = userCards
          .filter(c => c.ownerId === req.user?.id)
          .reduce((sum, c) => sum + parseFloat(c.price), 0);
        
        // Auto-upgrade logic
        if (totalCardValue > 245000000 && req.user.role === "customer") {
          await storage.updateUser(req.user.id, { role: "shareholder" });
          console.log(`✅ Auto-upgraded user ${req.user.email} to shareholder (total cards: ${(totalCardValue/1000000).toFixed(1)}M VNĐ)`);
        } else if (totalCardValue > 101000000 && req.user.role === "customer") {
          await storage.updateUser(req.user.id, { role: "shareholder" });
          console.log(`✅ Auto-upgraded user ${req.user.email} to shareholder (total cards: ${(totalCardValue/1000000).toFixed(1)}M VNĐ)`);
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
  app.get("/api/dashboard/metrics", requireAuth, addPadTokenCalculations, async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      const cards = await storage.getCards();
      const branches = await storage.getBranches();
      const staff = await storage.getStaff();

      // Calculate total revenue from income transactions
      const totalRevenue = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      // Get current user's PAD Token and roles
      let userPadToken = 0;
      let userRoles = [];
      let userPadTokenValue = 0;
      
      if (req.user) {
        userPadToken = req.user.padToken || 0;
        userRoles = req.user.roles || [req.user.role];
        userPadTokenValue = calculateAmountFromPadToken(userPadToken);
      }

      const metrics = {
        totalRevenue: totalRevenue.toLocaleString('vi-VN'),
        activeCards: cards.filter(c => c.status === "active").length,
        branches: branches.length,
        staff: staff.length,
        padToken: userPadToken,
        padTokenValue: userPadTokenValue,
        roles: userRoles,
        userInfo: req.user ? {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        } : null
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

  // Get all roles (admin only)
  app.get("/api/admin/roles", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Get user roles (admin only)
  app.get("/api/admin/users/:userId/roles", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const { userId } = req.params;
      const userRoles = await storage.getUserRoles(userId);
      res.json(userRoles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });

  // Assign multiple roles to user (admin only)
  app.post("/api/admin/users/:userId/roles", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const { userId } = req.params;
      const { roleIds } = req.body;
      
      if (!Array.isArray(roleIds)) {
        return res.status(400).json({ message: "roleIds must be an array" });
      }
      
      const updatedUser = await storage.assignUserRoles(userId, roleIds, user.id);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign user roles" });
    }
  });

  // Update user PAD Token (admin only)
  app.post("/api/admin/users/:userId/pad-token", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const { userId } = req.params;
      const { padToken, reason } = req.body;
      
      if (typeof padToken !== "number" || padToken < 0) {
        return res.status(400).json({ message: "PAD Token must be a positive number" });
      }
      
      const updatedUser = await storage.updateUserPadToken(userId, padToken, reason, user.id);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update PAD Token" });
    }
  });

  // Get user PAD Token history (admin only)
  app.get("/api/admin/users/:userId/pad-token-history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const { userId } = req.params;
      const history = await storage.getUserPadTokenHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PAD Token history" });
    }
  });

  // Update user role (admin only) - Legacy endpoint for backward compatibility
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

  // Export PAD Token and benefits report (admin only)
  app.post("/api/admin/reports/pad-token-benefits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || !["admin", "accountant"].includes(user.role)) {
      return res.status(403).json({ message: "Admin or accountant access required" });
    }
    
    try {
      const { format = "pdf", dateFrom, dateTo } = req.body;
      
      const data = await storage.exportPadTokenBenefitsReport(dateFrom, dateTo);
      
      // Log the export
      await storage.createAuditLog({
        userId: user.id,
        action: "report_export",
        entityType: "report",
        entityId: null,
        oldValue: null,
        newValue: JSON.stringify({ reportType: "pad_token_benefits", format, dateFrom, dateTo }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to export PAD Token benefits report" });
    }
  });

  // Export roles and permissions report (admin only)
  app.post("/api/admin/reports/roles-permissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    if (!user || !["admin", "accountant"].includes(user.role)) {
      return res.status(403).json({ message: "Admin or accountant access required" });
    }
    
    try {
      const { format = "pdf" } = req.body;
      
      const data = await storage.exportRolesPermissionsReport();
      
      // Log the export
      await storage.createAuditLog({
        userId: user.id,
        action: "report_export",
        entityType: "report",
        entityId: null,
        oldValue: null,
        newValue: JSON.stringify({ reportType: "roles_permissions", format }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to export roles and permissions report" });
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
      
      if (!reportType || !["finance", "tax", "transactions", "users", "pad_token_benefits", "roles_permissions"].includes(reportType)) {
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
