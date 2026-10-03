import { db } from '../db/database.js';

export interface DashboardMetrics {
  totalBalance: number;
  spentThisMonth: number;
  incomeThisMonth: number;
  savingsThisMonth: number;
  spentLastMonth: number;
  incomeLastMonth: number;
  spendChangePercentage: number;
  recentTransactions: any[];
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  spendingPatterns: {
    averageDailySpending: number;
    averageTransactionAmount: number;
    mostExpensiveDay: string;
    mostFrequentCategory: string;
    totalTransactionsThisMonth: number;
  };
  largestExpensesThisMonth: Array<{
    id: string;
    merchantName: string;
    amount: number;
    categoryName: string;
    transactionDate: string;
  }>;
  insights: string[];
}

export class AnalyticsService {
  public static getDashboardMetrics(userId: string, targetMonthYear?: string): DashboardMetrics {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let year = currentYear;
    let month = currentMonth;

    if (targetMonthYear) {
      const [y, m] = targetMonthYear.split('-').map(Number);
      if (y && m) {
        year = y;
        month = m;
      }
    }

    const monthStr = String(month).padStart(2, '0');
    const startOfCurrentMonth = `${year}-${monthStr}-01T00:00:00.000Z`;
    const endOfCurrentMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

    // Calculate previous month
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevMonthStr = String(prevMonth).padStart(2, '0');
    const startOfPrevMonth = `${prevYear}-${prevMonthStr}-01T00:00:00.000Z`;
    const endOfPrevMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999).toISOString();

    // 1. Total Net Balance across all connected accounts
    const balanceResult = db.prepare(`
      SELECT SUM(current_balance) as total 
      FROM accounts 
      WHERE user_id = ?
    `).get(userId) as { total: number | null };
    const totalBalance = balanceResult?.total || 0;

    // 2. Current Month Spending (excluding internal transfers)
    const currentSpendResult = db.prepare(`
      SELECT SUM(amount) as total, COUNT(*) as count, AVG(amount) as avg_amount
      FROM transactions
      WHERE user_id = ? 
        AND transaction_type = 'expense'
        AND category_id != 'cat-transfer'
        AND transaction_date >= ?
        AND transaction_date <= ?
    `).get(userId, startOfCurrentMonth, endOfCurrentMonth) as { total: number | null; count: number; avg_amount: number | null };
    const spentThisMonth = currentSpendResult?.total || 0;
    const totalTransactionsThisMonth = currentSpendResult?.count || 0;
    const averageTransactionAmount = Math.round(currentSpendResult?.avg_amount || 0);

    // 3. Current Month Income (excluding internal transfers)
    const currentIncomeResult = db.prepare(`
      SELECT SUM(amount) as total 
      FROM transactions
      WHERE user_id = ? 
        AND transaction_type = 'income'
        AND category_id != 'cat-transfer'
        AND transaction_date >= ?
        AND transaction_date <= ?
    `).get(userId, startOfCurrentMonth, endOfCurrentMonth) as { total: number | null };
    const incomeThisMonth = currentIncomeResult?.total || 0;
    const savingsThisMonth = Math.max(0, incomeThisMonth - spentThisMonth);

    // 4. Previous Month Spending
    const prevSpendResult = db.prepare(`
      SELECT SUM(amount) as total 
      FROM transactions
      WHERE user_id = ? 
        AND transaction_type = 'expense'
        AND category_id != 'cat-transfer'
        AND transaction_date >= ?
        AND transaction_date <= ?
    `).get(userId, startOfPrevMonth, endOfPrevMonth) as { total: number | null };
    const spentLastMonth = prevSpendResult?.total || 0;

    // 5. Previous Month Income
    const prevIncomeResult = db.prepare(`
      SELECT SUM(amount) as total 
      FROM transactions
      WHERE user_id = ? 
        AND transaction_type = 'income'
        AND category_id != 'cat-transfer'
        AND transaction_date >= ?
        AND transaction_date <= ?
    `).get(userId, startOfPrevMonth, endOfPrevMonth) as { total: number | null };
    const incomeLastMonth = prevIncomeResult?.total || 0;

    // Spend change percentage
    let spendChangePercentage = 0;
    if (spentLastMonth > 0) {
      spendChangePercentage = Math.round(((spentThisMonth - spentLastMonth) / spentLastMonth) * 100);
    }

    // 6. Category Breakdown for Current Month
    const categoryRows = db.prepare(`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        SUM(t.amount) as amount,
        COUNT(t.id) as tx_count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? 
        AND t.transaction_type = 'expense'
        AND t.category_id != 'cat-transfer'
        AND t.transaction_date >= ?
        AND t.transaction_date <= ?
      GROUP BY c.id
      ORDER BY amount DESC
    `).all(userId, startOfCurrentMonth, endOfCurrentMonth) as Array<{
      category_id: string;
      category_name: string;
      category_color: string;
      category_icon: string;
      amount: number;
      tx_count: number;
    }>;

