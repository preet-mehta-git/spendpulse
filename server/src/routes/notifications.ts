import { Router } from 'express';
import { AuthService, AuthRequest } from '../services/authService.js';
import { NotificationService } from '../services/notificationService.js';

export const notificationsRouter = Router();

notificationsRouter.use(AuthService.requireAuth);

notificationsRouter.get('/', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const notifications = NotificationService.getNotifications(userId);
  res.json({ notifications });
});

notificationsRouter.post('/read-all', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  NotificationService.markAllRead(userId);
  res.json({ message: 'All notifications marked as read' });
});

notificationsRouter.get('/preferences', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const preferences = NotificationService.getPreferences(userId);
  res.json({ preferences });
});

notificationsRouter.patch('/preferences', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const updated = NotificationService.updatePreferences(userId, req.body);
  res.json({ preferences: updated });
});

notificationsRouter.get('/vapid-key', (req: AuthRequest, res) => {
  res.json({ publicKey: NotificationService.getVapidPublicKey() });
});

notificationsRouter.post('/subscribe', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Valid subscription object required' });
  }

  NotificationService.savePushSubscription(userId, subscription);
  res.status(201).json({ message: 'Push subscription saved' });
});

notificationsRouter.post('/test', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const sent = await NotificationService.notifyTransaction(userId, {
    id: `test-tx-${Date.now()}`,
    merchant_name: 'Swiggy',
    amount: 450,
    transaction_type: 'expense',
    category_name: 'Food & Dining',
    account_name: 'HDFC Bank'
  });

  res.json({ message: 'Test notification triggered', sent });
});
