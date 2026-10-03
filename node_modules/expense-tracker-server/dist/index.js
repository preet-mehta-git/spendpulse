import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { authRouter } from './routes/auth.js';
import { accountsRouter } from './routes/accounts.js';
import { connectionsRouter } from './routes/connections.js';
import { transactionsRouter } from './routes/transactions.js';
import { syncRouter } from './routes/sync.js';
import { budgetsRouter } from './routes/budgets.js';
import { recurringRouter } from './routes/recurring.js';
import { analyticsRouter } from './routes/analytics.js';
import { reconciliationRouter } from './routes/reconciliation.js';
import { notificationsRouter } from './routes/notifications.js';
import { exportRouter } from './routes/export.js';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Initialize DB schema & initial lookup seed
initDatabase();
const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
// API Routes
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/connections', connectionsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/recurring', recurringRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reconciliation', reconciliationRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/export', exportRouter);
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.0',
        service: 'SpendPulse Personal Finance Ledger Sync API',
        timestamp: new Date().toISOString()
    });
});
// Serve client in production if built
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/'))
        return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
        if (err)
            next();
    });
});
app.listen(PORT, () => {
    console.log(`🚀 SpendPulse Finance Backend Server running on http://localhost:${PORT}`);
});
