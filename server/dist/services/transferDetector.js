import { db } from '../db/database.js';
export class TransferDetector {
    /**
     * Evaluates whether a transaction is an internal transfer between user's accounts.
     * If matched with another account, updates both to 'transfer' type and links transfer_account_id.
     */
    static checkAndLinkInternalTransfer(userId, transactionId, accountId, amount, type, transactionDate, rawDescription) {
        // 1. Check if description denotes a transfer or payment to another account
        const isSelfTransferHint = /SELF|OWN A\/C|TRANSFER TO|TRF TO|TO A\/C|CREDIT CARD PMT|CRED BILL|CARD PAYMENT/i.test(rawDescription);
        // 2. Query user's other accounts
        const otherAccounts = db.prepare(`
      SELECT id, account_name, masked_account_number 
      FROM accounts 
      WHERE user_id = ? AND id != ?
    `).all(userId, accountId);
        if (otherAccounts.length === 0) {
            return { isInternalTransfer: false };
        }
        // 3. Search for a matching counterpart transaction in user's other accounts within +/- 2 days
        const dateObj = new Date(transactionDate);
        const minDate = new Date(dateObj.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const maxDate = new Date(dateObj.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
        const counterpart = db.prepare(`
      SELECT id, account_id 
      FROM transactions 
      WHERE user_id = ? 
        AND account_id != ? 
        AND ABS(amount - ?) < 0.01 
        AND transaction_date >= ? 
        AND transaction_date <= ?
        AND id != ?
        AND (transfer_account_id IS NULL OR transfer_account_id = ?)
      ORDER BY ABS(strftime('%s', transaction_date) - strftime('%s', ?)) ASC
      LIMIT 1
    `).get(userId, accountId, amount, minDate, maxDate, transactionId, accountId, transactionDate);
        if (counterpart) {
            // Cross-link both transactions
            db.prepare(`
        UPDATE transactions 
        SET transaction_type = 'transfer', 
            category_id = 'cat-transfer', 
            transfer_account_id = ? 
        WHERE id = ?
      `).run(counterpart.account_id, transactionId);
            db.prepare(`
        UPDATE transactions 
        SET transaction_type = 'transfer', 
            category_id = 'cat-transfer', 
            transfer_account_id = ? 
        WHERE id = ?
      `).run(accountId, counterpart.id);
            return { isInternalTransfer: true, targetAccountId: counterpart.account_id };
        }
        if (isSelfTransferHint) {
            // Find likely target account by partial number matching or card keyword
            let likelyTarget = otherAccounts[0]?.id;
            for (const acc of otherAccounts) {
                const last4 = acc.masked_account_number.slice(-4);
                if (last4 && rawDescription.includes(last4)) {
                    likelyTarget = acc.id;
                    break;
                }
            }
            db.prepare(`
        UPDATE transactions 
        SET transaction_type = 'transfer', 
            category_id = 'cat-transfer', 
            transfer_account_id = ? 
        WHERE id = ?
      `).run(likelyTarget, transactionId);
            return { isInternalTransfer: true, targetAccountId: likelyTarget };
        }
        return { isInternalTransfer: false };
    }
}
