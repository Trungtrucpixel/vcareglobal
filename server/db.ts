import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { mockDb } from "./mock-db";

neonConfig.webSocketConstructor = ws;

// Check if we have a real database URL
const hasRealDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL !== 'postgresql://mock:mock@localhost:5432/mock';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | any = null;

if (hasRealDatabase) {
  try {
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL!,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : { rejectUnauthorized: false }
    });
    db = drizzle({ client: pool, schema });
    console.log("✅ Connected to PostgreSQL database");
  } catch (error) {
    console.warn("⚠️  PostgreSQL connection failed, falling back to mock database");
    db = mockDb;
  }
} else {
  console.log("🔧 Using mock database for development (no PostgreSQL detected)");
  db = mockDb;
}

export { pool, db };
