import { Router } from 'express';
import { AuthService, AuthRequest } from '../services/authService.js';
import { RecurringService } from '../services/recurringService.js';

export const recurringRouter = Router();

recurringRouter.use(AuthService.requireAuth);

recurringRouter.get('/', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const result = RecurringService.getSubscriptions(userId);
  res.json(result);
});

recurringRouter.post('/detect', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const subs = RecurringService.detectAndRefreshSubscriptions(userId);
  res.json({ subscriptions: subs });
});
