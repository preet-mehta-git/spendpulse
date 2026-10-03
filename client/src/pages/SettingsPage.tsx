import React, { useState, useEffect } from 'react';
import { NotificationPreference, Category } from '../types.js';
import { 
  Bell, 
  Download, 
  ShieldCheck, 
  Sparkles, 
  User, 
  Plus, 
  Trash2, 
  Check, 
  Lock,
  Layers,
  HelpCircle
} from 'lucide-react';
import { api } from '../api.js';

interface SettingsPageProps {
  categories: Category[];
  onOpenExport: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  categories,
  onOpenExport
}) => {
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [userRules, setUserRules] = useState<any[]>([]);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Rule Form State
  const [pattern, setPattern] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [isAddingRule, setIsAddingRule] = useState(false);

  const loadData = async () => {
    try {
      const [prefsRes, rulesRes] = await Promise.all([
        api.getNotificationPreferences(),
        api.getUserRules()
      ]);
      setPrefs(prefsRes.preferences);
      setUserRules(rulesRes.rules);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdatePreference = async (updates: Partial<NotificationPreference>) => {
    if (!prefs) return;
    const newPrefs = { ...prefs, ...updates };
    setPrefs(newPrefs);
    setIsSavingPrefs(true);
    try {
      await api.updateNotificationPreferences(updates);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern || !selectedCatId) return;
    setIsAddingRule(true);
    try {
      await api.createUserRule({
        pattern,
        field: 'merchant',
        category_id: selectedCatId,
        priority: 1
      });
      setPattern('');
      setSelectedCatId('');
      loadData();
    } catch (err: any) {
      alert(`Error creating rule: ${err.message}`);
    } finally {
      setIsAddingRule(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await api.deleteUserRule(id);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">Settings & Preferences</h2>
        <p className="text-xs text-zinc-400 mt-0.5">Manage notifications, automated rules, exports, and security</p>
      </div>

      {/* User Profile Card */}
      <div className="glass-card p-5 rounded-3xl border border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 font-bold text-base">
            AS
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Aditya Sharma</h3>
            <p className="text-xs text-zinc-400">demo@spendpulse.local</p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Personal Ledger
        </span>
      </div>

      {/* Notification Preferences */}
      {prefs && (
        <div className="glass-card p-5 rounded-3xl border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Sync Notifications & Alerts</h3>
            </div>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 animate-fade-in">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-2xl border border-zinc-800/60 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">All Sync Alerts</span>
                <span className="text-[11px] text-zinc-400">Receive alert when new transaction is detected</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.enabled === 1}
                onChange={(e) => handleUpdatePreference({ enabled: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-zinc-700"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-2xl border border-zinc-800/60 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">Income & Salary Credits</span>
                <span className="text-[11px] text-zinc-400">Alert whenever deposits or refunds arrive</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.income_enabled === 1}
                onChange={(e) => handleUpdatePreference({ income_enabled: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-zinc-700"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-2xl border border-zinc-800/60 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">High-Value Expense Alert</span>
                <span className="text-[11px] text-zinc-400">Notify for large swipes above ₹5,000</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.large_tx_alert === 1}
                onChange={(e) => handleUpdatePreference({ large_tx_alert: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-zinc-700"
              />
            </label>
          </div>
        </div>
      )}

      {/* Layer 2: Custom User Categorization Rules */}
      <div className="glass-card p-5 rounded-3xl border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Custom Categorization Rules (Layer 2)</h3>
          </div>
          <span className="text-[11px] text-zinc-500">{userRules.length} rules active</span>
        </div>

        {/* Add Rule Form */}
        <form onSubmit={handleCreateRule} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/60">
          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="If merchant contains (e.g. 'CORNER HOUSE')..."
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="sm:col-span-5">
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Assign to category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isAddingRule}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </form>

        {/* Rules List */}
        <div className="space-y-2">
          {userRules.length === 0 ? (
            <div className="text-center py-4 text-xs text-zinc-500">
              No custom rules created yet. Add a keyword above to force categorization.
            </div>
          ) : (
            userRules.map((rule) => (
              <div key={rule.id} className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono text-zinc-200 font-bold">"{rule.pattern}"</span>
                  <span className="text-zinc-500 mx-2">→</span>
                  <span className="text-emerald-400 font-medium">{rule.category_name}</span>
                </div>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Data Export & Backup */}
      <div className="glass-card p-5 rounded-3xl border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            Data Export & Backup
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Export full normalized ledger in CSV or JSON format</p>
        </div>

        <button
          onClick={onOpenExport}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl border border-zinc-700 transition-all shrink-0"
        >
          Export Ledger
        </button>
      </div>

      {/* Demo & Test Data Management */}
      <div className="glass-card p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-zinc-900/40 to-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-amber-400" />
            Demo / Mock Data Management
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Wipe all simulated banking connections & sample test transactions to start with a 100% clean personal ledger</p>
        </div>

        <button
          onClick={async () => {
            if (!confirm('Are you sure you want to remove all demo mock accounts and sample transactions? Your real mobile sync entries will NOT be touched.')) return;
            try {
              const res = await api.clearDemoData();
              alert(res.message || 'Demo data removed successfully!');
              window.location.reload();
            } catch (err: any) {
              alert(`Error: ${err.message}`);
            }
          }}
          className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/40 transition-all shrink-0 active:scale-95"
        >
          Clear Demo Data
        </button>
      </div>

      {/* Privacy & Zero-Knowledge Architecture Guarantee */}
      <div className="glass-card p-5 rounded-3xl border border-zinc-800/80 bg-zinc-950/50 space-y-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2 text-zinc-200 font-bold">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Security & Privacy Protocol</span>
        </div>
        <p className="leading-relaxed">
          This personal tracker communicates directly with local/authorized financial gateways using cryptographic consent tokens. **Bank passwords, UPI PINs, ATM PINs, and OTPs are never stored or requested.**
        </p>
      </div>
    </div>
  );
};
