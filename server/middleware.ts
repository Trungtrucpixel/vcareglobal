import { Request, Response, NextFunction } from "express";
import { verifyJWT } from "./auth";
import { storage } from "./storage";

// Role-based access control middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check session-based auth first
  if (req.isAuthenticated()) {
    return next();
  }

  // Check custom session user (for admin login)
  if (req.session && req.session.user) {
    req.user = req.session.user as any;
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

// Check if user has minimum VCA Digital Share amount
export function requireMinPadToken(amount: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userVcaDigitalShare = req.user.vcaDigitalShare || 0;
    if (userVcaDigitalShare < amount) {
      return res.status(403).json({ 
        message: "Insufficient VCA Digital Share",
        required: amount,
        current: userVcaDigitalShare
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

// VCA Digital Share calculation helpers
export function calculateVcaDigitalShareFromAmount(amount: number): number {
  // 100 VCA = 1 triệu VNĐ
  return (amount / 1000000) * 100;
}

export function calculateAmountFromVcaDigitalShare(vcaDigitalShare: number): number {
  // 1 VCA = 10,000 VNĐ
  return vcaDigitalShare * 10000;
}

// Calculate VCA Digital Share based on role and investment amount
export function calculateVcaDigitalShareFromRole(roleName: string, investmentAmount: number): number {
  // Updated role multipliers for 8 user types
  const roleMultipliers = {
    "founder": 3.0,              // 300% multiplier - Cổ đông Sáng lập
    "angel": 2.5,                // 250% multiplier - Cổ đông Thiên thần
    "seed": 1.2,                 // 120% multiplier - Cổ đông Seed
    "vcare_home": 1.0,           // 100% multiplier - Cổ đông Vcare Home
    "asset_contributor": 2.0,    // 200% multiplier - Cổ đông góp tài sản
    "intellectual_contributor": 1.5, // 150% multiplier - Cổ đông góp trí tuệ
    "franchise_branch": 1.0,     // 100% multiplier - Chi nhánh nhượng quyền
    "card_customer": 1.0,        // 100% multiplier - Khách hàng mua thẻ
    // Legacy support for old role names
    "Cổ đông": 2.0,
    "Angel": 1.5,
    "Seed": 1.2,
    "Vcare Home": 1.0,
    "Sáng lập": 3.0,
    "Thiên thần": 2.5,
    "Phát triển": 1.8,
    "Đồng hành": 1.3
  };

  const multiplier = roleMultipliers[roleName] || 1.0;
  const baseVcaDigitalShare = calculateVcaDigitalShareFromAmount(investmentAmount);
  return Math.round(baseVcaDigitalShare * multiplier);
}

// Calculate bonus VCA Digital Share for referrals
export function calculateReferralVcaDigitalShare(referralCount: number): number {
  // 10 VCA per referral, max 100 VCA
  return Math.min(referralCount * 10, 100);
}

// Calculate VIP bonus VCA Digital Share
export function calculateVipVcaDigitalShare(totalInvestment: number): number {
  if (totalInvestment >= 100000000) return 500; // 500 VCA for 100M+ investment
  if (totalInvestment >= 50000000) return 300;  // 300 VCA for 50M+ investment
  if (totalInvestment >= 20000000) return 200;  // 200 VCA for 20M+ investment
  if (totalInvestment >= 10000000) return 100;  // 100 VCA for 10M+ investment
  return 0;
}

// Calculate maxout limit based on role
export function calculateMaxoutLimit(roleName: string): number | 'unlimited' {
  const maxoutLimits = {
    "founder": 'unlimited',           // No limit
    "angel": 5.0,                     // 5x (500%)
    "seed": 4.0,                      // 4x (400%)
    "vcare_home": 3.0,                // 3x (300%)
    "asset_contributor": 2.0,         // 2x (200%)
    "intellectual_contributor": 2.5,  // 2.5x (250%)
    "franchise_branch": 1.5,          // 1.5x (150%)
    "card_customer": 2.1,             // 2.1x (210%)
    // Legacy support
    "Cổ đông": 2.0,
    "Angel": 1.5,
    "Seed": 1.2,
    "Vcare Home": 1.0,
    "Sáng lập": 'unlimited',
    "Thiên thần": 2.5,
    "Phát triển": 1.8,
    "Đồng hành": 1.3
  };

  return maxoutLimits[roleName] || 1.0;
}

// Calculate maxout amount based on investment and role
export function calculateMaxoutAmount(investmentAmount: number, roleName: string): number | 'unlimited' {
  const maxoutLimit = calculateMaxoutLimit(roleName);
  
  if (maxoutLimit === 'unlimited') {
    return 'unlimited';
  }
  
  return investmentAmount * maxoutLimit;
}

// Middleware to add VCA Digital Share calculations to request
export function addVcaDigitalShareCalculations(req: Request, res: Response, next: NextFunction) {
  if (req.user) {
    req.user.vcaDigitalShareValue = calculateAmountFromVcaDigitalShare(req.user.vcaDigitalShare || 0);
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
