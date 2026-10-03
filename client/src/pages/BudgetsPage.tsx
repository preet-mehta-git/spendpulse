import React, { useState, useEffect } from 'react';
import { Budget, Category, RecurringSubscription } from '../types.js';
import { BudgetProgressBar } from '../components/BudgetProgressBar.js';
import { 
  Target, 
  Plus, 
  Repeat, 
  Sparkles, 
  X, 
  Check, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { api } from '../api.js';

interface BudgetsPageProps {
  categories: Category[];
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({ categories }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurring, setRecurring] = useState<{ items: RecurringSubscription[]; monthlyTotal: number; annualTotal: number }>({
    items: [],
    monthlyTotal: 0,
    annualTotal: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Set Budget Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [budgetsRes, recRes] = await Promise.all([
        api.getBudgets(),
        api.getRecurring()
      ]);
      setBudgets(budgetsRes.budgets);
      setRecurring(recRes);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !monthlyLimit) return;
    setIsSubmitting(true);
    try {
      await api.setBudget(selectedCatId, parseFloat(monthlyLimit));
      setShowModal(false);
      setSelectedCatId('');
      setMonthlyLimit('');
      loadData();
    } catch (err: any) {
      alert(`Error setting budget: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.monthly_limit, 0);
  const totalBudgetSpent = budgets.reduce((acc, b) => acc + (b.spent || 0), 0);
  const totalBudgetRemaining = Math.max(0, totalBudgetLimit - totalBudgetSpent);
  const totalPercentage = totalBudgetLimit > 0 ? Math.min(100, Math.round((totalBudgetSpent / totalBudgetLimit) * 100)) : 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Header with Set Budget CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Category Budgets & Recurring</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Automated spending limits and cadence detection</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Set Budget
        </button>
      </div>

      {/* Aggregate Budget Hero */}
      <div className="glass-card p-5 rounded-3xl border border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Overall Monthly Budget</span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-numbers text-white mt-1">
              ₹{totalBudgetSpent.toLocaleString('en-IN')} <span className="text-sm font-normal text-zinc-400">/ ₹{totalBudgetLimit.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-400">Remaining</span>
            <div className="text-lg font-bold font-mono-numbers text-emerald-400">
              ₹{totalBudgetRemaining.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Global Progress Track */}
        <div className="mt-4 w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-teal-400"
            style={{ width: `${totalPercentage}%` }}
          />
        </div>
      </div>

      {/* Category Budgets Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white px-1">Category Spending Limits</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-zinc-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-10 glass-card rounded-2xl text-xs text-zinc-500">
            No category budgets created yet. Click 'Set Budget' above to track spending limits.
          </div>
        ) : (
          budgets.map((b) => (
            <BudgetProgressBar
              key={b.id}
              budget={b}
              onEdit={(target) => {
                setSelectedCatId(target.category_id);
                setMonthlyLimit(target.monthly_limit.toString());
                setShowModal(true);
              }}
            />
          ))
        )}
      </div>

      {/* Recurring Subscriptions Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Repeat className="w-4 h-4 text-purple-400" />
            Detected Subscriptions & Recurring Bills
          </h3>
          <span className="text-xs text-purple-300 font-mono">
            ₹{recurring.monthlyTotal.toLocaleString('en-IN')}/mo • ₹{recurring.annualTotal.toLocaleString('en-IN')}/yr
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recurring.items.length === 0 ? (
            <div className="col-span-2 text-center py-6 glass-card rounded-2xl text-xs text-zinc-500">
              No recurring subscriptions detected yet.
            </div>
          ) : (
            recurring.items.map((sub) => (
              <div key={sub.id} className="glass-card p-4 rounded-2xl border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-100">{sub.merchant_name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                    <span className="capitalize">{sub.frequency}</span>
                    <span>•</span>
                    <span>Next: {new Date(sub.next_expected_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono-numbers text-white">
                    ₹{sub.amount.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    ₹{sub.annual_cost.toLocaleString('en-IN')}/yr
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Set Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">Set Monthly Category Budget</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Select Category</label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Choose category...</option>
                  {categories.filter(c => c.type === 'expense' && c.slug !== 'transfer').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Monthly Limit (INR ₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 8000"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  required
                  min="100"
                  step="100"
                  className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 mt-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                {isSubmitting ? 'Saving...' : 'Set Budget Limit'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
