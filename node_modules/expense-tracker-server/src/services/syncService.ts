import crypto from 'crypto';
import { db } from '../db/database.js';
import { FinancialDataProvider } from '../providers/FinancialDataProvider.js';
import { MockFinancialProvider } from '../providers/MockFinancialProvider.js';
import { AccountAggregatorProvider } from '../providers/AccountAggregatorProvider.js';
import { MerchantNormalizer } from './merchantNormalizer.js';
import { CategorizationEngine } from './categorizationEngine.js';
import { TransferDetector } from './transferDetector.js';
import { ReconciliationService } from './reconciliationService.js';
import { RecurringService } from './recurringService.js';
import { NotificationService } from './notificationService.js';
import { FinancialConnection } from '../types/index.js';

export interface SyncReport {
  connectionId: string;
  provider: string;
  status: 'success' | 'failed';
  accountsProcessed: number;
  transactionsAdded: number;
  transactionsUpdated: number;
  duplicatesSkipped: number;
  discrepanciesCount: number;
  syncedAt: string;
  errorMessage?: string;
}

export class SyncService {
  private static getProviderInstance(providerName: string): FinancialDataProvider {
    if (providerName === 'mock_bank_provider' || providerName === 'mock') {
      return new MockFinancialProvider();
    }
    if (providerName === 'setu_account_aggregator' || providerName === 'setu' || providerName === 'aa') {
      return new AccountAggregatorProvider();
    }
    return new MockFinancialProvider();
  }

  public static async syncConnection(connectionId: string): Promise<SyncReport> {
    const connection = db.prepare(`
      SELECT * FROM financial_connections WHERE id = ?
    `).get(connectionId) as FinancialConnection | undefined;

    if (!connection) {
      throw new Error(`Connection not found for ID: ${connectionId}`);
    }

    const userId = connection.user_id;
    const provider = this.getProviderInstance(connection.provider);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE financial_connections 
      SET last_sync_attempt = ? 
      WHERE id = ?
    `).run(now, connectionId);

    let addedCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;
    const discrepancies: any[] = [];

    try {
      // 1. Fetch data from provider (using a 7-day lookback overlap to catch pending->posted updates)
      const lookbackDate = connection.last_successful_sync
        ? new Date(new Date(connection.last_successful_sync).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const batch = await provider.fetchTransactions(
        connection.provider_connection_id,
        undefined,
        lookbackDate
      );

      // 2. Upsert Accounts
      const accountMap = new Map<string, string>(); // externalAccountId -> internalAccountId

      for (const providerAcc of batch.accounts) {
        let existingAcc = db.prepare(`
          SELECT id, current_balance FROM accounts 
          WHERE user_id = ? AND connection_id = ? AND external_account_id = ?
        `).get(userId, connectionId, providerAcc.externalAccountId) as { id: string; current_balance: number } | undefined;

        // Choose default institution matching bank name or default
        let instId = 'inst-hdfc';
        if (/ICICI/i.test(providerAcc.accountName)) instId = 'inst-icici';
        else if (/SBI/i.test(providerAcc.accountName)) instId = 'inst-sbi';
        else if (/AXIS/i.test(providerAcc.accountName)) instId = 'inst-axis';

        let internalAccId: string;
        if (existingAcc) {
          internalAccId = existingAcc.id;
          // Check for unexpected ledger balance jumps for reconciliation
          if (Math.abs(existingAcc.current_balance - providerAcc.currentBalance) > 100000) {
            discrepancies.push({
              type: 'balance_mismatch',
              message: `High balance variation in ${providerAcc.accountName}: previous ₹${existingAcc.current_balance}, new ₹${providerAcc.currentBalance}`
            });
          }

          db.prepare(`
            UPDATE accounts 
            SET current_balance = ?, available_balance = ?, last_synced_at = ?, updated_at = ? 
            WHERE id = ?
          `).run(providerAcc.currentBalance, providerAcc.availableBalance, now, now, internalAccId);
        } else {
          internalAccId = `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          db.prepare(`
            INSERT INTO accounts (
              id, user_id, connection_id, institution_id, external_account_id, account_name, account_type, masked_account_number, currency, current_balance, available_balance, last_synced_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            internalAccId,
            userId,
            connectionId,
            instId,
            providerAcc.externalAccountId,
            providerAcc.accountName,
            providerAcc.accountType,
            providerAcc.maskedAccountNumber,
            providerAcc.currency || 'INR',
            providerAcc.currentBalance,
            providerAcc.availableBalance,
            now,
            now,
            now
          );
        }

        accountMap.set(providerAcc.externalAccountId, internalAccId);
      }

      // 3. Process and Synchronize Transactions
      for (const group of batch.transactions) {
        const internalAccId = accountMap.get(group.accountId);
        if (!internalAccId) continue;

        for (const rawTx of group.items) {
          // Compute robust SHA-256 fingerprint fallback
          const normalizedRes = MerchantNormalizer.normalize(rawTx.narration, rawTx.mode);
          const fingerprintString = `${internalAccId}|${rawTx.amount}|${rawTx.transaction_timestamp.slice(0, 10)}|${normalizedRes.merchantName}|${rawTx.type}|${rawTx.reference_no || ''}`;
          const fingerprint = crypto.createHash('sha256').update(fingerprintString).digest('hex');

          // Check if transaction already exists by external_transaction_id OR fingerprint
          const existingTx = db.prepare(`
            SELECT id, status, amount, transaction_type, category_id 
            FROM transactions 
            WHERE (account_id = ? AND external_transaction_id = ?) 
               OR (user_id = ? AND fingerprint = ?)
          `).get(internalAccId, rawTx.external_transaction_id, userId, fingerprint) as {
            id: string;
            status: string;
            amount: number;
            transaction_type: string;
            category_id: string;
          } | undefined;

          if (existingTx) {
            // Check for status transition: e.g. 'pending' -> 'posted' or 'posted' -> 'refunded'
            const rawStatus = rawTx.status || 'posted';
            if (existingTx.status !== rawStatus) {
              db.prepare(`
                UPDATE transactions 
                SET status = ?, posted_date = ?, updated_at = ? 
                WHERE id = ?
              `).run(rawStatus, rawStatus === 'posted' ? now : null, now, existingTx.id);

              updatedCount++;
              discrepancies.push({
                type: 'modified',
                message: `Transaction ${rawTx.external_transaction_id} status updated from ${existingTx.status} to ${rawStatus}`,
                externalId: rawTx.external_transaction_id
              });
            } else {
              duplicateCount++;
            }
            continue;
          }

          // New transaction: run Categorization Pipeline
          const catResult = CategorizationEngine.categorize(
            userId,
            normalizedRes.merchantName,
            rawTx.narration,
            rawTx.amount,
            rawTx.type
          );

          const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
          const txStatus = rawTx.status || 'posted';

          db.prepare(`
            INSERT INTO transactions (
              id, user_id, account_id, external_transaction_id, fingerprint, transaction_type, amount, currency, merchant_name, original_description, normalized_description, category_id, transaction_date, posted_date, created_at, updated_at, source, status, is_recurring, confidence_score, categorization_method, payment_mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            txId,
            userId,
            internalAccId,
            rawTx.external_transaction_id,
            fingerprint,
            catResult.transactionType,
            rawTx.amount,
            rawTx.currency || 'INR',
            normalizedRes.merchantName,
            rawTx.narration,
            normalizedRes.normalizedDescription,
            catResult.categoryId,
            rawTx.transaction_timestamp,
            txStatus === 'posted' ? rawTx.transaction_timestamp : null,
            now,
            now,
            connection.provider,
            txStatus,
            catResult.isRecurring ? 1 : 0,
            catResult.confidenceScore,
            catResult.categorizationMethod,
            normalizedRes.paymentMode
          );

          addedCount++;

          // Check and link internal transfers
          TransferDetector.checkAndLinkInternalTransfer(
            userId,
            txId,
            internalAccId,
            rawTx.amount,
            catResult.transactionType,
            rawTx.transaction_timestamp,
            rawTx.narration
          );

          // Trigger Push Notification for newly detected transaction
          const accDetails = db.prepare('SELECT account_name FROM accounts WHERE id = ?').get(internalAccId) as { account_name: string } | undefined;
          const catDetails = db.prepare('SELECT name FROM categories WHERE id = ?').get(catResult.categoryId) as { name: string } | undefined;

          NotificationService.notifyTransaction(userId, {
            id: txId,
            merchant_name: normalizedRes.merchantName,
            amount: rawTx.amount,
            transaction_type: catResult.transactionType,
            category_name: catDetails?.name,
            account_name: accDetails?.account_name
          }).catch(() => {});
        }
      }

