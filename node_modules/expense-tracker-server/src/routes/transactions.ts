import { Router } from 'express';
import { db } from '../db/database.js';
import { AuthService, AuthRequest } from '../services/authService.js';
import { CategorizationEngine } from '../services/categorizationEngine.js';

export const transactionsRouter = Router();

transactionsRouter.use(AuthService.requireAuth);

transactionsRouter.get('/', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const {
    q,
    accountId,
    categoryId,
    type,
    status,
    startDate,
    endDate,
    sortBy = 'transaction_date',
    sortOrder = 'DESC',
    limit = 50,
    offset = 0
  } = req.query as any;

  let whereClauses = ['t.user_id = ?'];
  let params: any[] = [userId];

  if (q) {
    whereClauses.push('(t.merchant_name LIKE ? OR t.original_description LIKE ? OR t.normalized_description LIKE ? OR CAST(t.amount AS TEXT) LIKE ?)');
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (accountId) {
    whereClauses.push('t.account_id = ?');
    params.push(accountId);
  }

  if (categoryId) {
    whereClauses.push('t.category_id = ?');
    params.push(categoryId);
  }

  if (type) {
    whereClauses.push('t.transaction_type = ?');
    params.push(type);
  }

  if (status) {
    whereClauses.push('t.status = ?');
    params.push(status);
  }

  if (startDate) {
    whereClauses.push('t.transaction_date >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereClauses.push('t.transaction_date <= ?');
    params.push(endDate);
  }

  const whereSql = whereClauses.join(' AND ');
  const safeSortBy = ['transaction_date', 'amount', 'created_at'].includes(sortBy) ? sortBy : 'transaction_date';
  const safeSortOrder = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countResult = db.prepare(`
    SELECT COUNT(*) as total 
    FROM transactions t 
    WHERE ${whereSql}
  `).get(...params) as { total: number };

  const transactions = db.prepare(`
    SELECT 
      t.*, 
      c.name as category_name, 
      c.slug as category_slug, 
      c.icon as category_icon, 
      c.color as category_color,
      a.account_name, 
      a.masked_account_number,
      ta.account_name as transfer_account_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts ta ON t.transfer_account_id = ta.id
    WHERE ${whereSql}
    ORDER BY t.${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  res.json({
    total: countResult.total,
    transactions,
    limit: Number(limit),
    offset: Number(offset)
  });
});

transactionsRouter.get('/categories', (req: AuthRequest, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY type ASC, name ASC').all();
  res.json({ categories });
});

transactionsRouter.get('/:id', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const transaction = db.prepare(`
    SELECT 
      t.*, 
      c.name as category_name, 
      c.slug as category_slug, 
      c.icon as category_icon, 
      c.color as category_color,
      a.account_name, 
      a.masked_account_number,
      i.name as institution_name,
      i.logo as institution_logo,
      ta.account_name as transfer_account_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    JOIN accounts a ON t.account_id = a.id
    JOIN financial_institutions i ON a.institution_id = i.id
    LEFT JOIN accounts ta ON t.transfer_account_id = ta.id
    WHERE t.id = ? AND t.user_id = ?
  `).get(req.params.id, userId);

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  res.json({ transaction });
});

// Update category and/or notes
transactionsRouter.patch('/:id', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { category_id, notes, is_recurring } = req.body;

  const current = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!current) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const newCatId = category_id || current.category_id;
  const newNotes = notes !== undefined ? notes : current.notes;
  const newIsRec = is_recurring !== undefined ? (is_recurring ? 1 : 0) : current.is_recurring;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE transactions 
    SET category_id = ?, notes = ?, is_recurring = ?, categorization_method = 'manual', updated_at = ? 
    WHERE id = ?
  `).run(newCatId, newNotes, newIsRec, now, req.params.id);

  // If user changed category, teach Layer 3 Learned Preferences
  if (category_id && category_id !== current.category_id) {
    CategorizationEngine.recordUserOverride(userId, current.merchant_name, category_id);
  }

  const updated = db.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, a.account_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    JOIN accounts a ON t.account_id = a.id
    WHERE t.id = ?
  `).get(req.params.id);

  res.json({ transaction: updated });
});

// User Custom Rules Management
transactionsRouter.get('/user/rules', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const rules = db.prepare(`
    SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM user_rules r
    JOIN categories c ON r.category_id = c.id
    WHERE r.user_id = ?
    ORDER BY r.priority DESC, r.created_at DESC
  `).all(userId);

  res.json({ rules });
});

transactionsRouter.post('/user/rules', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { pattern, field = 'merchant', category_id, priority = 1 } = req.body;

  if (!pattern || !category_id) {
    return res.status(400).json({ error: 'Pattern and category_id are required' });
  }

  const id = `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO user_rules (id, user_id, pattern, field, category_id, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, pattern, field, category_id, priority, now);

  res.status(201).json({ id, pattern, field, category_id, priority });
});

transactionsRouter.delete('/user/rules/:id', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  db.prepare('DELETE FROM user_rules WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ message: 'Rule deleted successfully' });
});
