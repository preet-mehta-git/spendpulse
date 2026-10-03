import crypto from 'crypto';
import { db } from '../db/database.js';
import { SmsParser, ParsedSmsTransaction } from './smsParser.js';
import { MerchantNormalizer } from './merchantNormalizer.js';
import { CategorizationEngine } from './categorizationEngine.js';
import { TransferDetector } from './transferDetector.js';
import { RecurringService } from './recurringService.js';
import { NotificationService } from './notificationService.js';
import { RealtimeStream } from './realtimeStream.js';

export interface MobileIngestPayload {
  text?: string;
  sms?: string;
  body?: string;
  sender?: string;
  amount?: number;
  merchant?: string;
  category_id?: string;
  account_id?: string;
  transaction_type?: 'expense' | 'income' | 'transfer';
  payment_mode?: string;
  reference_no?: string;
  transaction_date?: string;
  notes?: string;
  source?: string;
}

export interface IngestResult {
  status: 'created' | 'duplicate' | 'error';
  transaction?: any;
  duplicateSkipped?: boolean;
  parsedSummary?: ParsedSmsTransaction;
  message?: string;
}

export class MobileSyncService {
  /**
   * Ensure user has an active Android Realtime Sync connection and return or create an account
   */
  public static resolveOrCreateAccount(
    userId: string,
    bankIdentifier?: string,
    bankName?: string,
    maskedAccount?: string
  ): { accountId: string; accountName: string } {
    const now = new Date().toISOString();

    // 1. Check if user already has an account matching the masked number
    if (maskedAccount) {
      const cleanMask = maskedAccount.replace(/[*xX]/g, '');
      const existing = db.prepare(`
        SELECT id, account_name FROM accounts 
        WHERE user_id = ? AND masked_account_number LIKE ?
      `).get(userId, `%${cleanMask}%`) as { id: string; account_name: string } | undefined;

      if (existing) {
        return { accountId: existing.id, accountName: existing.account_name };
      }
    }

    // 2. Find or create the Android Sync Financial Connection
    let conn = db.prepare(`
      SELECT id FROM financial_connections 
      WHERE user_id = ? AND provider = 'android_sms_sync'
    `).get(userId) as { id: string } | undefined;

    if (!conn) {
      const connId = `conn-android-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO financial_connections (
          id, user_id, provider, provider_connection_id, status, consent_status, consent_created_at, is_mock, created_at, updated_at
        ) VALUES (?, ?, 'android_sms_sync', 'android-device-sync', 'connected', 'ACTIVE', ?, 0, ?, ?)
      `).run(connId, userId, now, now, now);
      conn = { id: connId };
    }

    // 3. Match institution
    let instId = 'inst-hdfc';
    if (bankIdentifier) {
      const foundInst = db.prepare('SELECT id FROM financial_institutions WHERE identifier = ?').get(bankIdentifier) as { id: string } | undefined;
      if (foundInst) {
        instId = foundInst.id;
      }
    }

    const defaultAccName = bankName 
      ? `${bankName} (${maskedAccount || 'Mobile'})` 
      : `Android Linked Account (${maskedAccount || 'Mobile'})`;

