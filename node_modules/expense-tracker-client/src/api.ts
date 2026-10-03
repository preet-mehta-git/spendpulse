import { 
  DashboardMetrics, 
  Transaction, 
  Account, 
  Category, 
  Budget, 
  RecurringSubscription, 
  FinancialConnection, 
  NotificationRecord, 
  NotificationPreference,
  ReconciliationLog
} from './types.js';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = localStorage.getItem('spendpulse_token') || null;
  private authPromise: Promise<string> | null = null;

  public setToken(token: string) {
    this.token = token;
    localStorage.setItem('spendpulse_token', token);
  }

  public async getValidToken(): Promise<string> {
    if (this.token && this.token !== 'demo_token') {
      return this.token;
    }

    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'demo@spendpulse.local', password: 'password123' })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            this.setToken(data.token);
            return data.token;
          }
        }
      } catch (e) {
        console.warn('Auto-login failed:', e);
      } finally {
        this.authPromise = null;
      }
      return '';
    })();

    return this.authPromise;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getValidToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      let res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      // If unauthorized, re-authenticate and retry once
      if (res.status === 401) {
        this.token = null;
        localStorage.removeItem('spendpulse_token');
        const newToken = await this.getValidToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
          });
        }
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (!options.method || options.method === 'GET') {
        try {
          localStorage.setItem(`offline_cache_${endpoint}`, JSON.stringify(data));
          localStorage.setItem(`offline_cache_time_${endpoint}`, new Date().toISOString());
        } catch (e) {}
      }
      return data;
    } catch (err: any) {
      if (!options.method || options.method === 'GET') {
        const cached = localStorage.getItem(`offline_cache_${endpoint}`);
        if (cached) {
          console.warn(`[Offline Mode] Serving cached data for ${endpoint}`);
          return JSON.parse(cached);
        }
      }
      throw err;
    }
  }

  // Dashboard & Analytics
  public getDashboard(monthYear?: string): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>(`/analytics/dashboard${monthYear ? `?monthYear=${monthYear}` : ''}`);
  }

  public getTrends(months: number = 6): Promise<{ trends: Array<{ month: string; spend: number; income: number; savings: number }> }> {
    return this.request<{ trends: any[] }>(`/analytics/trends?months=${months}`);
  }

  // Transactions
  public getTransactions(params: Record<string, any> = {}): Promise<{ total: number; transactions: Transaction[]; limit: number; offset: number }> {
    const query = new URLSearchParams(params).toString();
    return this.request<{ total: number; transactions: Transaction[]; limit: number; offset: number }>(`/transactions?${query}`);
  }

  public getTransaction(id: string): Promise<{ transaction: Transaction }> {
    return this.request<{ transaction: Transaction }>(`/transactions/${id}`);
  }

  public updateTransaction(id: string, updates: { category_id?: string; notes?: string; is_recurring?: boolean }): Promise<{ transaction: Transaction }> {
    return this.request<{ transaction: Transaction }>(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  public getCategories(): Promise<{ categories: Category[] }> {
    return this.request<{ categories: Category[] }>('/transactions/categories');
  }

  public getUserRules(): Promise<{ rules: any[] }> {
    return this.request<{ rules: any[] }>('/transactions/user/rules');
  }

  public createUserRule(rule: { pattern: string; field: string; category_id: string; priority?: number }) {
    return this.request('/transactions/user/rules', {
      method: 'POST',
      body: JSON.stringify(rule)
    });
  }

  public deleteUserRule(id: string) {
    return this.request(`/transactions/user/rules/${id}`, { method: 'DELETE' });
  }

  // Accounts & Connections
  public getAccounts(): Promise<{ accounts: Account[] }> {
    return this.request<{ accounts: Account[] }>('/accounts');
  }

  public getConnections(): Promise<{ connections: FinancialConnection[] }> {
    return this.request<{ connections: FinancialConnection[] }>('/connections');
  }

  public connectMockBank(): Promise<any> {
    return this.request('/connections/mock/connect', { method: 'POST' });
  }

  public connectAccountAggregator(mobileNumber?: string): Promise<any> {
    return this.request('/connections/aa/connect', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber })
    });
  }

  public simulateMockScenario(scenario: 'swiggy_upi' | 'salary_credit' | 'amazon_card' | 'transfer' | 'sync_failure'): Promise<any> {
    return this.request('/connections/mock/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenario })
    });
  }

  public disconnectConnection(id: string): Promise<any> {
    return this.request(`/connections/${id}`, { method: 'DELETE' });
  }

  public clearDemoData(): Promise<{ success: boolean; message: string }> {
    return this.request('/connections/clear-demo', { method: 'POST' });
  }

  // Sync
  public syncAll(): Promise<{ reports: any[] }> {
    return this.request('/sync/all', { method: 'POST' });
  }

  public syncConnection(id: string): Promise<{ report: any }> {
    return this.request(`/sync/${id}`, { method: 'POST' });
  }

  public getSyncStatus(): Promise<{ lastSyncTime: string | null; connections: any[] }> {
    return this.request('/sync/status');
  }

  // Budgets
  public getBudgets(monthYear?: string): Promise<{ budgets: Budget[] }> {
    return this.request<{ budgets: Budget[] }>(`/budgets${monthYear ? `?monthYear=${monthYear}` : ''}`);
  }

  public setBudget(categoryId: string, monthlyLimit: number, monthYear?: string): Promise<{ budget: Budget }> {
    return this.request<{ budget: Budget }>('/budgets', {
      method: 'POST',
      body: JSON.stringify({ category_id: categoryId, monthly_limit: monthlyLimit, month_year: monthYear })
    });
  }

  public deleteBudget(id: string): Promise<any> {
    return this.request(`/budgets/${id}`, { method: 'DELETE' });
  }

  // Recurring Subscriptions
  public getRecurring(): Promise<{ items: RecurringSubscription[]; monthlyTotal: number; annualTotal: number }> {
    return this.request('/recurring');
  }

  public detectRecurring(): Promise<{ subscriptions: RecurringSubscription[] }> {
    return this.request('/recurring/detect', { method: 'POST' });
  }

  // Reconciliation Logs
  public getReconciliationLogs(): Promise<{ logs: ReconciliationLog[] }> {
    return this.request('/reconciliation/logs');
  }

  // Notifications
  public getNotifications(): Promise<{ notifications: NotificationRecord[] }> {
    return this.request('/notifications');
  }

  public markNotificationsRead(): Promise<any> {
    return this.request('/notifications/read-all', { method: 'POST' });
  }

  public getNotificationPreferences(): Promise<{ preferences: NotificationPreference }> {
    return this.request('/notifications/preferences');
  }

  public updateNotificationPreferences(updates: Partial<NotificationPreference>): Promise<{ preferences: NotificationPreference }> {
    return this.request('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  public getVapidKey(): Promise<{ publicKey: string }> {
    return this.request('/notifications/vapid-key');
  }

  public subscribePush(subscription: any): Promise<any> {
    return this.request('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription)
    });
  }

  public triggerTestNotification(): Promise<any> {
    return this.request('/notifications/test', { method: 'POST' });
  }

  // Android Real-Time Phone Sync & Smart Ingestion
  public getMobileConfig(): Promise<import('./types.js').MobileSyncConfig> {
    return this.request<import('./types.js').MobileSyncConfig>('/sync/mobile-config');
  }

  public regenerateApiKey(): Promise<{ apiKey: string; webhookUrl: string; message: string }> {
    return this.request('/sync/regenerate-api-key', { method: 'POST' });
  }

  public parseSms(text: string, sender?: string): Promise<{ success: boolean; parsed: import('./types.js').ParsedSmsPreview }> {
    return this.request('/sync/parse-sms', {
      method: 'POST',
      body: JSON.stringify({ text, sender })
    });
  }

  public ingestMobileTransaction(payload: {
    text?: string;
    sms?: string;
    body?: string;
    sender?: string;
    amount?: number;
    merchant?: string;
    category_id?: string;
    account_id?: string;
    transaction_type?: string;
    payment_mode?: string;
    notes?: string;
    source?: string;
  }): Promise<{
    success: boolean;
    status: 'created' | 'duplicate' | 'error';
    message?: string;
    transaction?: Transaction;
    duplicateSkipped?: boolean;
    parsedSummary?: import('./types.js').ParsedSmsPreview;
  }> {
    return this.request('/sync/mobile-webhook', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}

export const api = new ApiClient();
