import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  FileText, 
  Check, 
  DollarSign, 
  Landmark, 
  Tag, 
  Calendar, 
  Layers, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../api.js';
import { Account, Category, ParsedSmsPreview } from '../types.js';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeMode, setActiveMode] = useState<'smart_paste' | 'manual'>('smart_paste');
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Smart Paste State
  const [pasteText, setPasteText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedSmsPreview | null>(null);

  // Manual Form State
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        api.getCategories(),
        api.getAccounts()
      ]);
      setCategories(catRes.categories);
      setAccounts(accRes.accounts);
      if (accRes.accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(accRes.accounts[0].id);
      }
      if (catRes.categories.length > 0 && !selectedCategory) {
        setSelectedCategory(catRes.categories[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePasteChange = async (val: string) => {
    setPasteText(val);
    setErrorMessage(null);
    if (!val.trim()) {
      setParsedPreview(null);
      return;
    }
    try {
      const res = await api.parseSms(val);
      if (res.success && res.parsed) {
        setParsedPreview(res.parsed);
        // Pre-fill manual fields in case user switches tabs
        setAmount(String(res.parsed.amount || ''));
        setMerchant(res.parsed.merchantName || '');
        setPaymentMode(res.parsed.paymentMode || 'UPI');
        if (res.parsed.transactionType === 'income') setTxType('income');
        else setTxType('expense');
      }
    } catch (e) {
      setParsedPreview(null);
    }
  };

  const handleSmartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.ingestMobileTransaction({
        text: pasteText,
        source: 'android_pwa_smart_paste'
      });

      if (res.success) {
        setSuccessMessage(`Recorded ₹${res.transaction?.amount} at ${res.transaction?.merchant_name}`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        setErrorMessage(res.message || 'Failed to record transaction');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !merchant) {
      setErrorMessage('Amount and Merchant name are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.ingestMobileTransaction({
        amount: parseFloat(amount),
        merchant,
        category_id: selectedCategory || undefined,
        account_id: selectedAccount || undefined,
        transaction_type: txType,
        payment_mode: paymentMode,
        notes: notes || undefined,
        source: 'manual_quick_entry'
      });

      if (res.success) {
        setSuccessMessage(`Logged ₹${amount} at ${merchant}`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        setErrorMessage(res.message || 'Failed to save transaction');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-lg p-6 rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Quick Log & Smart Capture</h3>
              <p className="text-[11px] text-zinc-400">Instant expense logging from your phone</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveMode('smart_paste')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'smart_paste'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Paste Bank SMS / UPI
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'manual'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Manual 3-Sec Entry
          </button>
        </div>

        {/* Smart Paste Mode */}
        {activeMode === 'smart_paste' && (
          <form onSubmit={handleSmartSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">
                Paste SMS, WhatsApp Bank Alert, or UPI Text:
              </label>
              <textarea
                rows={3}
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder="e.g. Sent Rs.450 from HDFC Bank A/C **1234 to ZOMATO on 29-AUG-26. UPI Ref 382910..."
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                required
              />
            </div>

            {parsedPreview && (
              <div className="p-3 bg-zinc-950/80 rounded-2xl border border-emerald-500/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Auto-Detected Transaction
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    Ready to Save
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-zinc-900 rounded-xl">
                    <span className="text-[10px] text-zinc-500 block">Amount</span>
                    <span className="font-bold text-white font-mono">₹{parsedPreview.amount}</span>
                  </div>
                  <div className="p-2 bg-zinc-900 rounded-xl">
                    <span className="text-[10px] text-zinc-500 block">Merchant</span>
                    <span className="font-bold text-emerald-400 truncate block">{parsedPreview.merchantName}</span>
                  </div>
                  <div className="p-2 bg-zinc-900 rounded-xl">
                    <span className="text-[10px] text-zinc-500 block">Mode</span>
                    <span className="font-semibold text-zinc-200 capitalize truncate block">{parsedPreview.paymentMode}</span>
                  </div>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !pasteText.trim()}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {isSubmitting ? 'Saving...' : 'Parse & Record'}
              </button>
            </div>
          </form>
        )}

        {/* Manual Form Mode */}
        {activeMode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-3.5">
            {/* Type selector */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTxType('expense')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  txType === 'expense'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                Expense / Debit
              </button>
              <button
                type="button"
                onClick={() => setTxType('income')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  txType === 'income'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                Income / Credit
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Merchant / Payee</label>
                <input
                  type="text"
                  placeholder="e.g. Swiggy, Uber, Chai"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Notes (Optional)</label>
              <input
                type="text"
                placeholder="Dinner with friends, office lunch..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !amount || !merchant}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {isSubmitting ? 'Saving...' : 'Save Transaction'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
