import { Router } from 'express';
import { db } from '../db/database.js';
import { AuthService } from '../services/authService.js';
import { SyncService } from '../services/syncService.js';
export const syncRouter = Router();
syncRouter.use(AuthService.requireAuth);
syncRouter.post('/all', async (req, res) => {
    try {
        const userId = req.user.id;
        const reports = await SyncService.syncAllConnections(userId);
        res.json({ reports });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
syncRouter.post('/:connectionId', async (req, res) => {
    try {
        const userId = req.user.id;
        const connectionId = Array.isArray(req.params.connectionId) ? req.params.connectionId[0] : req.params.connectionId;
        const conn = db.prepare('SELECT id FROM financial_connections WHERE id = ? AND user_id = ?').get(connectionId, userId);
        if (!conn) {
            return res.status(404).json({ error: 'Connection not found' });
        }
        const report = await SyncService.syncConnection(connectionId);
        res.json({ report });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
syncRouter.get('/status', (req, res) => {
    const userId = req.user.id;
    const connections = db.prepare(`
    SELECT id, provider, status, is_mock, last_successful_sync, last_sync_attempt, error_message
    FROM financial_connections
    WHERE user_id = ?
  `).all(userId);
    const latestSync = db.prepare(`
    SELECT MAX(last_successful_sync) as last_sync 
    FROM financial_connections 
    WHERE user_id = ?
  `).get(userId);
    res.json({
        lastSyncTime: latestSync?.last_sync || null,
        connections
    });
});
