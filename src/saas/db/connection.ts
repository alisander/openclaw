import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

export type DbPool = pg.Pool;

let pool: DbPool | null = null;

export function getPool(): DbPool {
  if (!pool) {
    throw new Error("Database pool not initialized. Call initDb() first.");
  }
  return pool;
}

export function initDb(connectionString?: string): DbPool {
  if (pool) {
    return pool;
  }
  const connStr =
    connectionString ??
    process.env.OPENCLAW_SAAS_DATABASE_URL ??
    "postgresql://openclaw:openclaw@localhost:5432/openclaw_saas";

  pool = new Pool({ connectionString: connStr, max: 20 });
  return pool;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, values);
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<T | null> {
  const result = await query<T>(text, values);
  return result.rows[0] ?? null;
}

export async function queryRows<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<T[]> {
  const result = await query<T>(text, values);
  return result.rows;
}

export async function runMigrations(): Promise<void> {
  const client = await getPool().connect();
  try {
    // Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{ version: number }>(
      "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1",
    );
    const currentVersion = rows[0]?.version ?? 0;

    const migrationsDir = path.join(import.meta.dirname, "migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      const match = file.match(/^(\d+)/);
      if (!match) continue;
      const version = Number.parseInt(match[1], 10);
      if (version <= currentVersion) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("COMMIT");
        console.log(`[saas-db] Applied migration ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${String(err)}`);
      }
    }
  } finally {
    client.release();
  }
}
