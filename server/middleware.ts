import { Request, Response, NextFunction } from "express";
import { verifyJWT } from "./auth";
import { storage } from "./storage";

// Role-based access control middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check session-based auth first
  if (req.isAuthenticated()) {
    return next();
  }

  // Check JWT auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = verifyJWT(token);
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }
  }

  return res.status(401).json({ message: "Authentication required" });
}

// Check if user has specific role
export function requireRole(roles: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRoles = req.user.roles || [req.user.role];
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRole = userRoles.some(role => 
      allowedRoles.includes(role.name || role)
    );

    if (!hasRole) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        required: allowedRoles,
        current: userRoles.map(r => r.name || r)
      });
    }

    next();
  };
}

// Check if user has any of the specified roles
export function requireAnyRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRoles = req.user.roles || [req.user.role];
    const hasAnyRole = userRoles.some(role => 
      roles.includes(role.name || role)
    );

    if (!hasAnyRole) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        required: roles,
        current: userRoles.map(r => r.name || r)
      });
    }

    next();
  };
}

// Check if user has minimum PAD Token amount
export function requireMinPadToken(amount: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userPadToken = req.user.padToken || 0;
    if (userPadToken < amount) {
      return res.status(403).json({ 
        message: "Insufficient PAD Token",
        required: amount,
        current: userPadToken
      });
    }

    next();
  };
}

// Admin only access
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireRole(['admin'])(req, res, next);
}

// Staff or admin access
export function requireStaff(req: Request, res: Response, next: NextFunction) {
  return requireAnyRole(['admin', 'staff', 'accountant'])(req, res, next);
}

// Customer or higher access
export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  return requireAnyRole(['admin', 'staff', 'accountant', 'customer', 'shareholder'])(req, res, next);
}

// PAD Token calculation helpers
export function calculatePadTokenFromAmount(amount: number): number {
  // 100 PAD = 1 triệu VNĐ
  return (amount / 1000000) * 100;
}

export function calculateAmountFromPadToken(padToken: number): number {
  // 1 PAD = 10,000 VNĐ
  return padToken * 10000;
}

// Calculate PAD Token based on role and investment amount
export function calculatePadTokenFromRole(roleName: string, investmentAmount: number): number {
  const roleMultipliers = {
    "Cổ đông": 2.0,      // 200% multiplier
    "Angel": 1.5,         // 150% multiplier
    "Seed": 1.2,          // 120% multiplier
    "Retail": 1.0,        // 100% multiplier
    "Sáng lập": 3.0,      // 300% multiplier
    "Thiên thần": 2.5,    // 250% multiplier
    "Phát triển": 1.8,    // 180% multiplier
    "Đồng hành": 1.3      // 130% multiplier
  };

  const multiplier = roleMultipliers[roleName] || 1.0;
  const basePadToken = calculatePadTokenFromAmount(investmentAmount);
  return Math.round(basePadToken * multiplier);
}

// Calculate bonus PAD Token for referrals
export function calculateReferralPadToken(referralCount: number): number {
  // 10 PAD per referral, max 100 PAD
  return Math.min(referralCount * 10, 100);
}

// Calculate VIP bonus PAD Token
export function calculateVipPadToken(totalInvestment: number): number {
  if (totalInvestment >= 100000000) return 500; // 500 PAD for 100M+ investment
  if (totalInvestment >= 50000000) return 300;  // 300 PAD for 50M+ investment
  if (totalInvestment >= 20000000) return 200;  // 200 PAD for 20M+ investment
  if (totalInvestment >= 10000000) return 100;  // 100 PAD for 10M+ investment
  return 0;
}

// Middleware to add PAD Token calculations to request
export function addPadTokenCalculations(req: Request, res: Response, next: NextFunction) {
  if (req.user) {
    req.user.padTokenValue = calculateAmountFromPadToken(req.user.padToken || 0);
  }
  next();
}

// Middleware to log user actions
export function logUserAction(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      try {
        await storage.createAuditLog({
          userId: req.user.id,
          action: action,
          entityType: req.route?.path || 'unknown',
          entityId: req.params.id || null,
          oldValue: null,
          newValue: JSON.stringify(req.body),
          ipAddress: req.ip || null,
          userAgent: req.get('User-Agent') || null,
        });
      } catch (error) {
        console.error('Failed to log user action:', error);
      }
    }
    next();
  };
}

// Rate limiting middleware (simple implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    const current = rateLimitMap.get(key);
    if (current) {
      if (current.resetTime < now) {
        // Reset window
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      } else if (current.count >= maxRequests) {
        return res.status(429).json({ 
          message: "Too many requests",
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        });
      } else {
        current.count++;
      }
    } else {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    }

    next();
  };
}

// CORS middleware for development
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}
