import { db } from '../db/database.js';
export class BudgetService {
    static getCurrentMonthKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
    static getBudgetsForMonth(userId, monthYear) {
        const targetMonth = monthYear || this.getCurrentMonthKey();
        // Query budgets with category metadata
        const budgets = db.prepare(`
      SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.month_year = ?
    `).all(userId, targetMonth);
        // Calculate actual spending for each category in the specified month
        // Exclude internal transfers and refunds
        const startDate = `${targetMonth}-01T00:00:00.000Z`;
        const [year, month] = targetMonth.split('-').map(Number);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
        const spendingByCategory = db.prepare(`
      SELECT category_id, SUM(amount) as total_spent
      FROM transactions
      WHERE user_id = ? 
        AND transaction_type = 'expense' 
        AND category_id != 'cat-transfer'
        AND transaction_date >= ? 
        AND transaction_date <= ?
      GROUP BY category_id
    `).all(userId, startDate, endOfMonth);
        const spendMap = new Map();
        for (const item of spendingByCategory) {
            spendMap.set(item.category_id, item.total_spent);
        }
        return budgets.map(b => {
            const spent = spendMap.get(b.category_id) || 0;
            const remaining = Math.max(0, b.monthly_limit - spent);
            const percentage = Math.min(100, Math.round((spent / (b.monthly_limit || 1)) * 100));
            return {
                ...b,
                spent,
                remaining,
                percentage
            };
        });
    }
    static setBudget(userId, categoryId, monthlyLimit, monthYear) {
        const targetMonth = monthYear || this.getCurrentMonthKey();
        const id = `budg-${userId}-${categoryId}-${targetMonth}`;
        db.prepare(`
      INSERT INTO budgets (id, user_id, category_id, monthly_limit, month_year, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, category_id, month_year) DO UPDATE SET
        monthly_limit = excluded.monthly_limit
    `).run(id, userId, categoryId, monthlyLimit, targetMonth, new Date().toISOString());
        const list = this.getBudgetsForMonth(userId, targetMonth);
        return list.find(b => b.category_id === categoryId);
    }
    static deleteBudget(userId, budgetId) {
        db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(budgetId, userId);
    }
}
