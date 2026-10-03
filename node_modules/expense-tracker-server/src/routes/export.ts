import { Router } from 'express';
import { db } from '../db/database.js';
import { AuthService, AuthRequest } from '../services/authService.js';

export const exportRouter = Router();

exportRouter.use(AuthService.requireAuth);

exportRouter.get('/csv', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  let whereClauses = ['t.user_id = ?'];
  let params: any[] = [userId];

  if (startDate) {
    whereClauses.push('t.transaction_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push('t.transaction_date <= ?');
    params.push(endDate);
  }

  const transactions = db.prepare(`
    SELECT 
      t.transaction_date,
      t.merchant_name,
      t.amount,
      t.transaction_type,
      c.name as category_name,
      a.account_name,
      t.original_description,
      t.status
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    JOIN accounts a ON t.account_id = a.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY t.transaction_date DESC
  `).all(...params) as any[];

  // Build CSV string
  const headers = ['Date', 'Merchant', 'Amount (INR)', 'Type', 'Category', 'Account', 'Original Description', 'Status'];
  const rows = transactions.map(t => [
    `"${t.transaction_date.slice(0, 10)}"`,
    `"${(t.merchant_name || '').replace(/"/g, '""')}"`,
    t.amount,
    `"${t.transaction_type}"`,
    `"${(t.category_name || '').replace(/"/g, '""')}"`,
    `"${(t.account_name || '').replace(/"/g, '""')}"`,
    `"${(t.original_description || '').replace(/"/g, '""')}"`,
    `"${t.status}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=transactions_export_${Date.now()}.csv`);
  res.send(csvContent);
});

exportRouter.get('/json', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  let whereClauses = ['t.user_id = ?'];
  let params: any[] = [userId];

  if (startDate) {
    whereClauses.push('t.transaction_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push('t.transaction_date <= ?');
    params.push(endDate);
  }

  const transactions = db.prepare(`
    SELECT 
      t.*, 
      c.name as category_name, 
      a.account_name, 
      a.masked_account_number
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    JOIN accounts a ON t.account_id = a.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY t.transaction_date DESC
  `).all(...params);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=transactions_export_${Date.now()}.json`);
  res.json({ exportedAt: new Date().toISOString(), count: transactions.length, transactions });
});
