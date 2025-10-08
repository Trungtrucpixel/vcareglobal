import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Express } from "express";
import session from "express-session";
import jwt from "jsonwebtoken";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, Role } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {
      roles?: Role[];
      padToken?: number;
    }
  }
}

// JWT Secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// JWT Helper functions
export function generateJWT(user: any): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      roles: user.roles?.map((r: Role) => r.name) || [user.role],
      padToken: parseFloat(user.padToken || "0")
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyJWT(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}

// Load user with roles and PAD Token
async function loadUserWithRoles(userId: string): Promise<any> {
  const user = await storage.getUser(userId);
  if (!user) return null;

  const userRoles = await storage.getUserRoles(userId);
  const roles = userRoles.map(ur => ur.roles || ur.role);
  
  return {
    ...user,
    roles: roles,
    padToken: parseFloat(user.padToken || "0")
  };
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true if using HTTPS
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (username, password, done) => {
      const user = await storage.getUserByEmail(username); // Using email as username
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  // JWT Strategy
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET
  }, async (payload, done) => {
    try {
      const user = await loadUserWithRoles(payload.id);
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  }));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await loadUserWithRoles(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByEmail(req.body.email);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    // Load user with roles
    const userWithRoles = await loadUserWithRoles(user.id);
    
    req.login(userWithRoles, (err) => {
      if (err) return next(err);
      
      const token = generateJWT(userWithRoles);
      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roles: userWithRoles.roles,
        padToken: userWithRoles.padToken,
        status: user.status,
        token: token
      };
      res.status(201).json(userResponse);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Return user data without password hash
    const user = req.user as any;
    const token = generateJWT(user);
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roles: user.roles,
      padToken: user.padToken,
      status: user.status,
      token: token
    };
    res.status(200).json(userResponse);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Return user data without password hash
    const user = req.user as any;
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roles: user.roles,
      padToken: user.padToken,
      status: user.status
    };
    res.json(userResponse);
  });

  // JWT Login endpoint (alternative to session-based login)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const userWithRoles = await loadUserWithRoles(user.id);
      const token = generateJWT(userWithRoles);
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roles: userWithRoles.roles,
        padToken: userWithRoles.padToken,
        status: user.status,
        token: token
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // JWT Refresh endpoint
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { token } = req.body;
      const decoded = verifyJWT(token);
      const userWithRoles = await loadUserWithRoles(decoded.id);
      const newToken = generateJWT(userWithRoles);
      
      res.json({
        id: userWithRoles.id,
        email: userWithRoles.email,
        name: userWithRoles.name,
        role: userWithRoles.role,
        roles: userWithRoles.roles,
        padToken: userWithRoles.padToken,
        status: userWithRoles.status,
        token: newToken
      });
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  });
}
