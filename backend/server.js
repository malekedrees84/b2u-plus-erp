import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

dotenv.config();
const { Pool } = pkg;

const app = express();

// --- CORS ---
const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Client-Id", "X-User-Id"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ⚠️ مهم جداً: لا تستخدم app.options("*") على بعض البيئات (بتعمل PathError)
// Express 4 يكفيه app.use(cors(...)) بدون هذا السطر.
// إذا بدك OPTIONS يدوي، استخدم مسار regex:
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "10mb" }));

// --- Server + Socket ---
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: corsOptions });

// --- Simple logger for /api ---
app.use((req, res, next) => {
  if (req.url.startsWith("/api")) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// --- Health endpoints ---
let dbStatus = { ok: false, error: "not tested yet", time: null };

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "b2u-plus-erp-backend",
    env: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
});

app.get("/health/db", (req, res) => {
  res.status(200).json({
    ok: dbStatus.ok,
    error: dbStatus.error,
    time: dbStatus.time,
  });
});

// --- Version endpoint ---
app.get("/api/version", (req, res) => {
  res.json({
    ok: true,
    commit:
      process.env.RENDER_GIT_COMMIT ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.COMMIT_SHA ||
      "dev",
    ts: new Date().toISOString(),
  });
});

// ---------- DB (Render Postgres needs SSL) ----------
function buildPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing in .env");

  return new Pool({
    connectionString,
    // Render عادة يحتاج SSL — خليها شغالة دايمًا
    ssl: { rejectUnauthorized: false },
    // تحسين الاستقرار
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
  });
}

let pool;
try {
  pool = buildPool();
} catch (e) {
  console.error("❌ Pool init error:", e.message);
}

// تهيئة الجداول
async function initDb() {
  const tables = ["users", "clients", "tasks", "announcements", "transactions"];
  for (const table of tables) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        data JSONB DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }
}

async function testDb() {
  try {
    const r = await pool.query("SELECT NOW() as now");
    dbStatus = { ok: true, error: null, time: r.rows?.[0]?.now || new Date().toISOString() };
    console.log("✅ DB connected:", dbStatus.time);
  } catch (e) {
    dbStatus = { ok: false, error: e.message || String(e), time: new Date().toISOString() };
    console.error("❌ DB connection failed:", dbStatus.error);
  }
}

// ---- Helpers ----
async function list(table) {
  const r = await pool.query(`SELECT id, data FROM ${table} ORDER BY updated_at DESC`);
  return r.rows.map((x) => ({ ...x.data, id: x.id }));
}

async function upsert(table, obj) {
  const id = obj?.id;
  if (!id) throw new Error(`Missing id for table ${table}`);

  await pool.query(
    `INSERT INTO ${table} (id, data, updated_at) VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [id, JSON.stringify(obj)]
  );
  return obj;
}

async function remove(table, id) {
  await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  return true;
}

// ---- API routes ----
app.get("/api/users", async (req, res) => res.json({ ok: true, users: await list("users") }));
app.post("/api/users", async (req, res) => res.json({ ok: true, user: await upsert("users", req.body) }));
app.delete("/api/users/:id", async (req, res) => res.json({ ok: true, deleted: await remove("users", req.params.id) }));

app.get("/api/clients", async (req, res) => res.json({ ok: true, clients: await list("clients") }));
app.post("/api/clients", async (req, res) => res.json({ ok: true, client: await upsert("clients", req.body) }));
app.delete("/api/clients/:id", async (req, res) => res.json({ ok: true, deleted: await remove("clients", req.params.id) }));

app.get("/api/tasks", async (req, res) => res.json({ ok: true, tasks: await list("tasks") }));
app.post("/api/tasks", async (req, res) => res.json({ ok: true, task: await upsert("tasks", req.body) }));
app.delete("/api/tasks/:id", async (req, res) => res.json({ ok: true, deleted: await remove("tasks", req.params.id) }));

app.get("/api/announcements", async (req, res) => res.json({ ok: true, announcements: await list("announcements") }));
app.post("/api/announcements", async (req, res) => res.json({ ok: true, announcement: await upsert("announcements", req.body) }));
app.delete("/api/announcements/:id", async (req, res) => res.json({ ok: true, deleted: await remove("announcements", req.params.id) }));

app.get("/api/transactions", async (req, res) => res.json({ ok: true, transactions: await list("transactions") }));
app.post("/api/transactions", async (req, res) => res.json({ ok: true, transaction: await upsert("transactions", req.body) }));
app.delete("/api/transactions/:id", async (req, res) => res.json({ ok: true, deleted: await remove("transactions", req.params.id) }));

// ---- Sockets (optional) ----
io.on("connection", (socket) => {
  console.log("🟢 socket connected:", socket.id);
  socket.on("disconnect", () => console.log("🔴 socket disconnected:", socket.id));
});

// ---- Start server حتى لو DB فشل (عشان health يساعدنا) ----
const port = Number(process.env.PORT || 5050);

server.listen(port, async () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  if (!pool) return;

  await testDb();
  if (dbStatus.ok) {
    try {
      await initDb();
      console.log("✅ DB tables ready");
    } catch (e) {
      console.error("❌ DB init error:", e.message || e);
    }
  }
});
