import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2";

let _db: MySql2Database<Record<string, unknown>> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(
        mysql.createPool({
          uri: process.env.DATABASE_URL,
          charset: "utf8mb4",
        }).promise(),
      );
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
