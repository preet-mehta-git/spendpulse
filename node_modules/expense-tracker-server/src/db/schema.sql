-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  api_key TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Financial Institutions (HDFC, ICICI, SBI, Axis, Zerodha, Cred, Paytm)
CREATE TABLE IF NOT EXISTS financial_institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  identifier TEXT UNIQUE NOT NULL,
  logo TEXT NOT NULL,
  provider_metadata TEXT
);

-- Financial Connections (AA consent or mock connection)
CREATE TABLE IF NOT EXISTS financial_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_connection_id TEXT NOT NULL,
  status TEXT NOT NULL,
  consent_status TEXT NOT NULL,
  consent_created_at TEXT NOT NULL,
  consent_expires_at TEXT,
  last_successful_sync TEXT,
  last_sync_attempt TEXT,
  error_code TEXT,
  error_message TEXT,
  is_mock INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Financial Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  masked_account_number TEXT NOT NULL,
  currency TEXT DEFAULT 'INR',
  current_balance REAL DEFAULT 0,
  available_balance REAL DEFAULT 0,
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (connection_id) REFERENCES financial_connections(id) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES financial_institutions(id)
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_id TEXT
);

-- Core Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  external_transaction_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  merchant_name TEXT NOT NULL,
  original_description TEXT NOT NULL,
  normalized_description TEXT NOT NULL,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  transaction_date TEXT NOT NULL,
  posted_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  is_recurring INTEGER DEFAULT 0,
  recurring_transaction_id TEXT,
  transfer_account_id TEXT,
  notes TEXT,
  confidence_score REAL DEFAULT 1.0,
  categorization_method TEXT DEFAULT 'rule',
  payment_mode TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Unique index for Deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedup 
ON transactions(account_id, external_transaction_id);

CREATE INDEX IF NOT EXISTS idx_transactions_fingerprint 
ON transactions(user_id, fingerprint);

CREATE INDEX IF NOT EXISTS idx_transactions_date 
ON transactions(user_id, transaction_date DESC);

-- User-defined categorization rules
CREATE TABLE IF NOT EXISTS user_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  field TEXT NOT NULL,
  category_id TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- User category overrides (learned preferences)
CREATE TABLE IF NOT EXISTS learned_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  merchant_normalized TEXT NOT NULL,
  category_id TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Reconciliation Logs
CREATE TABLE IF NOT EXISTS reconciliation_logs (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  checked_count INTEGER NOT NULL,
  missing_count INTEGER NOT NULL,
  duplicate_count INTEGER NOT NULL,
  updated_count INTEGER NOT NULL,
  discrepancy_details TEXT NOT NULL,
  synced_at TEXT NOT NULL,
  FOREIGN KEY (connection_id) REFERENCES financial_connections(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications (with deduplication key)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  transaction_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  status TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup 
ON notifications(user_id, transaction_id, type);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  enabled INTEGER DEFAULT 1,
  min_amount REAL DEFAULT 0,
  income_enabled INTEGER DEFAULT 1,
  transfer_enabled INTEGER DEFAULT 0,
  budget_alerts INTEGER DEFAULT 1,
  large_tx_alert INTEGER DEFAULT 1,
  large_tx_threshold REAL DEFAULT 5000,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Monthly Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  monthly_limit REAL NOT NULL,
  month_year TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_cat_month 
ON budgets(user_id, category_id, month_year);

-- Recurring Subscriptions / Bill Tracker
CREATE TABLE IF NOT EXISTS recurring_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  frequency TEXT NOT NULL,
  last_charge_date TEXT NOT NULL,
  next_expected_date TEXT NOT NULL,
  category_id TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  annual_cost REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Web Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
