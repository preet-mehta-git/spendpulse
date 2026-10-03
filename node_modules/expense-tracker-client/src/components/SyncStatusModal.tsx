import React from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';

interface SyncStatusModalProps {
  report: any;
  onClose: () => void;
}

export const SyncStatusModal: React.FC<SyncStatusModalProps> = ({
  report,
  onClose
}) => {
  if (!report) return null;

  const isSuccess = report.status === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-scale-up text-center">
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 ${
          isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
        }`}>
          {isSuccess ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>

        <h3 className="text-lg font-bold text-white tracking-tight">
          {isSuccess ? 'Ledger Synchronized' : 'Sync Encountered Issue'}
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          {isSuccess 
            ? 'Your local transactions and balances are now matching your financial provider.' 
            : report.errorMessage || 'Upstream connection error.'}
        </p>

        {isSuccess && (
          <div className="mt-4 bg-zinc-950/70 rounded-2xl p-3 text-left text-xs space-y-2 border border-zinc-800/80">
            <div className="flex justify-between items-center text-zinc-300">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                New Transactions Added:
              </span>
              <span className="font-bold text-white font-mono">{report.transactionsAdded || 0}</span>
            </div>

            <div className="flex justify-between items-center text-zinc-300">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <RefreshCw className="w-3.5 h-3.5" />
                Status Updated (Pending→Posted):
              </span>
              <span className="font-bold text-white font-mono">{report.transactionsUpdated || 0}</span>
            </div>

            <div className="flex justify-between items-center text-zinc-400">
              <span>Duplicates Prevented:</span>
              <span className="font-mono">{report.duplicatesSkipped || 0}</span>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
