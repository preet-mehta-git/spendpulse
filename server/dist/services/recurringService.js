import { db } from '../db/database.js';
export class RecurringService {
    /**
     * Scans user's transactions and identifies patterns with repeated intervals or known subscriptions.
     */
    static detectAndRefreshSubscriptions(userId) {
        // 1. Find transactions grouped by merchant with 2 or more occurrences
        const merchantGroups = db.prepare(`
      SELECT merchant_name, account_id, category_id, COUNT(*) as tx_count, AVG(amount) as avg_amount
      FROM transactions
      WHERE user_id = ? AND transaction_type = 'expense'
      GROUP BY merchant_name, account_id, category_id
      HAVING tx_count >= 1
    `).all(userId);
        const subscriptions = [];
        const now = new Date();
        for (const group of merchantGroups) {
            // Check if known recurring merchant or marked is_recurring
            const recentTxns = db.prepare(`
        SELECT id, amount, transaction_date, is_recurring 
        FROM transactions 
        WHERE user_id = ? AND merchant_name = ? AND account_id = ?
        ORDER BY transaction_date DESC
        LIMIT 5
      `).all(userId, group.merchant_name, group.account_id);
            if (recentTxns.length === 0)
                continue;
            const latest = recentTxns[0];
            const isKnownSub = /NETFLIX|SPOTIFY|PRIME|YOUTUBE|APPLE|HOTSTAR|JIO|AIRTEL|BROADBAND|ACT FIBERNET|OPENAI|GITHUB|CULT|FITNESS|SUBSCRIPTION/i.test(group.merchant_name);
            if (isKnownSub || latest.is_recurring === 1 || recentTxns.length >= 2) {
                // Calculate frequency and next expected date
                let frequency = 'monthly';
                let daysInterval = 30;
                if (recentTxns.length >= 2) {
                    const d1 = new Date(recentTxns[0].transaction_date).getTime();
                    const d2 = new Date(recentTxns[1].transaction_date).getTime();
                    const diffDays = Math.abs(Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
                    if (diffDays >= 6 && diffDays <= 8) {
                        frequency = 'weekly';
                        daysInterval = 7;
                    }
                    else if (diffDays >= 25 && diffDays <= 35) {
                        frequency = 'monthly';
                        daysInterval = 30;
                    }
                    else if (diffDays >= 80 && diffDays <= 100) {
                        frequency = 'quarterly';
                        daysInterval = 90;
                    }
                    else if (diffDays >= 350 && diffDays <= 380) {
                        frequency = 'annual';
                        daysInterval = 365;
                    }
                }
                const lastDate = new Date(latest.transaction_date);
                const nextDate = new Date(lastDate.getTime() + daysInterval * 24 * 60 * 60 * 1000);
                const nextDateStr = nextDate.toISOString().split('T')[0];
                const amount = Math.round(latest.amount);
                let annualCost = amount * 12;
                if (frequency === 'weekly')
                    annualCost = amount * 52;
                else if (frequency === 'quarterly')
                    annualCost = amount * 4;
                else if (frequency === 'annual')
                    annualCost = amount;
                const subId = `sub-${userId}-${group.merchant_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                // Upsert subscription
                db.prepare(`
          INSERT INTO recurring_subscriptions (
            id, user_id, account_id, merchant_name, amount, currency, frequency, last_charge_date, next_expected_date, category_id, active, annual_cost, created_at
          ) VALUES (?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            amount = excluded.amount,
            frequency = excluded.frequency,
            last_charge_date = excluded.last_charge_date,
            next_expected_date = excluded.next_expected_date,
            annual_cost = excluded.annual_cost
        `).run(subId, userId, group.account_id, group.merchant_name, amount, frequency, latest.transaction_date, nextDateStr, group.category_id, annualCost, new Date().toISOString());
                subscriptions.push({
                    id: subId,
                    user_id: userId,
                    account_id: group.account_id,
                    merchant_name: group.merchant_name,
                    amount,
                    currency: 'INR',
                    frequency,
                    last_charge_date: latest.transaction_date,
                    next_expected_date: nextDateStr,
                    category_id: group.category_id,
                    active: 1,
                    annual_cost: annualCost
                });
            }
        }
        return subscriptions;
    }
    static getSubscriptions(userId) {
        const items = db.prepare(`
      SELECT r.*, c.name as category_name
      FROM recurring_subscriptions r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND r.active = 1
      ORDER BY r.amount DESC
    `).all(userId);
        let monthlyTotal = 0;
        let annualTotal = 0;
        for (const sub of items) {
            annualTotal += sub.annual_cost;
            if (sub.frequency === 'monthly')
                monthlyTotal += sub.amount;
            else if (sub.frequency === 'quarterly')
                monthlyTotal += sub.amount / 3;
            else if (sub.frequency === 'annual')
                monthlyTotal += sub.amount / 12;
            else if (sub.frequency === 'weekly')
                monthlyTotal += sub.amount * 4.33;
        }
        return {
            items,
            monthlyTotal: Math.round(monthlyTotal),
            annualTotal: Math.round(annualTotal)
        };
    }
}
