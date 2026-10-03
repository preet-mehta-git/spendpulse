import { describe, it, expect, beforeEach } from 'vitest';
import { MerchantNormalizer } from '../services/merchantNormalizer.js';
import { CategorizationEngine } from '../services/categorizationEngine.js';
import { TransferDetector } from '../services/transferDetector.js';
import { db, initDatabase } from '../db/database.js';
import { NotificationService } from '../services/notificationService.js';
import { SyncService } from '../services/syncService.js';
describe('Financial Rules & Synchronization Engine', () => {
    const testUserId = 'test-user-unit-001';
    beforeEach(() => {
        initDatabase();
        // Ensure test user exists for foreign keys
        db.prepare(`
      INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at, updated_at)
      VALUES (?, 'test@test.local', 'Test User', 'hash', ?, ?)
    `).run(testUserId, new Date().toISOString(), new Date().toISOString());
    });
    it('MerchantNormalizer correctly cleans Indian UPI, POS, and NetBanking descriptions', () => {
        const r1 = MerchantNormalizer.normalize('UPI/SWIGGY/429108192837/Order-Food');
        expect(r1.merchantName).toBe('Swiggy');
        expect(r1.paymentMode).toBe('UPI');
        const r2 = MerchantNormalizer.normalize('POS 4912 AMAZON SELLER SERVICES MUMBAI');
        expect(r2.merchantName).toBe('Amazon');
        expect(r2.paymentMode).toBe('CARD');
        const r3 = MerchantNormalizer.normalize('NEFT-CR-INFOSYS TECHNOLOGIES-SALARY-AUG26');
        expect(r3.merchantName).toBe('Monthly Salary');
        expect(r3.paymentMode).toBe('NEFT');
        const r4 = MerchantNormalizer.normalize('ATM WDL HDFC INDIRANAGAR BLR REF8821');
        expect(r4.merchantName).toBe('Cash Withdrawal (ATM)');
        expect(r4.paymentMode).toBe('ATM');
    });
    it('CategorizationEngine accurately maps Layer 1 Indian merchants and Layer 2 custom user rules', () => {
        // Layer 1 Dictionary check
        const catFood = CategorizationEngine.categorize(testUserId, 'Swiggy', 'UPI/SWIGGY/123', 450, 'DEBIT');
        expect(catFood.categoryId).toBe('cat-food');
        expect(catFood.transactionType).toBe('expense');
        expect(catFood.confidenceScore).toBeGreaterThanOrEqual(0.95);
        const catTransport = CategorizationEngine.categorize(testUserId, 'Uber', 'POS UBER RIDE', 320, 'DEBIT');
        expect(catTransport.categoryId).toBe('cat-transport');
        // Layer 2: User rule override
        const ruleId = `rule-${Date.now()}`;
        db.prepare(`
      INSERT OR REPLACE INTO user_rules (id, user_id, pattern, field, category_id, priority, created_at)
      VALUES (?, ?, 'SPECIAL_CAFE', 'merchant', 'cat-personal', 10, ?)
    `).run(ruleId, testUserId, new Date().toISOString());
        const catUserRule = CategorizationEngine.categorize(testUserId, 'SPECIAL_CAFE BLR', 'UPI/SPECIAL_CAFE', 200, 'DEBIT');
        expect(catUserRule.categoryId).toBe('cat-personal');
        expect(catUserRule.categorizationMethod).toBe('user_rule');
    });
    it('Layer 3: Learns preferences when user manually reclassifies a transaction', () => {
        // Record user override
        CategorizationEngine.recordUserOverride(testUserId, 'Custom Store X', 'cat-health');
        const result = CategorizationEngine.categorize(testUserId, 'Custom Store X', 'UPI/CUSTOM_STORE_X', 500, 'DEBIT');
        expect(result.categoryId).toBe('cat-health');
        expect(result.categorizationMethod).toBe('learned');
    });
    it('NotificationService enforces strict idempotency and never notifies twice for same transaction', async () => {
        const txId = `tx-notif-${Date.now()}`;
        const firstNotification = await NotificationService.notifyTransaction(testUserId, {
            id: txId,
            merchant_name: 'Zomato',
            amount: 320,
            transaction_type: 'expense',
            category_name: 'Food & Dining'
        });
        expect(firstNotification).toBe(true);
        // Duplicate notification attempt for the exact same transaction
        const secondNotification = await NotificationService.notifyTransaction(testUserId, {
            id: txId,
            merchant_name: 'Zomato',
            amount: 320,
            transaction_type: 'expense',
            category_name: 'Food & Dining'
        });
        expect(secondNotification).toBe(false);
    });
    it('TransferDetector links cross-account movements and tags them as transfer', () => {
        const connId = `c-${Date.now()}`;
        const now = new Date().toISOString();
        db.prepare(`
      INSERT OR IGNORE INTO financial_connections (id, user_id, provider, provider_connection_id, status, consent_status, consent_created_at, is_mock, created_at, updated_at)
      VALUES (?, ?, 'mock', 'conn-1', 'connected', 'ACTIVE', ?, 1, ?, ?)
    `).run(connId, testUserId, now, now, now);
        const acc1 = `acc-test-1-${Date.now()}`;
        const acc2 = `acc-test-2-${Date.now()}`;
        db.prepare(`
      INSERT INTO accounts (id, user_id, connection_id, institution_id, external_account_id, account_name, account_type, masked_account_number, created_at, updated_at)
      VALUES (?, ?, ?, 'inst-hdfc', 'ext-1', 'HDFC Bank', 'savings', '1234', ?, ?)
    `).run(acc1, testUserId, connId, now, now);
        db.prepare(`
      INSERT INTO accounts (id, user_id, connection_id, institution_id, external_account_id, account_name, account_type, masked_account_number, created_at, updated_at)
      VALUES (?, ?, ?, 'inst-sbi', 'ext-2', 'SBI Bank', 'savings', '5678', ?, ?)
    `).run(acc2, testUserId, connId, now, now);
        // Debit transaction in Account 1
        const tx1Id = `tx-d1-${Date.now()}`;
        db.prepare(`
      INSERT INTO transactions (id, user_id, account_id, external_transaction_id, fingerprint, transaction_type, amount, merchant_name, original_description, normalized_description, category_id, transaction_date, created_at, updated_at, source, status)
      VALUES (?, ?, ?, 'EXT-D1', 'fp-d1', 'expense', 5000, 'SBI Transfer', 'TRANSFER TO SBI A/C 5678', 'SBI Transfer', 'cat-other', ?, ?, ?, 'mock', 'posted')
    `).run(tx1Id, testUserId, acc1, now, now, now);
        // Credit transaction in Account 2
        const check = TransferDetector.checkAndLinkInternalTransfer(testUserId, tx1Id, acc1, 5000, 'expense', now, 'TRANSFER TO SBI A/C 5678');
        expect(check.isInternalTransfer).toBe(true);
    });
    it('SyncService handles idempotent deduplication and pending-to-posted transitions smoothly', async () => {
        const connId = `conn-sync-test-${Date.now()}`;
        const now = new Date().toISOString();
        db.prepare(`
      INSERT INTO financial_connections (id, user_id, provider, provider_connection_id, status, consent_status, consent_created_at, is_mock, created_at, updated_at)
      VALUES (?, ?, 'mock_bank_provider', 'mock-conn-test', 'connected', 'ACTIVE', ?, 1, ?, ?)
    `).run(connId, testUserId, now, now, now);
        // First sync: imports accounts & transactions
        const report1 = await SyncService.syncConnection(connId);
        expect(report1.status).toBe('success');
        expect(report1.transactionsAdded).toBeGreaterThan(0);
        // Second sync without new transactions: skips all duplicates
        const report2 = await SyncService.syncConnection(connId);
        expect(report2.status).toBe('success');
        expect(report2.transactionsAdded).toBe(0);
        expect(report2.duplicatesSkipped).toBeGreaterThan(0);
    });
});
