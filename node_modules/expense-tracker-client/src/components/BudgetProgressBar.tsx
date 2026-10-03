import React from 'react';
import { Budget } from '../types.js';
import { CategoryBadge } from './CategoryBadge.js';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface BudgetProgressBarProps {
  budget: Budget;
  onEdit?: (budget: Budget) => void;
}

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({
  budget,
  onEdit
}) => {
  const spent = budget.spent || 0;
  const limit = budget.monthly_limit || 1;
  const percentage = Math.min(100, Math.round((spent / limit) * 100));
  const remaining = Math.max(0, limit - spent);
  const isOverBudget = spent > limit;

  // Threshold color logic (50%, 75%, 90%, 100%)
  let barColor = 'bg-emerald-500';
  let badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  if (percentage >= 100 || isOverBudget) {
    barColor = 'bg-rose-500';
    badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  } else if (percentage >= 90) {
    barColor = 'bg-amber-500';
    badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else if (percentage >= 75) {
    barColor = 'bg-yellow-500';
    badgeColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  }

  return (
    <div 
      onClick={() => onEdit && onEdit(budget)}
      className="glass-card glass-card-hover p-4 rounded-2xl cursor-pointer"
    >
      {/* Category header */}
      <div className="flex items-center justify-between gap-2">
        <CategoryBadge
          name={budget.category_name}
          icon={budget.category_icon}
          color={budget.category_color}
          size="md"
        />

        <div className="flex items-center gap-1.5">
          {isOverBudget ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="w-3 h-3" />
              Exceeded by ₹{(spent - limit).toLocaleString('en-IN')}
            </span>
          ) : (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
              {percentage}% Used
            </span>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="mt-3 w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Amounts summary */}
      <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-400">
        <div>
          <span className="text-zinc-200 font-bold font-mono-numbers">₹{spent.toLocaleString('en-IN')}</span> spent
        </div>
        <div className="text-right">
          <span className="text-zinc-200 font-bold font-mono-numbers">₹{remaining.toLocaleString('en-IN')}</span> left of ₹{limit.toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  );
};
