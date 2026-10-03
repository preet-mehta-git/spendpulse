import React from 'react';
import { Transaction } from '../types.js';
import { CategoryBadge } from './CategoryBadge.js';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft, 
  Clock, 
  RotateCcw,
  Smartphone,
  CreditCard,
  Building,
  Banknote
} from 'lucide-react';

interface TransactionCardProps {
  transaction: Transaction;
  onClick: () => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onClick
}) => {
  const isIncome = transaction.transaction_type === 'income';
  const isTransfer = transaction.transaction_type === 'transfer';
  const isRefund = transaction.transaction_type === 'refund';
  const isPending = transaction.status === 'pending';

  const formatAmount = (num: number) => {
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const getModeIcon = (mode?: string) => {
    switch (mode) {
      case 'UPI': return <Smartphone className="w-3 h-3 text-emerald-400" />;
      case 'CARD': return <CreditCard className="w-3 h-3 text-cyan-400" />;
      case 'ATM': return <Banknote className="w-3 h-3 text-zinc-400" />;
      default: return <Building className="w-3 h-3 text-indigo-400" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className="glass-card glass-card-hover p-3.5 sm:p-4 rounded-2xl cursor-pointer flex items-center justify-between gap-3 group"
    >
      {/* Left section: Icon & Details */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Transaction Type Avatar */}
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
          isTransfer
            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
            : isRefund
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            : isIncome
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300'
        }`}>
          {isTransfer ? (
            <ArrowRightLeft className="w-5 h-5" />
          ) : isRefund ? (
            <RotateCcw className="w-5 h-5" />
          ) : isIncome ? (
            <ArrowDownLeft className="w-5 h-5" />
          ) : (
            <ArrowUpRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200" />
          )}
        </div>

        {/* Merchant & Metadata */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-sm font-semibold text-zinc-100 truncate tracking-tight">
              {transaction.merchant_name}
            </h4>
            {isPending && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Clock className="w-2.5 h-2.5" />
                Pending
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
            <CategoryBadge
              name={transaction.category_name}
              icon={transaction.category_icon}
              color={transaction.category_color}
              size="sm"
            />
            <span className="text-zinc-600">•</span>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 truncate">
              {getModeIcon(transaction.payment_mode)}
              <span>{transaction.payment_mode || 'Auto'}</span>
            </div>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">{formatDate(transaction.transaction_date)}</span>
          </div>
        </div>
      </div>

      {/* Right section: Amount */}
      <div className="text-right shrink-0">
        <div className={`text-sm sm:text-base font-bold font-mono-numbers tracking-tight ${
          isTransfer
            ? 'text-purple-300'
            : isRefund
            ? 'text-blue-400'
            : isIncome
            ? 'text-emerald-400'
            : 'text-zinc-100'
        }`}>
          {isIncome || isRefund ? '+' : isTransfer ? '' : '-'}₹{formatAmount(transaction.amount)}
        </div>
        <div className="text-[11px] text-zinc-500 mt-0.5 sm:hidden">
          {formatDate(transaction.transaction_date)}
        </div>
        <div className="text-[11px] text-zinc-500 mt-0.5 hidden sm:block truncate max-w-[120px]">
          {transaction.account_name || 'Bank'}
        </div>
      </div>
    </div>
  );
};
