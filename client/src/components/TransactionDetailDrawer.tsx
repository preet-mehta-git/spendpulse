import React, { useState, useEffect } from 'react';
import { Transaction, Category } from '../types.js';
import { CategoryBadge } from './CategoryBadge.js';
import { 
  X, 
  Clock, 
  Building, 
  FileText, 
  Tag, 
  CreditCard, 
  Calendar, 
  Repeat, 
  Check, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onUpdate: (id: string, updates: { category_id?: string; notes?: string; is_recurring?: boolean }) => Promise<void>;
}

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  transaction,
  categories,
  onClose,
  onUpdate
}) => {
  if (!transaction) return null;

  const [selectedCatId, setSelectedCatId] = useState(transaction.category_id);
  const [notes, setNotes] = useState(transaction.notes || '');
  const [isRecurring, setIsRecurring] = useState(transaction.is_recurring === 1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setSelectedCatId(transaction.category_id);
    setNotes(transaction.notes || '');
    setIsRecurring(transaction.is_recurring === 1);
  }, [transaction]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(transaction.id, {
        category_id: selectedCatId,
        notes,
        is_recurring: isRecurring
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const isIncome = transaction.transaction_type === 'income';
  const isTransfer = transaction.transaction_type === 'transfer';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
      <div 
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">Ledger Entry Details</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              {transaction.status.toUpperCase()}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Amount & Merchant */}
        <div className="text-center my-5">
          <h2 className="text-3xl font-extrabold font-mono-numbers text-white tracking-tight">
            {isIncome ? '+' : isTransfer ? '' : '-'}₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-base font-medium text-zinc-300 mt-1">{transaction.merchant_name}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <CategoryBadge
              name={transaction.category_name}
              icon={transaction.category_icon}
              color={transaction.category_color}
              size="md"
            />
            {transaction.confidence_score && (
              <span className="text-xs text-zinc-400 font-mono bg-zinc-800/60 px-2 py-0.5 rounded-md border border-zinc-700/50">
                {Math.round(transaction.confidence_score * 100)}% match ({transaction.categorization_method})
              </span>
            )}
          </div>
        </div>

        {/* Data Grid */}
        <div className="space-y-4 text-sm bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/60">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400" />
              Transaction Timestamp
            </span>
            <span className="text-zinc-200 font-medium">
              {new Date(transaction.transaction_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-2">
              <Building className="w-4 h-4 text-zinc-400" />
              Account Ledger
            </span>
            <span className="text-zinc-200 font-medium">
              {transaction.account_name} ({transaction.masked_account_number})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-zinc-400" />
              Payment Channel
            </span>
            <span className="text-zinc-200 font-medium">
              {transaction.payment_mode || 'Direct Debit'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-zinc-400" />
              External Ledger ID
            </span>
            <span className="text-zinc-400 font-mono text-xs truncate max-w-[180px]">
              {transaction.external_transaction_id}
            </span>
          </div>
        </div>

        {/* Verbatim Bank Description (Source of Truth) */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Original Bank Narration (Source of Truth)
          </label>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 break-words select-all">
            {transaction.original_description}
          </div>
        </div>

        {/* Category Selector (Layer 3 Learning) */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            Change Category (Teaches Learned Preference)
          </label>
          <select
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type})
              </option>
            ))}
          </select>
        </div>

        {/* Notes input & Recurring toggle */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Personal Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Dinner with team, reimbursed by office..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-zinc-900 border-zinc-700"
            />
            <span className="text-xs text-zinc-300 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-purple-400" />
              Mark as Recurring Subscription / Bill
            </span>
          </label>
        </div>

        {/* Save Button */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Updated & Learned
              </>
            ) : isSaving ? (
              'Saving changes...'
            ) : (
              'Save & Update Ledger'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