    const categoryBreakdown = categoryRows.map(row => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      categoryIcon: row.category_icon,
      amount: Math.round(row.amount),
      percentage: spentThisMonth > 0 ? Math.round((row.amount / spentThisMonth) * 100) : 0,
      transactionCount: row.tx_count
    }));

    // 7. Spending Patterns
    // Days elapsed in the month (or total days if past month)
    const nowDay = (year === currentYear && month === currentMonth) ? now.getDate() : new Date(year, month, 0).getDate();
    const averageDailySpending = Math.round(spentThisMonth / Math.max(1, nowDay));

    // Most expensive day of week
    const dayRows = db.prepare(`
      SELECT strftime('%w', transaction_date) as day_of_week, SUM(amount) as total_amount
      FROM transactions
      WHERE user_id = ? 
        AND transaction_type = 'expense'
        AND category_id != 'cat-transfer'
        AND transaction_date >= ?
        AND transaction_date <= ?
      GROUP BY day_of_week
      ORDER BY total_amount DESC
      LIMIT 1
    `).get(userId, startOfCurrentMonth, endOfCurrentMonth) as { day_of_week: string; total_amount: number } | undefined;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mostExpensiveDay = dayRows ? dayNames[parseInt(dayRows.day_of_week, 10)] : 'N/A';
    const mostFrequentCategory = categoryBreakdown[0]?.categoryName || 'Food & Dining';

    // 8. Largest Expenses
    const largestExpensesThisMonth = db.prepare(`
      SELECT t.id, t.merchant_name, t.amount, c.name as category_name, t.transaction_date
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? 
        AND t.transaction_type = 'expense'
        AND t.category_id != 'cat-transfer'
        AND t.transaction_date >= ?
        AND t.transaction_date <= ?
      ORDER BY t.amount DESC
      LIMIT 5
    `).all(userId, startOfCurrentMonth, endOfCurrentMonth) as any[];

    // 9. Recent 10 Transactions
    const recentTransactions = db.prepare(`
      SELECT 
        t.*, 
        c.name as category_name, 
        c.slug as category_slug, 
        c.icon as category_icon, 
        c.color as category_color,
        a.account_name, 
        a.masked_account_number
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ?
      ORDER BY t.transaction_date DESC
      LIMIT 10
    `).all(userId);

    // 10. Generate Deterministic Factual Financial Insights
    const insights: string[] = [];

    if (categoryBreakdown.length > 0) {
      const topCat = categoryBreakdown[0];
      insights.push(`Your top spending category is **${topCat.categoryName}** at ₹${topCat.amount.toLocaleString('en-IN')} (${topCat.percentage}% of monthly spend).`);
    }

    if (spentLastMonth > 0 && spentThisMonth > 0) {
      if (spendChangePercentage > 0) {
        insights.push(`Your total expenses are **${spendChangePercentage}% higher** compared to the previous month.`);
      } else if (spendChangePercentage < 0) {
        insights.push(`Great job! You spent **${Math.abs(spendChangePercentage)}% less** compared to the previous month.`);
      }
    }

    // Last 7 days shopping insight
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const shopping7Days = db.prepare(`
      SELECT SUM(amount) as total 
      FROM transactions 
      WHERE user_id = ? 
        AND (category_id = 'cat-shopping' OR category_id = 'cat-groceries')
        AND transaction_date >= ?
    `).get(userId, sevenDaysAgo) as { total: number | null };

    if (shopping7Days && shopping7Days.total && shopping7Days.total > 0) {
      insights.push(`You have spent **₹${Math.round(shopping7Days.total).toLocaleString('en-IN')}** on Shopping & Groceries in the last 7 days.`);
    }

    if (averageDailySpending > 0) {
      insights.push(`Your average daily spending is running at **₹${averageDailySpending.toLocaleString('en-IN')}/day**.`);
    }

    return {
      totalBalance,
      spentThisMonth,
      incomeThisMonth,
      savingsThisMonth,
      spentLastMonth,
      incomeLastMonth,
      spendChangePercentage,
      recentTransactions,
      categoryBreakdown,
      spendingPatterns: {
        averageDailySpending,
        averageTransactionAmount,
        mostExpensiveDay,
        mostFrequentCategory,
        totalTransactionsThisMonth
      },
      largestExpensesThisMonth,
      insights
    };
  }

  public static getCashflowTrends(userId: string, monthsBack: number = 6) {
    const results: Array<{ month: string; spend: number; income: number; savings: number }> = [];
    const now = new Date();

    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const mStr = String(m).padStart(2, '0');
      const start = `${y}-${mStr}-01T00:00:00.000Z`;
      const end = new Date(y, m, 0, 23, 59, 59, 999).toISOString();
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });

      const spendRes = db.prepare(`
        SELECT SUM(amount) as total FROM transactions
        WHERE user_id = ? AND transaction_type = 'expense' AND category_id != 'cat-transfer'
          AND transaction_date >= ? AND transaction_date <= ?
      `).get(userId, start, end) as { total: number | null };

      const incRes = db.prepare(`
        SELECT SUM(amount) as total FROM transactions
        WHERE user_id = ? AND transaction_type = 'income' AND category_id != 'cat-transfer'
          AND transaction_date >= ? AND transaction_date <= ?
      `).get(userId, start, end) as { total: number | null };

      const spend = spendRes?.total || 0;
      const income = incRes?.total || 0;
      const savings = Math.max(0, income - spend);

      results.push({
        month: monthLabel,
        spend: Math.round(spend),
        income: Math.round(income),
        savings: Math.round(savings)
      });
    }

    return results;
  }
}
