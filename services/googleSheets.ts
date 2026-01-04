
import { AppSettings, Client, ProductionRequest, User, ChatMessage, Announcement, Transaction } from "../types";

export const googleSheetsService = {
  // Service Disabled: Return null/false to enforce local storage
  async fetchData(scriptUrl: string) {
    // console.warn("Google Sheets Sync Disabled (Local Mode)");
    return null;
  },

  async saveData(scriptUrl: string, data: {
    users?: User[];
    clients?: Client[];
    requests?: ProductionRequest[];
    appSettings?: AppSettings;
    messages?: ChatMessage[];
    announcements?: Announcement[];
    transactions?: Transaction[];
  }) {
    // console.warn("Google Sheets Save Disabled (Local Mode)");
    return false;
  }
};
