import React, { useState, useEffect } from 'react';
import { DashboardMetrics } from '../types.js';
import { CategoryBadge } from '../components/CategoryBadge.js';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  Activity, 
  Award
} from 'lucide-react';
import { api } from '../api.js';

interface AnalyticsPageProps {
  metrics: DashboardMetrics | null;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ metrics }) => {
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(true);

  useEffect(() => {
    api.getTrends(6)
      .then(res => setTrends(res.trends))
      .catch(console.error)
      .finally(() => setIsLoadingTrends(false));
  }, []);

  if (!metrics) return null;

  const patterns = metrics.spendingPatterns || {
    averageDailySpending: 0,
    averageTransactionAmount: 0,
    mostExpensiveDay: 'N/A',
    mostFrequentCategory: 'Food'
  };

  const formatAmount = (num: number) => Math.round(num).toLocaleString('en-IN');

  return (
    <div className="space-y-6 pb-20">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">Financial Analytics & Trends</h2>
        <p className="text-xs text-zinc-400 mt-0.5">Factual cashflow analytics calculated directly from your ledger</p>
      </div>

      {/* 6-Month Cashflow Chart */}
      <div className="glass-card p-5 rounded-3xl border border-zinc-800/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">6-Month Spending vs Income</h3>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Income
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Expense
            </span>
          </div>
        </div>

        <div className="h-60 w-full">
          {isLoadingTrends ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
              Loading trends...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '1rem', fontSize: '12px' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                />
                <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} name="Income" />
                <Bar dataKey="spend" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Spending Habits Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 rounded-2xl border border-zinc-800/80">
          <span className="text-[11px] text-zinc-400 font-semibold block">Average Daily Spend</span>
          <div className="text-base sm:text-lg font-bold font-mono-numbers text-white mt-1">
            ₹{formatAmount(patterns.averageDailySpending)}
          </div>
          <span className="text-[10px] text-zinc-500">Per calendar day</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-zinc-800/80">
          <span className="text-[11px] text-zinc-400 font-semibold block">Average Transaction</span>
          <div className="text-base sm:text-lg font-bold font-mono-numbers text-white mt-1">
            ₹{formatAmount(patterns.averageTransactionAmount)}
          </div>
          <span className="text-[10px] text-zinc-500">Per single swipe/UPI</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-zinc-800/80">
          <span className="text-[11px] text-zinc-400 font-semibold block">Peak Spending Day</span>
          <div className="text-base sm:text-lg font-bold text-amber-400 mt-1">
            {patterns.mostExpensiveDay}
          </div>
          <span className="text-[10px] text-zinc-500">Highest aggregate outflows</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-zinc-800/80">
          <span className="text-[11px] text-zinc-400 font-semibold block">Top Category</span>
          <div className="text-base sm:text-lg font-bold text-emerald-400 mt-1 truncate">
            {patterns.mostFrequentCategory}
          </div>
          <span className="text-[10px] text-zinc-500">Most frequent volume</span>
        </div>
      </div>

      {/* Largest Expenses of the Month */}
      <div className="glass-card p-5 rounded-3xl border border-zinc-800/80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            Top 5 Largest Outflows This Month
          </h3>
        </div>

        <div className="space-y-2.5">
          {metrics.largestExpensesThisMonth.map((tx, idx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-2xl border border-zinc-800/60">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 font-mono text-xs flex items-center justify-center font-bold">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">{tx.merchantName}</h4>
                  <span className="text-[10px] text-zinc-400">{tx.categoryName}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold font-mono-numbers text-zinc-100">
                  ₹{formatAmount(tx.amount)}
                </span>
                <span className="block text-[10px] text-zinc-500">
                  {new Date(tx.transactionDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