      // 4. Update Recurring Subscriptions
      RecurringService.detectAndRefreshSubscriptions(userId);

      // 5. Log Reconciliation Audit Entry
      ReconciliationService.logReconciliation(connectionId, userId, {
        checkedCount: addedCount + updatedCount + duplicateCount,
        missingCount: 0,
        duplicateCount,
        updatedCount,
        discrepancyDetails: discrepancies
      });

      // 6. Mark successful sync
      db.prepare(`
        UPDATE financial_connections 
        SET status = 'connected', 
            last_successful_sync = ?, 
            error_code = NULL, 
            error_message = NULL, 
            updated_at = ? 
        WHERE id = ?
      `).run(now, now, connectionId);

      return {
        connectionId,
        provider: connection.provider,
        status: 'success',
        accountsProcessed: batch.accounts.length,
        transactionsAdded: addedCount,
        transactionsUpdated: updatedCount,
        duplicatesSkipped: duplicateCount,
        discrepanciesCount: discrepancies.length,
        syncedAt: now
      };
    } catch (err: any) {
      // Record failed sync attempt
      db.prepare(`
        UPDATE financial_connections 
        SET status = 'error', 
            error_code = 'SYNC_FAILURE', 
            error_message = ?, 
            updated_at = ? 
        WHERE id = ?
      `).run(err.message || 'Unknown sync failure', now, connectionId);

      return {
        connectionId,
        provider: connection.provider,
        status: 'failed',
        accountsProcessed: 0,
        transactionsAdded: 0,
        transactionsUpdated: 0,
        duplicatesSkipped: 0,
        discrepanciesCount: 0,
        syncedAt: now,
        errorMessage: err.message
      };
    }
  }

  public static async syncAllConnections(userId: string): Promise<SyncReport[]> {
    const connections = db.prepare(`
      SELECT id FROM financial_connections WHERE user_id = ? AND status != 'disconnected'
    `).all(userId) as Array<{ id: string }>;

    const reports: SyncReport[] = [];
    for (const conn of connections) {
      const rep = await this.syncConnection(conn.id);
      reports.push(rep);
    }
    return reports;
  }
}
