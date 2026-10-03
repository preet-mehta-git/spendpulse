import React, { useState } from 'react';
import { 
  X, 
  Utensils, 
  Briefcase, 
  ShoppingBag, 
  ArrowRightLeft, 
  AlertTriangle,
  Play,
  Check
} from 'lucide-react';
import { api } from '../api.js';

interface SimulateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulated: () => void;
}

export const SimulateTransactionModal: React.FC<SimulateTransactionModalProps> = ({
  isOpen,
  onClose,
  onSimulated
}) => {
  if (!isOpen) return null;

  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [successScenario, setSuccessScenario] = useState<string | null>(null);

  const scenarios = [
    {
      id: 'swiggy_upi',
      title: 'Swiggy UPI Order',
      amount: '₹385.00',
      type: 'Food & Dining (UPI)',
      icon: Utensils,
      color: 'from-orange-500/20 to-amber-500/20 text-orange-400',
      description: 'Simulates a lunch payment via UPI from HDFC Salary Account'
    },
    {
      id: 'salary_credit',
      title: 'Salary & Bonus Credit',
      amount: '+₹92,500.00',
      type: 'Income (NEFT)',
      icon: Briefcase,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
      description: 'Simulates monthly salary deposit into HDFC Corporate account'
    },
    {
      id: 'amazon_card',
      title: 'Amazon Online Purchase',
      amount: '₹2,499.00',
      type: 'Shopping (Credit Card)',
      icon: ShoppingBag,
      color: 'from-pink-500/20 to-rose-500/20 text-pink-400',
      description: 'Simulates an e-commerce swipe on ICICI Sapphiro Credit Card'
    },
    {
      id: 'transfer',
      title: 'Cross-Account Transfer',
      amount: '₹10,000.00',
      type: 'Internal Transfer (IMPS)',
      icon: ArrowRightLeft,
      color: 'from-purple-500/20 to-indigo-500/20 text-purple-400',
      description: 'Moves ₹10k from HDFC to SBI Savings (auto-detected as non-expense)'
    },
    {
      id: 'sync_failure',
      title: 'Simulate Bank Downtime',
      amount: 'Error Recovery',
      type: 'Resilience Test',
      icon: AlertTriangle,
      color: 'from-red-500/20 to-orange-500/20 text-rose-400',
      description: 'Forces upstream timeout to test graceful sync failure & recovery'
    }
  ];

  const handleRun = async (scenarioId: any) => {
    setLoadingScenario(scenarioId);
    try {
      await api.simulateMockScenario(scenarioId);
      setSuccessScenario(scenarioId);
      setTimeout(() => {
        setSuccessScenario(null);
        onSimulated();
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-scale-up">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Simulate Banking Event</h3>
            <p className="text-xs text-zinc-400">Trigger simulated transactions to see auto-sync in action</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            const isLoading = loadingScenario === sc.id;
            const isDone = successScenario === sc.id;

            return (
              <div 
                key={sc.id}
                onClick={() => !isLoading && handleRun(sc.id)}
                className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl flex items-center justify-between gap-3 hover:border-zinc-700 hover:bg-zinc-950 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sc.color} flex items-center justify-center shrink-0 border border-white/5`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-zinc-200 truncate">{sc.title}</h4>
                      <span className="text-[10px] text-zinc-400 font-mono">{sc.amount}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{sc.description}</p>
                  </div>
                </div>

                <button
                  disabled={isLoading}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isDone 
                      ? 'bg-emerald-500 text-black' 
                      : 'bg-zinc-800 group-hover:bg-emerald-500 group-hover:text-black text-zinc-300'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-4 h-4" />
                  ) : isLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-800/80 text-center">
          <p className="text-[11px] text-zinc-500">
            Transactions are processed through normalization, deduplication & push alerts.
          </p>
        </div>
      </div>
    </div>
  );
};
