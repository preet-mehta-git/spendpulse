import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { ReconciliationService } from '../services/reconciliationService.js';
export const reconciliationRouter = Router();
reconciliationRouter.use(AuthService.requireAuth);
reconciliationRouter.get('/logs', (req, res) => {
    const userId = req.user.id;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const logs = ReconciliationService.getLogs(userId, limit);
    res.json({ logs });
});
