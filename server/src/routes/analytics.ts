import { Router } from 'express';
import { AuthService, AuthRequest } from '../services/authService.js';
import { AnalyticsService } from '../services/analyticsService.js';

export const analyticsRouter = Router();

analyticsRouter.use(AuthService.requireAuth);

analyticsRouter.get('/dashboard', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const monthYear = req.query.monthYear as string | undefined;
  const metrics = AnalyticsService.getDashboardMetrics(userId, monthYear);
  res.json(metrics);
});

analyticsRouter.get('/trends', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const months = req.query.months ? Number(req.query.months) : 6;
  const trends = AnalyticsService.getCashflowTrends(userId, months);
  res.json({ trends });
});
