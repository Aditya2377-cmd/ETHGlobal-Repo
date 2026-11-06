import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { config } from "../config";
import { CREATE_TABLES_SQL } from "./schema";

let dbInstance: Database.Database | null = null;

export function getDatabase(dbPath?: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const targetPath = dbPath || config.SQLITE_DB_PATH;

  if (targetPath !== ":memory:") {
    const dir = path.dirname(path.resolve(targetPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(targetPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(CREATE_TABLES_SQL);
  seedDemoInvoices(db);

  dbInstance = db;
  return db;
}

export function seedDemoInvoices(db: Database.Database): void {
  const existing = db
    .prepare("SELECT COUNT(*) as cnt FROM invoices_cache WHERE generation_id = 'test_gen_1'")
    .get() as { cnt: number };

  if (existing.cnt === 0) {
    const now = new Date().toISOString();
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const stmt = db.prepare(`
      INSERT INTO invoices_cache (
        invoice_id, generation_id, request_id, user_id, prompt_tokens,
        completion_tokens, total_tokens, charge_tinybars, charge_hbar,
        model, status, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      "inv_test_1",
      "test_gen_1",
      "req_test_1",
      "demo_user",
      85,
      150,
      235,
      15000,
      "0.00015",
      "llama-3.3-70b-versatile",
      "UNPAID",
      now,
      expiry
    );

    stmt.run(
      "inv_demo_1",
      "gen_demo_1",
      "req_demo_1",
      "demo_user",
      120,
      280,
      400,
      25000,
      "0.00025",
      "llama-3.3-70b-versatile",
      "UNPAID",
      now,
      expiry
    );
  }
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Creates an in-memory SQLite database instance (primarily for tests).
 */
export function createInMemoryDatabase(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(CREATE_TABLES_SQL);
  return db;
}
