import { 
  FinancialDataProvider, 
  ProviderAccount, 
  ProviderTransactionBatch, 
  ConnectResult 
} from './FinancialDataProvider.js';
import { RawExternalTransaction, TransactionStatus } from '../types/index.js';

export class MockFinancialProvider implements FinancialDataProvider {
  public readonly providerId = 'mock_bank_provider';
  public readonly isMock = true;

  // In-memory store for dynamic mock scenario testing
  private static dynamicTransactions: Map<string, RawExternalTransaction[]> = new Map();
  private static pendingTransitions: Map<string, { externalId: string; newStatus: TransactionStatus }> = new Map();
  private static shouldFailNextSync = false;

  public static setSimulateFail(fail: boolean) {
    this.shouldFailNextSync = fail;
  }

  public static injectMockTransaction(accountId: string, tx: RawExternalTransaction) {
    const list = this.dynamicTransactions.get(accountId) || [];
    list.unshift(tx);
    this.dynamicTransactions.set(accountId, list);
  }

  public async connect(userId: string, options?: Record<string, any>): Promise<ConnectResult> {
    const connectionId = `mock-conn-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    return {
      connectionId,
      status: 'connected',
      consentExpiresAt: expiresAt
    };
  }

  public async getAccounts(connectionId: string): Promise<ProviderAccount[]> {
    return [
      {
        externalAccountId: 'mock-acc-hdfc-sal',
        accountName: 'HDFC Corporate Salary Account',
        accountType: 'savings',
        maskedAccountNumber: '•••• •••• 9182',
        currency: 'INR',
        currentBalance: 142850.50,
        availableBalance: 142850.50
      },
      {
        externalAccountId: 'mock-acc-icici-card',
        accountName: 'ICICI Sapphiro Credit Card',
        accountType: 'credit_card',
        maskedAccountNumber: '•••• •••• 4421',
        currency: 'INR',
        currentBalance: -24890.00,
        availableBalance: 275110.00
      },
      {
        externalAccountId: 'mock-acc-sbi-savings',
        accountName: 'SBI Personal Savings',
        accountType: 'savings',
        maskedAccountNumber: '•••• •••• 7739',
        currency: 'INR',
        currentBalance: 65400.00,
        availableBalance: 65400.00
      }
    ];
  }

  public async fetchTransactions(
    connectionId: string,
    accountId?: string,
    sinceDate?: string,
    cursor?: string
  ): Promise<ProviderTransactionBatch> {
    if (MockFinancialProvider.shouldFailNextSync) {
      MockFinancialProvider.shouldFailNextSync = false;
      throw new Error('MOCK_BANK_NETWORK_TIMEOUT: Upstream banking core simulator temporarily unavailable.');
    }

    const accounts = await this.getAccounts(connectionId);
    const targetAccounts = accountId ? accounts.filter(a => a.externalAccountId === accountId) : accounts;

    const results = targetAccounts.map(acc => {
      const baseTxns = this.generateSampleTransactionsForAccount(acc.externalAccountId);
      const injected = MockFinancialProvider.dynamicTransactions.get(acc.externalAccountId) || [];
      const allTxns = [...injected, ...baseTxns];

      // Filter by sinceDate if incremental sync
      let filtered = allTxns;
      if (sinceDate) {
        const sinceTime = new Date(sinceDate).getTime();
        filtered = allTxns.filter(t => new Date(t.transaction_timestamp).getTime() >= sinceTime);
      }

      return {
        accountId: acc.externalAccountId,
        items: filtered
      };
    });

    return {
      accounts,
      transactions: results,
      hasMore: false
    };
  }

  public async refreshConsent(connectionId: string): Promise<{ status: string; expiresAt?: string }> {
    return {
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  public async disconnect(connectionId: string): Promise<void> {
    // Clean up
  }

  private generateSampleTransactionsForAccount(accountId: string): RawExternalTransaction[] {
    const now = new Date();
    const d = (daysAgo: number, hours: number = 12, mins: number = 30) => {
      const dt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      dt.setHours(hours, mins, 0, 0);
      return dt.toISOString();
    };

    if (accountId === 'mock-acc-hdfc-sal') {
      return [
        {
          external_transaction_id: 'HDFC-TXN-9001',
          amount: 85000,
          currency: 'INR',
          type: 'CREDIT',
          mode: 'NEFT',
          narration: 'NEFT-CR-INFOSYS TECHNOLOGIES-SALARY-AUG26-REF891283',
          transaction_timestamp: d(1, 9, 30),
          status: 'posted',
          current_balance: 142850.50
        },
        {
          external_transaction_id: 'HDFC-TXN-9002',
          amount: 450,
          currency: 'INR',
          type: 'DEBIT',
          mode: 'UPI',
          narration: 'UPI/SWIGGY/429108192837/Order-Food',
          transaction_timestamp: d(0, 13, 15),
          status: 'posted',
          current_balance: 142400.50
        },
        {
          external_transaction_id: 'HDFC-TXN-9003',
          amount: 890,
          currency: 'INR',
          type: 'DEBIT',
          mode: 'UPI',
          narration: 'UPI/BLINKIT/GROCERY-BLR-9921/Order',
          transaction_timestamp: d(1, 18, 45),
          status: 'posted',
          current_balance: 141510.50
        },
        {
          external_transaction_id: 'HDFC-TXN-9004',
          amount: 15000,
          currency: 'INR',
          type: 'DEBIT',
          mode: 'IMPS',
          narration: 'IMPS-P2A-TRANSFER TO SBI A/C 7739-SAVINGS',
          transaction_timestamp: d(2, 11, 0),
          status: 'posted',
          current_balance: 126510.50
        },
        {
          external_transaction_id: 'HDFC-TXN-9005',
          amount: 649,
          currency: 'INR',
          type: 'DEBIT',
          mode: 'AUTO_DEBIT',
          narration: 'ACH/DR/NETFLIX ENTERTAINMENT/MONTHLY-SUB',
          transaction_timestamp: d(4, 4, 10),
          status: 'posted',
          current_balance: 125861.50
        },
        {
          external_transaction_id: 'HDFC-TXN-9006',
          amount: 5000,
          currency: 'INR',
          type: 'DEBIT',
          mode: 'ATM',
          narration: 'ATM WDL HDFC INDIRANAGAR BLR REF8821',
          transaction_timestamp: d(6, 17, 20),
          status: 'posted',
          current_balance: 120861.50
        },
        {
          external_transaction_id: 'HDFC-TXN-9007',
          amount: 320,
          currency: 'INR',
          type: 'DEBIT',
          mode: 'UPI',
          narration: 'UPI/CHAAYOS/CHAI-SNACKS/99120',
          transaction_timestamp: d(0, 16, 40),
          status: 'pending', // Pending transaction simulation
          current_balance: 120541.50
        }
      ];
    }

    if (accountId === 'mock-acc-icici-card') {
      return [
        {
          external_transaction_id: 'ICICI-CC-4001',
          amount: 3499,
          currency: 'INR',
          type: 'DEBIT',
          mode: 'CARD',
          narration: 'POS 4912 AMAZON SELLER SERVICES MUMBAI',
          transaction_timestamp: d(1, 14, 20),
          status: 'posted'
        },
        {
          external_transaction_id: 'ICICI-CC-4002',
          amount: 119,
          currency: 'INR',
          type: 'DEBIT',
          mode: 'CARD',
          narration: 'POS 8821 SPOTIFY INDIA AB RECURRING',
          transaction_timestamp: d(3, 2, 15),
          status: 'posted'
        },
        {
          external_transaction_id: 'ICICI-CC-4003',
          amount: 540,
          currency: 'INR',
          type: 'DEBIT',
          mode: 'CARD',
          narration: 'POS 1204 UBER INDIA SYSTEMS BLR RIDE',
          transaction_timestamp: d(2, 20, 10),
          status: 'posted'
        },
        {
          external_transaction_id: 'ICICI-CC-4004',
          amount: 1250,
          currency: 'INR',
          type: 'CREDIT',
          mode: 'CARD',
          narration: 'REFUND - AMAZON SELLER SERVICES RETURN',
          transaction_timestamp: d(3, 16, 0),
          status: 'posted'
        }
      ];
    }

    if (accountId === 'mock-acc-sbi-savings') {
      return [
        {
          external_transaction_id: 'SBI-TXN-1001',
          amount: 15000,
          currency: 'INR',
          type: 'CREDIT',
          mode: 'IMPS',
          narration: 'IMPS-CR-FROM HDFC BANK A/C 9182-SELF',
          transaction_timestamp: d(2, 11, 2),
          status: 'posted',
          current_balance: 65400.00
        },
        {
          external_transaction_id: 'SBI-TXN-1002',
          amount: 1250,
          currency: 'INR',
          type: 'DEBIT',
          mode: 'UPI',
          narration: 'UPI/RELIANCE JIO/FIBER BILL/981290',
          transaction_timestamp: d(5, 10, 30),
          status: 'posted',
          current_balance: 50400.00
        }
      ];
    }

    return [];
  }
}
