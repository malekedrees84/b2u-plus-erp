
const API_BASE = (import.meta as any)?.env?.VITE_API_URL || "https://b2uprog.onrender.com";

export const aiService = {
  // Generate personalized welcome message
  async getPersonalizedWelcome(name: string, role: string): Promise<string> {
    const fallbackMessage = `مرحباً ${name}، جاهز للإنجاز اليوم؟`;
    
    // In a real scenario, you might call the backend AI endpoint here.
    // For now, we return the fallback or a cached value to keep it fast.
    return fallbackMessage;
  },

  async getLoginTip(): Promise<string> {
    return "";
  },
};
