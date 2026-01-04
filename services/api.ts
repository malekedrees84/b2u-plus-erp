const getBaseUrl = () => {
  // التحقق من المتغير البيئي أولاً
  const envUrl = (import.meta as any)?.env?.VITE_API_URL;
  if (envUrl) return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;

  const h = window.location.hostname;
  
  // 1. بيئة التطوير المحلية
  if (h === 'localhost' || h === '127.0.0.1') {
    return "http://localhost:10000";
  }

  // 2. إذا كان يعمل من نطاق مختلف (مثل vercel أو preview)
  // نوجهه صراحة إلى سيرفر الإنتاج على Render
  if (!h.includes('onrender.com')) {
    return "https://b2uprog.onrender.com";
  }

  // 3. إذا كان يعمل من داخل نطاق Render فعلياً
  return ""; 
};

const API_URL = getBaseUrl();

async function request(url: string, options: RequestInit = {}) {
  const currentUserStr = localStorage.getItem('b2u_user');
  let userId = '';
  try {
    if (currentUserStr) userId = JSON.parse(currentUserStr).id || '';
  } catch (e) {}

  const headers: Record<string, string> = { 
    "Content-Type": "application/json",
    "X-User-Id": userId
  };

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  const fullUrl = `${API_URL}${cleanPath}`;
  
  try {
    const res = await fetch(fullUrl, { 
      ...options, 
      headers: { ...headers, ...(options.headers as any) } 
    });

    // التأكد من أن الرد بصيغة JSON قبل محاولة قراءته
    const contentType = res.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await res.json().catch(() => ({})) : null;

    if (!res.ok) {
      const errorMsg = data?.error || `API Error ${res.status} at ${cleanPath}`;
      console.error(`❌ Request Failed [${res.status}]: ${fullUrl}`, data);
      throw new Error(errorMsg);
    }

    return data;
  } catch (err: any) {
    console.error(`🚨 Network Error for ${cleanPath}:`, err.message);
    throw err;
  }
}

export const api = {
  getVersion: () => request("/api/health"),
  getSettings: () => request("/api/settings").then(r => r.settings || {}),
  saveSettings: (s: any) => request("/api/settings", { method: "POST", body: JSON.stringify(s) }),
  listTasks: () => request("/api/tasks").then(r => r.tasks || []),
  saveTask: (t: any) => request("/api/tasks", { method: "POST", body: JSON.stringify(t) }).then(r => r.task),
  updateTask: (id: string, updates: any) => request(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(updates) }).then(r => r.task),
  deleteTask: (id: string) => request(`/api/tasks/${id}`, { method: "DELETE" }),
  listUsers: () => request("/api/users").then(r => r.users || []),
  saveUser: (u: any) => request("/api/users", { method: "POST", body: JSON.stringify(u) }).then(r => r.user),
  deleteUser: (id: string) => request(`/api/users/${id}`, { method: "DELETE" }),
  listClients: () => request("/api/clients").then(r => r.clients || []),
  saveClient: (c: any) => request("/api/clients", { method: "POST", body: JSON.stringify(c) }).then(r => r.client),
  listTransactions: () => request("/api/transactions").then(r => r.transactions || []),
  saveTransaction: (t: any) => request("/api/transactions", { method: "POST", body: JSON.stringify(t) }).then(r => r.transaction),
  deleteTransaction: (id: string) => request(`/api/transactions/${id}`, { method: "DELETE" }),
  listAnnouncements: () => request("/api/announcements").then(r => r.announcements || []),
  saveAnnouncement: (a: any) => request("/api/announcements", { method: "POST", body: JSON.stringify(a) }).then(r => r.announcement),
  deleteAnnouncement: (id: string) => request(`/api/announcements/${id}`, { method: "DELETE" }),
};