    // 4. Create new Account under the Android connection
    const newAccId = `acc-mob-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO accounts (
        id, user_id, connection_id, institution_id, external_account_id, account_name, account_type, masked_account_number, currency, current_balance, available_balance, last_synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INR', 25000, 25000, ?, ?, ?)
    `).run(
      newAccId,
      userId,
      conn.id,
      instId,
      `ext-mob-${Date.now()}`,
      defaultAccName,
      'savings',
      maskedAccount || '****',
      now,
      now,
      now
    );

    return { accountId: newAccId, accountName: defaultAccName };
  }

  /**
   * Main ingest pipeline for mobile SMS / Webhook / Quick Add
   */
  public static async ingestTransaction(userId: string, payload: MobileIngestPayload): Promise<IngestResult> {
    const rawText = payload.text || payload.sms || payload.body || '';
    const now = new Date().toISOString();

    let parsed: ParsedSmsTransaction | null = null;
    if (rawText) {
      parsed = SmsParser.parse(rawText, payload.sender);
    }

    // Fallbacks if structured payload is supplied
    const amount = payload.amount !== undefined ? Number(payload.amount) : (parsed?.amount || 0);
    if (!amount || isNaN(amount) || amount <= 0) {
      return {
        status: 'error',
        message: 'Could not extract a valid transaction amount from payload.'
      };
    }

    const rawMerchant = payload.merchant || parsed?.merchantName || 'Direct Transaction';
    const normRes = MerchantNormalizer.normalize(rawMerchant);
    const merchantName = normRes.merchantName || rawMerchant;

    const txType: 'expense' | 'income' | 'transfer' = 
      payload.transaction_type || parsed?.transactionType || 'expense';

    const paymentMode = payload.payment_mode || parsed?.paymentMode || normRes.paymentMode || 'UPI';
    const referenceNo = payload.reference_no || parsed?.referenceNo || `MOB-${Date.now()}`;
    const txDate = payload.transaction_date || parsed?.transactionDate || now;
    const narration = rawText || payload.notes || `${merchantName} • ${paymentMode}`;

    // Resolve Account
    let accountId = payload.account_id;
    let accountName = '';

    if (accountId) {
      const acc = db.prepare('SELECT account_name FROM accounts WHERE id = ? AND user_id = ?').get(accountId, userId) as { account_name: string } | undefined;
      if (acc) {
        accountName = acc.account_name;
      } else {
        accountId = undefined;
      }
    }

    if (!accountId) {
      // Pick first existing account or create one matching bank
      const existingAcc = db.prepare('SELECT id, account_name FROM accounts WHERE user_id = ? LIMIT 1').get(userId) as { id: string; account_name: string } | undefined;
      if (parsed?.maskedAccount || parsed?.bankIdentifier) {
        const resolved = this.resolveOrCreateAccount(userId, parsed.bankIdentifier, parsed.bankName, parsed.maskedAccount);
        accountId = resolved.accountId;
        accountName = resolved.accountName;
      } else if (existingAcc) {
        accountId = existingAcc.id;
        accountName = existingAcc.account_name;
      } else {
        const resolved = this.resolveOrCreateAccount(userId);
        accountId = resolved.accountId;
        accountName = resolved.accountName;
      }
    }

    // Compute Fingerprint & External ID
    const externalTxId = referenceNo ? `EXT-${referenceNo}` : `EXT-MOB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fingerprintStr = `${accountId}|${amount}|${txDate.slice(0, 10)}|${merchantName}|${txType}|${referenceNo}`;
    const fingerprint = crypto.createHash('sha256').update(fingerprintStr).digest('hex');

    // Check Deduplication
    const existingTx = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, a.account_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN accounts a ON t.account_id = a.id
      WHERE (t.account_id = ? AND t.external_transaction_id = ?)
         OR (t.user_id = ? AND t.fingerprint = ?)
    `).get(accountId, externalTxId, userId, fingerprint);

    if (existingTx) {
      return {
        status: 'duplicate',
        duplicateSkipped: true,
        transaction: existingTx,
        parsedSummary: parsed || undefined,
        message: `Transaction for ₹${amount} at ${merchantName} was already recorded.`
      };
    }

    // Categorization
    let categoryId = payload.category_id;
    let catMethod = 'manual';
    let confScore = 1.0;
    let isRecurring = 0;

    if (!categoryId) {
      const catRes = CategorizationEngine.categorize(userId, merchantName, narration, amount, txType);
      categoryId = catRes.categoryId;
      catMethod = catRes.categorizationMethod;
      confScore = catRes.confidenceScore;
      isRecurring = catRes.isRecurring ? 1 : 0;
    }

    const txId = `tx-mob-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const source = payload.source || (rawText ? 'android_sms_webhook' : 'android_pwa_quick');

    db.prepare(`
      INSERT INTO transactions (
        id, user_id, account_id, external_transaction_id, fingerprint, transaction_type, amount, currency, merchant_name, original_description, normalized_description, category_id, transaction_date, posted_date, created_at, updated_at, source, status, is_recurring, confidence_score, categorization_method, payment_mode, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?, ?)
    `).run(
      txId,
      userId,
      accountId,
      externalTxId,
      fingerprint,
      txType,
      amount,
      merchantName,
      narration,
      `${merchantName} • ${paymentMode}`,
      categoryId,
      txDate,
      txDate,
      now,
      now,
      source,
      isRecurring,
      confScore,
      catMethod,
      paymentMode,
      payload.notes || (parsed?.remainingBalance ? `Balance after txn: ₹${parsed.remainingBalance}` : null)
    );

    // Balance update
    if (parsed?.remainingBalance !== undefined) {
      db.prepare(`
        UPDATE accounts 
        SET current_balance = ?, available_balance = ?, last_synced_at = ?, updated_at = ? 
        WHERE id = ?
      `).run(parsed.remainingBalance, parsed.remainingBalance, now, now, accountId);
    } else {
      const balanceDelta = txType === 'expense' ? -amount : (txType === 'income' ? amount : 0);
      if (balanceDelta !== 0) {
        db.prepare(`
          UPDATE accounts 
          SET current_balance = current_balance + ?, available_balance = available_balance + ?, last_synced_at = ?, updated_at = ? 
          WHERE id = ?
        `).run(balanceDelta, balanceDelta, now, now, accountId);
      }
    }

    // Inter-account transfer check
    TransferDetector.checkAndLinkInternalTransfer(
      userId,
      txId,
      accountId,
      amount,
      txType,
      txDate,
      narration
    );

    // Refresh Subscriptions
    RecurringService.detectAndRefreshSubscriptions(userId);

    // Fetch full saved transaction record for client response
    const savedTx = db.prepare(`
      SELECT 
        t.*, 
        c.name as category_name, 
        c.slug as category_slug, 
        c.icon as category_icon, 
        c.color as category_color,
        a.account_name, 
        a.masked_account_number
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN accounts a ON t.account_id = a.id
      WHERE t.id = ?
    `).get(txId) as any;

    // Send push notification & sound
    NotificationService.notifyTransaction(userId, {
      id: txId,
      merchant_name: merchantName,
      amount,
      transaction_type: txType,
      category_name: savedTx?.category_name,
      account_name: savedTx?.account_name
    }).catch(() => {});

    // Broadcast Real-time Server-Sent Event (SSE) to all connected UI clients
    RealtimeStream.broadcastToUser(userId, 'transaction_created', {
      transaction: savedTx,
      message: `Recorded ₹${amount.toLocaleString('en-IN')} at ${merchantName} from Android.`
    });

    return {
      status: 'created',
      transaction: savedTx,
      duplicateSkipped: false,
      parsedSummary: parsed || undefined,
      message: `Successfully recorded ₹${amount.toLocaleString('en-IN')} at ${merchantName}.`
    };
  }
}
