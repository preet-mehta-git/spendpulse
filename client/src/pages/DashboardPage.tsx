import React from 'react';
import { DashboardMetrics, Transaction } from '../types.js';
import { TransactionCard } from '../components/TransactionCard.js';
import { InsightsCard } from '../components/InsightsCard.js';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PiggyBank,
  PlayCircle,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface DashboardPageProps {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenSimulate: () => void;
  onViewAllTransactions: () => void;
  onRefresh?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics,
  isLoading,
  onSelectTransaction,
  onOpenSimulate,
  onViewAllTransactions,
  onRefresh
}) => {
  if (isLoading && !metrics) {
    return (
      <div className="space-y-4 animate-pulse pb-20">
        <div className="h-32 bg-zinc-900/80 rounded-3xl" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 bg-zinc-900/80 rounded-2xl" />
          <div className="h-24 bg-zinc-900/80 rounded-2xl" />
          <div className="h-24 bg-zinc-900/80 rounded-2xl" />
        </div>
        <div className="h-48 bg-zinc-900/80 rounded-3xl" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-20 glass-card rounded-3xl p-6 space-y-3">
        <Wallet className="w-10 h-10 text-zinc-500 mx-auto" />
        <h3 className="text-base font-bold text-white">No ledger data available</h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          Synchronize your financial accounts or populate demo transactions to view your dashboard.
        </p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry / Load Ledger
        </button>
      </div>
    );
  }

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const formatAmount = (num: number) => Math.round(num).toLocaleString('en-IN');

  return (
    <div className="space-y-6 pb-20">
      {/* Top Greeting & Total Balance Hero */}
      <div className="glass-card p-6 rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/90 via-zinc-900/70 to-zinc-950 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">Total Net Ledger Balance</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-mono-numbers text-white tracking-tight mt-1">
              ₹{formatAmount(metrics.totalBalance)}
            </h2>
          </div>
          <button
            onClick={onOpenSimulate}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            <PlayCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Simulate Event</span>
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
          <span>{currentMonthName}</span>
          <span>•</span>
          <span className="text-zinc-400">Auto-reconciled with bank core</span>
        </div>
      </div>

      {/* 3 Key Metric Cards: Spent, Income, Savings */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {/* Spent This Month */}
        <div className="glass-card p-3.5 sm:p-4 rounded-2xl border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">Spent</span>
          </div>
          <div className="text-sm sm:text-lg font-bold font-mono-numbers text-white mt-1.5">
            ₹{formatAmount(metrics.spentThisMonth)}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 truncate">
            {metrics.spendChangePercentage > 0 ? (
              <span className="text-rose-400">↑ {metrics.spendChangePercentage}% vs prev</span>
            ) : metrics.spendChangePercentage < 0 ? (
              <span className="text-emerald-400">↓ {Math.abs(metrics.spendChangePercentage)}% vs prev</span>
            ) : (
              'Same as prev'
            )}
          </div>
        </div>

        {/* Income This Month */}
        <div className="glass-card p-3.5 sm:p-4 rounded-2xl border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Income</span>
          </div>
          <div className="text-sm sm:text-lg font-bold font-mono-numbers text-emerald-400 mt-1.5">
            ₹{formatAmount(metrics.incomeThisMonth)}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 truncate">
            Salary & Credits
          </div>
        </div>

        {/* Net Savings */}
        <div className="glass-card p-3.5 sm:p-4 rounded-2xl border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <PiggyBank className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Savings</span>
          </div>
          <div className="text-sm sm:text-lg font-bold font-mono-numbers text-cyan-300 mt-1.5">
            ₹{formatAmount(metrics.savingsThisMonth)}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 truncate">
            Net Surplus
          </div>
        </div>
      </div>

      {/* AI / Factual Insights Card */}
      <InsightsCard insights={metrics.insights} />

      {/* Category Spend Distribution */}
      <div className="glass-card p-5 rounded-3xl border border-zinc-800/80">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white tracking-tight">Monthly Category Breakdown</h3>
          <span className="text-xs text-zinc-400 font-mono">
            ₹{formatAmount(metrics.spentThisMonth)} total
          </span>
        </div>

        {metrics.categoryBreakdown.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-500">
            No expense transactions recorded this month.
          </div>
        ) : (
          <div className="space-y-3">
            {metrics.categoryBreakdown.slice(0, 5).map((cat) => (
              <div key={cat.categoryId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-200 font-medium">{cat.categoryName}</span>
                  <span className="text-zinc-300 font-mono-numbers font-semibold">
                    ₹{formatAmount(cat.amount)} ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.categoryColor || '#10b981'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white tracking-tight">Recent Synchronized Transactions</h3>
          <button
            onClick={onViewAllTransactions}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors"
          >
            View Full Ledger
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {metrics.recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500 glass-card rounded-2xl">
              No transactions yet. Click 'Sync Now' to pull from financial accounts.
            </div>
          ) : (
            metrics.recentTransactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onClick={() => onSelectTransaction(tx)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
