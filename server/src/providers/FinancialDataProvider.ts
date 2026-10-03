import { RawExternalTransaction } from '../types/index.js';

export interface ProviderAccount {
  externalAccountId: string;
  accountName: string;
  accountType: 'savings' | 'current' | 'credit_card' | 'loan' | 'investment' | 'wallet' | 'other';
  maskedAccountNumber: string;
  currency: string;
  currentBalance: number;
  availableBalance: number;
}

export interface ProviderTransactionBatch {
  accounts: ProviderAccount[];
  transactions: {
    accountId: string;
    items: RawExternalTransaction[];
  }[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface ConnectResult {
  connectionId: string;
  status: 'connected' | 'consent_pending' | 'error';
  consentExpiresAt?: string;
  redirectUrl?: string;
}

export interface FinancialDataProvider {
  readonly providerId: string;
  readonly isMock: boolean;

  connect(userId: string, options?: Record<string, any>): Promise<ConnectResult>;
  getAccounts(connectionId: string): Promise<ProviderAccount[]>;
  fetchTransactions(
    connectionId: string, 
    accountId?: string, 
    sinceDate?: string, 
    cursor?: string
  ): Promise<ProviderTransactionBatch>;
  refreshConsent(connectionId: string): Promise<{ status: string; expiresAt?: string }>;
  disconnect(connectionId: string): Promise<void>;
}
