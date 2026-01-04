const LOCAL_BASE = "http://localhost:5050";
const RENDER_BASE = "https://b2uprog.onrender.com";

let cachedBase: string | null = null;

// ------------------------
// Health check
// ------------------------
async function isHealthy(base: string) {
  try {
    const r = await fetch(`${base}/health`, { method: "GET" });
    if (!r.ok) return false;
    const text = await r.text();
    return text.includes('"ok":true') || text.includes('"ok": true');
  } catch {
    return false;
  }
}

export async function resolveApiBase() {
  if (cachedBase) return cachedBase;

  const localOk = await isHealthy(LOCAL_BASE);
  cachedBase = localOk ? LOCAL_BASE : RENDER_BASE;

  console.log("🔗 API base resolved to:", cachedBase);
  return cachedBase;
}

// ------------------------
// Client ID helper
// ------------------------
const getClientId = () => {
  let id = localStorage.getItem("b2u_client_id");
  if (!id) {
    id = `c-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("b2u_client_id", id);
  }
  return id;
};

// ------------------------
// Core fetch helper
// ------------------------
async function j(path: string, options: RequestInit = {}) {
  const base = await resolveApiBase();
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Id": getClientId(),
    ...(options.headers as any),
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const raw = await res.text();
    throw new Error(
      `API returned non-JSON (${res.status}). First chars: ${raw.slice(0, 80)}`
    );
  }

  return res.json();
}

// ------------------------
// Normalize helper
// ------------------------
const normalize = (item: any) => {
  if (!item) return item;

  if (item.data && typeof item.data === "string") {
    try {
      const parsed = JSON.parse(item.data);
      return { ...parsed, id: item.id, updated_at: item.updated_at };
    } catch {
      return item;
    }
  }

  if (item.data && typeof item.data === "object") {
    return { ...item.data, id: item.id, updated_at: item.updated_at };
  }

  return item;
};

// ------------------------
// Public API
// ------------------------
export const api = {
  clientId: getClientId(),

  // Users
  listUsers: () =>
    j("/api/users").then((r) => (r.users || []).map(normalize)),
  saveUser: (u: any) =>
    j("/api/users", {
      method: "POST",
      body: JSON.stringify(u),
    }).then((r) => normalize(r.user)),
  deleteUser: (id: string) =>
    j(`/api/users/${id}`, { method: "DELETE" }),

  // Clients
  listClients: () =>
    j("/api/clients").then((r) => (r.clients || []).map(normalize)),
  saveClient: (c: any) =>
    j("/api/clients", {
      method: "POST",
      body: JSON.stringify(c),
    }).then((r) => normalize(r.client)),
  deleteClient: (id: string) =>
    j(`/api/clients/${id}`, { method: "DELETE" }),

  // Tasks
  listTasks: () =>
    j("/api/tasks").then((r) => (r.tasks || []).map(normalize)),
  saveTask: (t: any) =>
    j("/api/tasks", {
      method: "POST",
      body: JSON.stringify(t),
    }).then((r) => normalize(r.task)),
  deleteTask: (id: string) =>
    j(`/api/tasks/${id}`, { method: "DELETE" }),

  // Announcements
  listAnnouncements: () =>
    j("/api/announcements").then((r) =>
      (r.announcements || []).map(normalize)
    ),
  saveAnnouncement: (a: any) =>
    j("/api/announcements", {
      method: "POST",
      body: JSON.stringify(a),
    }).then((r) => normalize(r.announcement)),
  deleteAnnouncement: (id: string) =>
    j(`/api/announcements/${id}`, { method: "DELETE" }),

  // Transactions
  listTransactions: () =>
    j("/api/transactions").then((r) =>
      (r.transactions || []).map(normalize)
    ),
  saveTransaction: (t: any) =>
    j("/api/transactions", {
      method: "POST",
      body: JSON.stringify(t),
    }).then((r) => normalize(r.transaction)),
  deleteTransaction: (id: string) =>
    j(`/api/transactions/${id}`, { method: "DELETE" }),
};