import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";

dotenv.config();
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

const app = express();

// 1. الوسطاء الأساسيين
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// 2. مراقب الطلبات للتشخيص
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API LOG] ${new Date().toISOString()} | ${req.method} ${req.url}`);
  }
  next();
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// تهيئة قاعدة البيانات
const initDB = async () => {
  const tables = ['tasks', 'users', 'clients', 'transactions', 'announcements', 'settings'];
  for (const table of tables) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data JSONB DEFAULT '{}', updated_at TIMESTAMP DEFAULT NOW())`);
    } catch (err) {
      console.error(`❌ DB Error (${table}):`, err.message);
    }
  }
};

async function list(table) {
  try {
    const r = await pool.query(`SELECT id, data FROM ${table} ORDER BY updated_at DESC`);
    return r.rows.map(x => ({ ...x.data, id: x.id }));
  } catch (e) { return []; }
}

async function upsert(table, obj) {
  const id = obj.id || `id-${Date.now()}`;
  await pool.query(
    `INSERT INTO ${table} (id, data, updated_at) VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [id, JSON.stringify(obj)]
  );
  return obj;
}

// السوكيت
io.on("connection", (socket) => {
  socket.on("client:hello", (data) => data?.userId && socket.join(data.userId));
  socket.on("settings:update", (data) => io.emit("settings:sync", data));
  socket.on("task:update", (task) => io.emit("task:sync", task));
  socket.on("chat:message", (msg) => io.emit("chat:message", msg));
});

// --- راوتر الـ API (الأولوية القصوى) ---
const apiRouter = express.Router();

apiRouter.get("/health", (req, res) => res.json({ ok: true, status: "online" }));

apiRouter.get("/settings", async (req, res) => {
  try {
    const r = await pool.query("SELECT data FROM settings WHERE id = 'global'");
    res.json({ ok: true, settings: r.rows[0]?.data || {} });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

apiRouter.post("/settings", async (req, res) => {
  try {
    const s = await upsert("settings", { ...req.body, id: 'global' });
    res.json({ ok: true, settings: s });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

apiRouter.get("/tasks", async (req, res) => res.json({ ok: true, tasks: await list("tasks") }));
apiRouter.post("/tasks", async (req, res) => res.json({ ok: true, task: await upsert("tasks", req.body) }));
apiRouter.delete("/tasks/:id", async (req, res) => {
  await pool.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

apiRouter.get("/users", async (req, res) => res.json({ ok: true, users: await list("users") }));
apiRouter.post("/users", async (req, res) => res.json({ ok: true, user: await upsert("users", req.body) }));

apiRouter.get("/clients", async (req, res) => res.json({ ok: true, clients: await list("clients") }));
apiRouter.post("/clients", async (req, res) => res.json({ ok: true, client: await upsert("clients", req.body) }));

apiRouter.get("/transactions", async (req, res) => res.json({ ok: true, transactions: await list("transactions") }));
apiRouter.post("/transactions", async (req, res) => res.json({ ok: true, transaction: await upsert("transactions", req.body) }));

apiRouter.get("/announcements", async (req, res) => res.json({ ok: true, announcements: await list("announcements") }));
apiRouter.post("/announcements", async (req, res) => res.json({ ok: true, announcement: await upsert("announcements", req.body) }));

// تثبيت الراوتر
app.use("/api", apiRouter);

// معالج 404 صريح للـ API لمنع إرجاع HTML بدلاً من JSON
app.use("/api/*", (req, res) => {
  res.status(404).json({ ok: false, error: `المسار ${req.originalUrl} غير موجود على الخادم` });
});

// --- معالجة الملفات الثابتة (Frontend) ---
const distPath = path.join(rootDir, "dist");
app.use(express.static(distPath));
app.use(express.static(rootDir));

// SPA Fallback
app.get("*", (req, res) => {
  // الحماية من إرسال HTML لطلبات الـ API التائهة
  if (req.url.startsWith('/api')) return; 

  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) res.sendFile(path.join(rootDir, "index.html"));
  });
});

const port = process.env.PORT || 10000;
server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 B2U Server is active on port ${port}`);
  initDB();
});