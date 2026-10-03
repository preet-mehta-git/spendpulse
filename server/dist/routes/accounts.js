import { Router } from 'express';
import { db } from '../db/database.js';
import { AuthService } from '../services/authService.js';
export const accountsRouter = Router();
accountsRouter.use(AuthService.requireAuth);
accountsRouter.get('/', (req, res) => {
    const userId = req.user.id;
    const accounts = db.prepare(`
    SELECT a.*, i.name as institution_name, i.logo as institution_logo, i.identifier as institution_identifier,
           c.provider, c.is_mock, c.last_successful_sync
    FROM accounts a
    JOIN financial_institutions i ON a.institution_id = i.id
    JOIN financial_connections c ON a.connection_id = c.id
    WHERE a.user_id = ?
    ORDER BY a.created_at ASC
  `).all(userId);
    res.json({ accounts });
});
accountsRouter.get('/:id', (req, res) => {
    const userId = req.user.id;
    const account = db.prepare(`
    SELECT a.*, i.name as institution_name, i.logo as institution_logo,
           c.provider, c.is_mock, c.last_successful_sync
    FROM accounts a
    JOIN financial_institutions i ON a.institution_id = i.id
    JOIN financial_connections c ON a.connection_id = c.id
    WHERE a.id = ? AND a.user_id = ?
  `).get(req.params.id, userId);
    if (!account) {
        return res.status(404).json({ error: 'Account not found' });
    }
    res.json({ account });
});
