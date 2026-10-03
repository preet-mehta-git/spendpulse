export type AccountType = 
  | 'savings' 
  | 'current' 
  | 'credit_card' 
  | 'loan' 
  | 'investment' 
  | 'wallet' 
  | 'other';

export type TransactionType = 
  | 'expense' 
  | 'income' 
  | 'transfer' 
  | 'refund' 
  | 'cash_withdrawal' 
  | 'cash_deposit' 
  | 'fee' 
  | 'interest' 
  | 'adjustment' 
  | 'unknown';

export type TransactionStatus = 
  | 'pending' 
  | 'posted' 
  | 'failed' 
  | 'reversed' 
  | 'refunded';

export type CategorizationMethod = 
  | 'rule' 
  | 'user_rule' 
  | 'learned' 
  | 'ai' 
  | 'manual';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialInstitution {
  id: string;
  name: string;
  identifier: string;
  logo: string;
  provider_metadata?: string;
}

export interface FinancialConnection {
  id: string;
  user_id: string;
  provider: string; // 'mock' | 'setu_aa' | 'onemoney' | 'finvu'
  provider_connection_id: string;
  status: 'connected' | 'disconnected' | 'error' | 'consent_pending';
  consent_status: 'ACTIVE' | 'PENDING' | 'REVOKED' | 'EXPIRED' | 'REJECTED';
  consent_created_at: string;
  consent_expires_at?: string;
  last_successful_sync?: string;
  last_sync_attempt?: string;
  error_code?: string;
  error_message?: string;
  is_mock: number; // 1 or 0
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  connection_id: string;
  institution_id: string;
  institution_name?: string;
  institution_logo?: string;
  external_account_id: string;
  account_name: string;
  account_type: AccountType;
  masked_account_number: string;
  currency: string;
  current_balance: number;
  available_balance: number;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'transfer';
  parent_id?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  account_name?: string;
  masked_account_number?: string;
  external_transaction_id: string;
  fingerprint: string;
  transaction_type: TransactionType;
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
  subcategory_id?: string;
  transaction_date: string;
  posted_date?: string;
  created_at: string;
  updated_at: string;
  source: string;
  status: TransactionStatus;
  is_recurring: number; // 1 or 0
  recurring_transaction_id?: string;
  transfer_account_id?: string;
  transfer_account_name?: string;
  notes?: string;
  confidence_score: number;
  categorization_method: CategorizationMethod;
  payment_mode?: string; // 'UPI' | 'CARD' | 'NEFT' | 'IMPS' | 'ATM' | 'AUTO_DEBIT'
}

export interface RawExternalTransaction {
  external_transaction_id: string;
  amount: number;
  currency: string;
  type: 'DEBIT' | 'CREDIT';
  mode?: string;
  narration: string;
  transaction_timestamp: string;
  value_date?: string;
  current_balance?: number;
  status?: TransactionStatus;
  reference_no?: string;
}

export interface UserRule {
  id: string;
  user_id: string;
  pattern: string;
  field: 'description' | 'merchant' | 'amount';
  category_id: string;
  priority: number;
  created_at: string;
}

export interface ReconciliationLog {
  id: string;
  connection_id: string;
  user_id: string;
  checked_count: number;
  missing_count: number;
  duplicate_count: number;
  updated_count: number;
  discrepancy_details: string;
  synced_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  transaction_id: string;
  type: 'expense' | 'income' | 'transfer' | 'budget_alert' | 'sync_warning';
  title: string;
  body: string;
  sent_at: string;
  status: 'sent' | 'failed';
  read: number;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  enabled: number;
  min_amount: number;
  income_enabled: number;
  transfer_enabled: number;
  budget_alerts: number;
  large_tx_alert: number;
  large_tx_threshold: number;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  monthly_limit: number;
  month_year: string; // 'YYYY-MM'
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
