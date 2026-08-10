import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

// Single-user app: the whole tracker state lives in one jsonb row.
const globalForDb = globalThis as unknown as {
  pool?: Pool;
  tableReady?: boolean;
};

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!globalForDb.pool) {
    // Railway's internal host doesn't use TLS; the public proxy does.
    const internal = /railway\.internal|localhost|127\.0\.0\.1/.test(url);
    globalForDb.pool = new Pool({
      connectionString: url,
      ssl: internal ? undefined : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return globalForDb.pool;
}

async function ensureTable(pool: Pool) {
  if (globalForDb.tableReady) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS tracker_state (
       id integer PRIMARY KEY,
       data jsonb NOT NULL,
       updated_at timestamptz NOT NULL DEFAULT now()
     )`
  );
  globalForDb.tableReady = true;
}

export async function GET() {
  const pool = getPool();
  if (!pool) return NextResponse.json({ state: null, persisted: false });
  try {
    await ensureTable(pool);
    const res = await pool.query(
      "SELECT data FROM tracker_state WHERE id = 1"
    );
    return NextResponse.json({
      state: res.rows[0]?.data ?? null,
      persisted: true,
    });
  } catch {
    return NextResponse.json({ state: null, persisted: false });
  }
}

export async function PUT(req: Request) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ ok: false, persisted: false });
  try {
    const body = (await req.json()) as { state?: unknown };
    if (!body.state || typeof body.state !== "object") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await ensureTable(pool);
    await pool.query(
      `INSERT INTO tracker_state (id, data, updated_at)
       VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = now()`,
      [JSON.stringify(body.state)]
    );
    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
