export interface Account {
  id: string;
  user_id: string;
  connection_id: string;
  institution_id: string;
  institution_name?: string;
  institution_logo?: string;
  external_account_id: string;
  account_name: string;
  account_type: string;
  masked_account_number: string;
  currency: string;
  current_balance: number;
  available_balance: number;
  last_synced_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'transfer';
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  account_name?: string;
  masked_account_number?: string;
  external_transaction_id: string;
  transaction_type: 'expense' | 'income' | 'transfer' | 'refund' | 'cash_withdrawal' | 'cash_deposit' | 'fee' | 'interest' | 'unknown';
  amount: number;
  currency: string;
  merchant_name: string;
  original_description: string;
  normalized_description: string;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  category_icon?: string;
  category_color?: string;
  transaction_date: string;
  posted_date?: string;
  source: string;
  status: 'pending' | 'posted' | 'failed' | 'reversed' | 'refunded';
  is_recurring: number;
  transfer_account_id?: string;
  transfer_account_name?: string;
  notes?: string;
  confidence_score: number;
  categorization_method: string;
  payment_mode?: string;
}

export interface FinancialConnection {
  id: string;
  provider: string;
  provider_connection_id: string;
  status: string;
  consent_status: string;
  last_successful_sync?: string;
  last_sync_attempt?: string;
  is_mock: number;
  accounts_count?: number;
  transactions_count?: number;
  error_message?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  monthly_limit: number;
  month_year: string;
  spent?: number;
  remaining?: number;
  percentage?: number;
}

export interface RecurringSubscription {
  id: string;
  user_id: string;
  account_id: string;
  merchant_name: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'weekly';
  last_charge_date: string;
  next_expected_date: string;
  category_id: string;
  category_name?: string;
  active: number;
  annual_cost: number;
}

export interface DashboardMetrics {
  totalBalance: number;
  spentThisMonth: number;
  incomeThisMonth: number;
  savingsThisMonth: number;
  spentLastMonth: number;
  incomeLastMonth: number;
  spendChangePercentage: number;
  recentTransactions: Transaction[];
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  spendingPatterns: {
    averageDailySpending: number;
    averageTransactionAmount: number;
    mostExpensiveDay: string;
    mostFrequentCategory: string;
    totalTransactionsThisMonth: number;
  };
  largestExpensesThisMonth: Array<{
    id: string;
    merchantName: string;
    amount: number;
    categoryName: string;
    transactionDate: string;
  }>;
  insights: string[];
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  transaction_id: string;
  type: string;
  title: string;
  body: string;
  sent_at: string;
  read: number;
}

export interface NotificationPreference {
  id: string;
  enabled: number;
  min_amount: number;
  income_enabled: number;
  transfer_enabled: number;
  budget_alerts: number;
  large_tx_alert: number;
  large_tx_threshold: number;
}

export interface ReconciliationLog {
  id: string;
  connection_id: string;
  checked_count: number;
  missing_count: number;
  duplicate_count: number;
  updated_count: number;
  discrepancy_details: string;
  synced_at: string;
}

export interface ParsedSmsPreview {
  amount: number;
  currency: string;
  transactionType: 'expense' | 'income' | 'transfer';
  merchantName: string;
  rawNarration: string;
  normalizedDescription: string;
  paymentMode: string;
  maskedAccount?: string;
  bankIdentifier?: string;
  bankName?: string;
  referenceNo?: string;
  remainingBalance?: number;
  transactionDate: string;
  isConfidenceHigh: boolean;
}

export interface MobileSyncConfig {
  apiKey: string;
  webhookUrl: string;
  activeConnectionsCount: number;
  instructions: {
    android_macrodroid: {
      appName: string;
      trigger: string;
      action: string;
      method: string;
      url: string;
      contentType: string;
      bodyPayload: string;
    };
    android_tasker: {
      appName: string;
      trigger: string;
      action: string;
      url: string;
      body: string;
    };
  };
}

