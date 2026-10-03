import React, { useState, useEffect } from 'react';
import { Transaction, Category, Account } from '../types.js';
import { TransactionCard } from '../components/TransactionCard.js';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Download, 
  X, 
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../api.js';

interface TransactionsPageProps {
  onSelectTransaction: (tx: Transaction) => void;
  categories: Category[];
  accounts: Account[];
  onOpenExport: () => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  onSelectTransaction,
  categories,
  accounts,
  onOpenExport
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortBy, setSortBy] = useState<'transaction_date' | 'amount'>('transaction_date');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await api.getTransactions({
        q: searchTerm || undefined,
        accountId: selectedAccountId || undefined,
        categoryId: selectedCategoryId || undefined,
        type: selectedType || undefined,
        sortBy,
        sortOrder,
        limit: 100
      });
      setTransactions(res.transactions);
      setTotalCount(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedAccountId, selectedCategoryId, selectedType, sortBy, sortOrder]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAccountId('');
    setSelectedCategoryId('');
    setSelectedType('');
    setShowFilterDrawer(false);
  };

  const hasActiveFilters = !!(selectedAccountId || selectedCategoryId || selectedType || searchTerm);

  return (
    <div className="space-y-4 pb-20">
      {/* Search & Actions Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Amazon, Swiggy, ₹500, UPI, salary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs sm:text-sm rounded-2xl pl-10 pr-8 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-500"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          className={`p-2.5 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
            hasActiveFilters 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="p-2.5 rounded-2xl bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-all text-xs font-semibold flex items-center gap-1.5"
          title="Export CSV/JSON"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      {/* Filter Options Drawer */}
      {showFilterDrawer && (
        <div className="glass-card p-4 rounded-2xl border border-zinc-800 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Active Filters</span>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-xs text-rose-400 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Account Filter */}
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1">Financial Account</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Accounts</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.account_name}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1">Category</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1">Transaction Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Types</option>
                <option value="expense">Expenses Only</option>
                <option value="income">Income / Salary Only</option>
                <option value="transfer">Internal Transfers Only</option>
                <option value="refund">Refunds Only</option>
                <option value="cash_withdrawal">ATM Withdrawals</option>
              </select>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/60 text-xs text-zinc-400">
            <span>Sort by:</span>
            <button
              onClick={() => {
                if (sortBy === 'transaction_date') {
                  setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC');
                } else {
                  setSortBy('transaction_date');
                  setSortOrder('DESC');
                }
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                sortBy === 'transaction_date' ? 'bg-zinc-800 text-white border-zinc-700' : 'border-zinc-800'
              }`}
            >
              Date {sortBy === 'transaction_date' ? (sortOrder === 'DESC' ? '↓' : '↑') : ''}
            </button>

            <button
              onClick={() => {
                if (sortBy === 'amount') {
                  setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC');
                } else {
                  setSortBy('amount');
                  setSortOrder('DESC');
                }
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                sortBy === 'amount' ? 'bg-zinc-800 text-white border-zinc-700' : 'border-zinc-800'
              }`}
            >
              Amount {sortBy === 'amount' ? (sortOrder === 'DESC' ? '↓' : '↑') : ''}
            </button>
          </div>
        </div>
      )}

      {/* Transaction Counter */}
      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>Showing {transactions.length} of {totalCount} transactions</span>
        {hasActiveFilters && <span className="text-emerald-400">Filtered</span>}
      </div>

      {/* Transaction List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-zinc-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-3xl p-6">
            <Layers className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-zinc-300">No matching transactions</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
              Try adjusting your search terms or filters to locate specific ledger entries.
            </p>
          </div>
        ) : (
          transactions.map((tx) => (
            <TransactionCard
              key={tx.id}
              transaction={tx}
              onClick={() => onSelectTransaction(tx)}
            />
          ))
        )}
      </div>
    </div>
  );
};
