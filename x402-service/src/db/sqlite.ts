import { DatabaseSync } from "node:sqlite";

export class Database {
  private db: DatabaseSync;

  constructor(filename: string) {
    this.db = new DatabaseSync(filename);
  }

  pragma(pragmaStr: string): void {
    try {
      this.db.exec(`PRAGMA ${pragmaStr};`);
    } catch {
      // Pragmas are advisory in development
    }
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    return {
      run: (...args: any[]) => {
        if (args.length === 1 && args[0] !== null && typeof args[0] === "object" && !Array.isArray(args[0])) {
          return stmt.run(args[0]);
        }
        return stmt.run(...args);
      },
      get: (...args: any[]) => {
        return stmt.get(...args);
      },
      all: (...args: any[]) => {
        return stmt.all(...args);
      }
    };
  }

  transaction<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => {
      this.db.exec("BEGIN");
      try {
        const result = fn(...args);
        this.db.exec("COMMIT");
        return result;
      } catch (err) {
        this.db.exec("ROLLBACK");
        throw err;
      }
    }) as T;
  }

  close(): void {
    this.db.close();
  }
}

export type DatabaseInstance = Database;
export default Database;

