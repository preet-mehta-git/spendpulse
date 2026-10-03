import { Router } from 'express';
import { db } from '../db/database.js';
import { AuthService, AuthRequest } from '../services/authService.js';
import { MockFinancialProvider } from '../providers/MockFinancialProvider.js';
import { AccountAggregatorProvider } from '../providers/AccountAggregatorProvider.js';
import { SyncService } from '../services/syncService.js';

export const connectionsRouter = Router();

connectionsRouter.use(AuthService.requireAuth);

connectionsRouter.get('/', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const connections = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM accounts WHERE connection_id = c.id) as accounts_count,
      (SELECT COUNT(*) FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE a.connection_id = c.id) as transactions_count
    FROM financial_connections c
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(userId);

  res.json({ connections });
});

// Connect to Mock Provider
connectionsRouter.post('/mock/connect', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const provider = new MockFinancialProvider();
    const result = await provider.connect(userId);

    const id = `conn-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO financial_connections (
        id, user_id, provider, provider_connection_id, status, consent_status, consent_created_at, consent_expires_at, is_mock, created_at, updated_at
      ) VALUES (?, ?, 'mock_bank_provider', ?, 'connected', 'ACTIVE', ?, ?, 1, ?, ?)
    `).run(id, userId, result.connectionId, now, result.consentExpiresAt, now, now);

    // Run initial sync immediately
    const syncReport = await SyncService.syncConnection(id);

    res.status(201).json({
      connectionId: id,
      status: 'connected',
      syncReport
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Connect to Live Account Aggregator (Setu / Sahamati)
connectionsRouter.post('/aa/connect', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { mobileNumber, redirectUrl } = req.body;
    const provider = new AccountAggregatorProvider();
    const result = await provider.connect(userId, { mobileNumber, redirectUrl });

    const id = `conn-aa-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO financial_connections (
        id, user_id, provider, provider_connection_id, status, consent_status, consent_created_at, consent_expires_at, is_mock, created_at, updated_at
      ) VALUES (?, ?, 'setu_account_aggregator', ?, ?, 'PENDING', ?, ?, 0, ?, ?)
    `).run(id, userId, result.connectionId, result.status, now, result.consentExpiresAt, now, now);

    res.status(201).json({
      connectionId: id,
      status: result.status,
      redirectUrl: result.redirectUrl
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Simulate Live Banking Scenario
connectionsRouter.post('/mock/simulate', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { scenario } = req.body; // 'swiggy_upi' | 'salary_credit' | 'amazon_card' | 'transfer' | 'sync_failure'

    const mockConn = db.prepare(`
      SELECT id FROM financial_connections WHERE user_id = ? AND is_mock = 1 AND status = 'connected' LIMIT 1
    `).get(userId) as { id: string } | undefined;

    if (!mockConn) {
      return res.status(400).json({ error: 'No active Mock Bank connection found. Please connect the Mock Bank first.' });
    }

    const now = new Date().toISOString();

    if (scenario === 'sync_failure') {
      MockFinancialProvider.setSimulateFail(true);
      return res.json({ message: 'Simulated network timeout/failure set for next sync.' });
    }

    if (scenario === 'swiggy_upi') {
      const txId = `SIM-UPI-${Date.now()}`;
      MockFinancialProvider.injectMockTransaction('mock-acc-hdfc-sal', {
        external_transaction_id: txId,
        amount: 385.00,
        currency: 'INR',
        type: 'DEBIT',
        mode: 'UPI',
        narration: `UPI/SWIGGY/ORDER-${Math.floor(Math.random() * 900000 + 100000)}/Food`,
        transaction_timestamp: now,
        status: 'posted'
      });
    } else if (scenario === 'salary_credit') {
      const txId = `SIM-SAL-${Date.now()}`;
      MockFinancialProvider.injectMockTransaction('mock-acc-hdfc-sal', {
        external_transaction_id: txId,
        amount: 92500.00,
        currency: 'INR',
        type: 'CREDIT',
        mode: 'NEFT',
        narration: 'NEFT-CR-INFOSYS TECHNOLOGIES-SALARY-BONUS',
        transaction_timestamp: now,
        status: 'posted'
      });
    } else if (scenario === 'amazon_card') {
      const txId = `SIM-CC-${Date.now()}`;
      MockFinancialProvider.injectMockTransaction('mock-acc-icici-card', {
        external_transaction_id: txId,
        amount: 2499.00,
        currency: 'INR',
        type: 'DEBIT',
        mode: 'CARD',
        narration: 'POS 4912 AMAZON SELLER SERVICES ELECTRONICS',
        transaction_timestamp: now,
        status: 'posted'
      });
    } else if (scenario === 'transfer') {
      const txId1 = `SIM-TRF1-${Date.now()}`;
      const txId2 = `SIM-TRF2-${Date.now()}`;
      MockFinancialProvider.injectMockTransaction('mock-acc-hdfc-sal', {
        external_transaction_id: txId1,
        amount: 10000.00,
        currency: 'INR',
        type: 'DEBIT',
        mode: 'IMPS',
        narration: 'IMPS-P2A-TRANSFER TO SBI A/C 7739',
        transaction_timestamp: now,
        status: 'posted'
      });
      MockFinancialProvider.injectMockTransaction('mock-acc-sbi-savings', {
        external_transaction_id: txId2,
        amount: 10000.00,
        currency: 'INR',
        type: 'CREDIT',
        mode: 'IMPS',
        narration: 'IMPS-CR-FROM HDFC BANK A/C 9182',
        transaction_timestamp: now,
        status: 'posted'
      });
    }

    // Run sync to pull the newly injected transaction
    const syncReport = await SyncService.syncConnection(mockConn.id);

    res.json({
      message: `Scenario '${scenario}' simulated and synchronized successfully.`,
      syncReport
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clear All Mock / Demo Data
connectionsRouter.post('/clear-demo', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const mockConns = db.prepare('SELECT id FROM financial_connections WHERE user_id = ? AND is_mock = 1').all(userId) as Array<{ id: string }>;
    
    for (const c of mockConns) {
      db.prepare('DELETE FROM financial_connections WHERE id = ?').run(c.id);
    }
    
    // Also clean any stray demo notifications and logs
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM reconciliation_audit_logs WHERE user_id = ?').run(userId);

    res.json({ success: true, message: 'All demo data cleared successfully. Your ledger is now fresh!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear demo data' });
  }
});

// Disconnect
connectionsRouter.delete('/:id', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  db.prepare('DELETE FROM financial_connections WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ message: 'Connection removed successfully' });
});
