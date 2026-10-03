import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { BudgetService } from '../services/budgetService.js';
export const budgetsRouter = Router();
budgetsRouter.use(AuthService.requireAuth);
budgetsRouter.get('/', (req, res) => {
    const userId = req.user.id;
    const monthYear = req.query.monthYear;
    const budgets = BudgetService.getBudgetsForMonth(userId, monthYear);
    res.json({ budgets });
});
budgetsRouter.post('/', (req, res) => {
    const userId = req.user.id;
    const { category_id, monthly_limit, month_year } = req.body;
    if (!category_id || monthly_limit === undefined) {
        return res.status(400).json({ error: 'category_id and monthly_limit are required' });
    }
    const budget = BudgetService.setBudget(userId, category_id, Number(monthly_limit), month_year);
    res.status(201).json({ budget });
});
budgetsRouter.delete('/:id', (req, res) => {
    const userId = req.user.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    BudgetService.deleteBudget(userId, id);
    res.json({ message: 'Budget deleted' });
});
