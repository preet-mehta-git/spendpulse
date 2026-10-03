import React, { useState, useEffect } from 'react';
import { FinancialConnection, Account, ReconciliationLog } from '../types.js';
import { 
  ShieldCheck, 
  Layers, 
  RefreshCw, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Info, 
  Server, 
  FileCheck, 
  Landmark, 
  ExternalLink, 
  X, 
  Phone, 
  Shield, 
  Search,
  Smartphone,
  Zap
} from 'lucide-react';
import { api } from '../api.js';

interface ConnectionsPageProps {
  onSync: () => void;
  isSyncing: boolean;
  onOpenSimulate: () => void;
  onOpenAndroidSync?: () => void;
}

const POPULAR_INDIAN_BANKS = [
  { id: 'IDFC_FIRST', name: 'IDFC First Bank', popular: true },
  { id: 'HDFC', name: 'HDFC Bank', popular: true },
  { id: 'ICICI', name: 'ICICI Bank', popular: true },
  { id: 'SBI', name: 'State Bank of India', popular: true },
  { id: 'AXIS', name: 'Axis Bank', popular: true },
  { id: 'KOTAK', name: 'Kotak Mahindra Bank', popular: true },
  { id: 'INDUSIND', name: 'IndusInd Bank', popular: false },
  { id: 'FEDERAL', name: 'Federal Bank', popular: false },
  { id: 'BOB', name: 'Bank of Baroda', popular: false },
  { id: 'PNB', name: 'Punjab National Bank', popular: false },
  { id: 'CANARA', name: 'Canara Bank', popular: false },
  { id: 'YES', name: 'Yes Bank', popular: false },
  { id: 'RBL', name: 'RBL Bank', popular: false }
];

