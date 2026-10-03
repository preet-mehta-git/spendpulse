import { db } from '../db/database.js';
import webpush from 'web-push';
import { NotificationPreference, NotificationRecord } from '../types/index.js';

// VAPID keys setup (can be overridden via env)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'UUxI8W_s9kVf1B1L1L_3fW9H1l7N-0Q3J8X9v4k6Y2Q';

try {
  webpush.setVapidDetails(
    'mailto:personal-finance@tracker.local',
    vapidPublicKey,
    vapidPrivateKey
  );
} catch (e) {
  // Graceful fallback for offline / mock testing
}

export class NotificationService {
  public static getVapidPublicKey(): string {
    return vapidPublicKey;
  }

  public static getPreferences(userId: string): NotificationPreference {
    let prefs = db.prepare(`
      SELECT * FROM notification_preferences WHERE user_id = ?
    `).get(userId) as NotificationPreference | undefined;

    if (!prefs) {
      const id = `pref-${userId}`;
      db.prepare(`
        INSERT INTO notification_preferences (
          id, user_id, enabled, min_amount, income_enabled, transfer_enabled, budget_alerts, large_tx_alert, large_tx_threshold
        ) VALUES (?, ?, 1, 0, 1, 0, 1, 1, 5000)
      `).run(id, userId);

      prefs = {
        id,
        user_id: userId,
        enabled: 1,
        min_amount: 0,
        income_enabled: 1,
        transfer_enabled: 0,
        budget_alerts: 1,
        large_tx_alert: 1,
        large_tx_threshold: 5000
      };
    }

    return prefs;
  }

  public static updatePreferences(userId: string, updates: Partial<NotificationPreference>): NotificationPreference {
    const current = this.getPreferences(userId);
    const updated = { ...current, ...updates };

    db.prepare(`
      UPDATE notification_preferences 
      SET enabled = @enabled, 
          min_amount = @min_amount, 
          income_enabled = @income_enabled, 
          transfer_enabled = @transfer_enabled, 
          budget_alerts = @budget_alerts, 
          large_tx_alert = @large_tx_alert, 
          large_tx_threshold = @large_tx_threshold 
      WHERE user_id = @user_id
    `).run({
      enabled: updated.enabled ? 1 : 0,
      min_amount: updated.min_amount,
      income_enabled: updated.income_enabled ? 1 : 0,
      transfer_enabled: updated.transfer_enabled ? 1 : 0,
      budget_alerts: updated.budget_alerts ? 1 : 0,
      large_tx_alert: updated.large_tx_alert ? 1 : 0,
      large_tx_threshold: updated.large_tx_threshold,
      user_id: userId
    });

    return updated;
  }

  public static savePushSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    const id = `push-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth
    `).run(id, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, new Date().toISOString());
  }

  public static async notifyTransaction(
    userId: string,
    transaction: {
      id: string;
      merchant_name: string;
      amount: number;
      transaction_type: 'expense' | 'income' | 'transfer' | 'refund' | 'cash_withdrawal' | 'cash_deposit' | 'fee' | 'interest' | 'unknown';
      category_name?: string;
      account_name?: string;
    }
  ): Promise<boolean> {
    const prefs = this.getPreferences(userId);
    if (!prefs.enabled) return false;

    // Check transaction type filters
    if (transaction.transaction_type === 'income' && !prefs.income_enabled) return false;
    if (transaction.transaction_type === 'transfer' && !prefs.transfer_enabled) return false;
    if (transaction.amount < prefs.min_amount) return false;

    // Deduplication check: Has a notification already been recorded for this transaction?
    const existing = db.prepare(`
      SELECT id FROM notifications 
      WHERE user_id = ? AND transaction_id = ? AND type = ?
    `).get(userId, transaction.id, transaction.transaction_type);

    if (existing) {
      return false; // Prevent duplicate notification
    }

    // Format title & body
    let title = '';
    let body = '';
    const formattedAmount = `₹${transaction.amount.toLocaleString('en-IN')}`;

    if (transaction.transaction_type === 'income') {
      title = `💰 ${formattedAmount} received`;
      body = `${transaction.merchant_name} • ${transaction.account_name || 'Bank Account'}`;
    } else if (transaction.transaction_type === 'transfer') {
      title = `🔄 ${formattedAmount} transferred`;
      body = `${transaction.merchant_name} • Internal Transfer`;
    } else if (transaction.transaction_type === 'refund') {
      title = `↩️ ${formattedAmount} refunded`;
      body = `${transaction.merchant_name} • Refund received`;
    } else if (prefs.large_tx_alert && transaction.amount >= prefs.large_tx_threshold) {
      title = `⚠️ High value: ${formattedAmount} spent`;
      body = `${transaction.merchant_name} • ${transaction.category_name || 'Expense'}`;
    } else {
      title = `🔔 ${formattedAmount} spent at ${transaction.merchant_name}`;
      body = `${transaction.category_name || 'Expense'} • Today`;
    }

    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // Persist notification record
    db.prepare(`
      INSERT INTO notifications (id, user_id, transaction_id, type, title, body, sent_at, status, read)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', 0)
    `).run(notifId, userId, transaction.id, transaction.transaction_type, title, body, now);

    // Send Web Push to registered devices
    const subscriptions = db.prepare(`
      SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?
    `).all(userId) as Array<{ endpoint: string; p256dh: string; auth: string }>;

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: {
        url: '/transactions',
        transactionId: transaction.id
      }
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Expired subscription, remove
          db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
        }
      }
    }

    return true;
  }

  public static getNotifications(userId: string, limit: number = 30): NotificationRecord[] {
    return db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY sent_at DESC 
      LIMIT ?
    `).all(userId, limit) as NotificationRecord[];
  }

  public static markAllRead(userId: string) {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
  }
}