export const ConnectionsPage: React.FC<ConnectionsPageProps> = ({
  onSync,
  isSyncing,
  onOpenSimulate,
  onOpenAndroidSync
}) => {
  const [connections, setConnections] = useState<FinancialConnection[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reconLogs, setReconLogs] = useState<ReconciliationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Live AA modal state
  const [showAAModal, setShowAAModal] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedBank, setSelectedBank] = useState('IDFC_FIRST');
  const [bankSearch, setBankSearch] = useState('');
  const [isConnectingAA, setIsConnectingAA] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [connRes, accRes, reconRes] = await Promise.all([
        api.getConnections(),
        api.getAccounts(),
        api.getReconciliationLogs()
      ]);
      setConnections(connRes.connections);
      setAccounts(accRes.accounts);
      setReconLogs(reconRes.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnectMock = async () => {
    try {
      await api.connectMockBank();
      loadData();
      onSync();
    } catch (err: any) {
      alert(`Connection failed: ${err.message}`);
    }
  };

  const handleConnectAA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber || mobileNumber.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number registered with your bank.');
      return;
    }
    setErrorMessage(null);
    setIsConnectingAA(true);
    try {
      const res = await api.connectAccountAggregator(mobileNumber);
      if (res.redirectUrl) {
        window.open(res.redirectUrl, '_blank');
      } else {
        const bankObj = POPULAR_INDIAN_BANKS.find(b => b.id === selectedBank);
        alert(`Account Aggregator consent initiated for ${bankObj?.name || selectedBank} (${mobileNumber})! Consent ID: ${res.connectionId || 'Pending'}`);
      }
      setShowAAModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate Account Aggregator session.');
    } finally {
      setIsConnectingAA(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this financial provider?')) return;
    try {
      await api.disconnectConnection(id);
      loadData();
    } catch (err: any) {
      alert(`Error disconnecting: ${err.message}`);
    }
  };

  const filteredBanks = POPULAR_INDIAN_BANKS.filter(b => 
    b.name.toLowerCase().includes(bankSearch.toLowerCase()) || 
    b.id.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Financial Account Connectors</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Automated synchronization gateways & bank ledger connections</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAndroidSync}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl text-xs transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Android Sync Setup
          </button>
          <button
            onClick={() => setShowAAModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 rounded-2xl text-xs font-semibold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect Bank (AA)
          </button>
          <button
            onClick={onOpenSimulate}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 rounded-2xl text-xs font-semibold transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Simulate Event
          </button>
        </div>
      </div>

      {/* Hero Banner: Android Real-Time Sync */}
      <div className="glass-card p-5 rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-zinc-900/80 to-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Android Real-Time Phone & SMS Sync
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ⚡ Zero-Touch Automated
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-1 max-w-xl">
              Sync transactions instantly when bank SMS or UPI alerts (GPay, PhonePe, Paytm, HDFC, SBI, ICICI, etc.) arrive on your phone.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAndroidSync}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs rounded-xl inline-flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 shrink-0 active:scale-95"
        >
          <Zap className="w-4 h-4" />
          Open Android Hub
        </button>
      </div>

      {/* Connected Financial Institutions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white">Active Data Providers ({connections.length})</h3>
        </div>

        {connections.length === 0 ? (
          <div className="glass-card p-6 rounded-3xl border border-zinc-800 text-center space-y-3">
            <Server className="w-10 h-10 text-zinc-500 mx-auto" />
            <h4 className="text-sm font-bold text-white">No active financial connections</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Connect the Mock Financial Provider to immediately populate realistic Indian accounts and transactions, or connect via Setu AA.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={handleConnectMock}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl border border-zinc-700"
              >
                Connect Mock Bank (Demo)
              </button>
              <button
                onClick={() => setShowAAModal(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20"
              >
                Connect Live Bank (AA)
              </button>
            </div>
          </div>
        ) : (
          connections.map((conn) => (
            <div key={conn.id} className="glass-card p-5 rounded-3xl border border-zinc-800/80 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border font-bold ${
                    conn.is_mock === 1 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {conn.is_mock === 1 ? 'MB' : 'AA'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">
                        {conn.is_mock === 1 ? 'Indian Banking Core Simulator (Demo)' : 'Setu Account Aggregator Gateway (Live)'}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        conn.status === 'connected' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {conn.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Consent: <span className="text-zinc-200 font-mono">{conn.consent_status}</span> • 
                      Last Sync: <span className="text-zinc-200">{conn.last_successful_sync ? new Date(conn.last_successful_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDisconnect(conn.id)}
                  className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
                  title="Disconnect provider"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Accounts under this connection */}
              <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/60 space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Connected Ledgers</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {accounts.filter(a => a.connection_id === conn.id).map(acc => (
                    <div key={acc.id} className="p-2.5 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs">
                      <div className="font-semibold text-zinc-200 truncate">{acc.account_name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{acc.masked_account_number}</div>
                      <div className="text-sm font-bold font-mono-numbers text-white mt-1">
                        ₹{acc.current_balance.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reconciliation Audit Logs */}
      <div className="glass-card p-5 rounded-3xl border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Reconciliation & Integrity Logs</h3>
          </div>
          <span className="text-[11px] text-zinc-500">Zero duplicate guarantee</span>
        </div>

        <div className="space-y-2">
          {reconLogs.length === 0 ? (
            <div className="text-center py-4 text-xs text-zinc-500">
              No reconciliation audit logs recorded yet.
            </div>
          ) : (
            reconLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60 text-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">Reconciliation Cycle Completed</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(log.synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Checked: <span className="font-mono text-zinc-200">{log.checked_count}</span> | 
                    Duplicates Prevented: <span className="font-mono text-zinc-200">{log.duplicate_count}</span> | 
                    Status Updated: <span className="font-mono text-zinc-200">{log.updated_count}</span>
                  </div>
                </div>

                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Account Aggregator Connection Modal */}
      {showAAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Connect Bank via Account Aggregator</h3>
                  <span className="text-[11px] text-zinc-400">RBI Licensed Consent Framework</span>
                </div>
              </div>
              <button 
                onClick={() => setShowAAModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConnectAA} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Mobile Number Registered with Bank
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Select Your Bank
                  </label>
                  <span className="text-[10px] text-zinc-500">{filteredBanks.length} banks supported</span>
                </div>

                {/* Bank Search Bar */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search bank (e.g. IDFC, HDFC, SBI...)"
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Bank Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredBanks.map((bank) => (
                    <button
                      type="button"
                      key={bank.id}
                      onClick={() => setSelectedBank(bank.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all relative ${
                        selectedBank === bank.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-sm'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="truncate">{bank.name}</div>
                      {bank.id === 'IDFC_FIRST' && (
                        <span className="text-[9px] font-bold text-amber-400 uppercase block mt-0.5">
                          ✓ AA Enabled
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Gateway Notice
                  </div>
                  <p className="leading-relaxed text-[11px]">{errorMessage}</p>
                </div>
              )}

              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                <div className="font-semibold text-zinc-300 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  IDFC First Bank ReBIT AA Specification
                </div>
                <p>
                  IDFC First Bank is natively integrated with RBI Account Aggregators (Setu, Anumati, Finvu). Your savings & credit card accounts link seamlessly via 1-time OTP.
                </p>
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAAModal(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnectingAA}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isConnectingAA ? 'Initiating Consent...' : 'Initiate AA Consent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
