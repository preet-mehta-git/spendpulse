import React, { useState, useEffect } from 'react';
import { 
  DashboardMetrics, 
  Transaction, 
  Category, 
  Account, 
  NotificationRecord 
} from './types.js';
import { Header } from './components/Header.js';
import { BottomNav, TabType } from './components/BottomNav.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { TransactionsPage } from './pages/TransactionsPage.js';
import { AnalyticsPage } from './pages/AnalyticsPage.js';
import { BudgetsPage } from './pages/BudgetsPage.js';
import { ConnectionsPage } from './pages/ConnectionsPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { TransactionDetailDrawer } from './components/TransactionDetailDrawer.js';
import { SyncStatusModal } from './components/SyncStatusModal.js';
import { SimulateTransactionModal } from './components/SimulateTransactionModal.js';
import { NotificationDrawer } from './components/NotificationDrawer.js';
import { ExportModal } from './components/ExportModal.js';
import { AndroidSyncHubModal } from './components/AndroidSyncHubModal.js';
import { QuickAddModal } from './components/QuickAddModal.js';
import { Smartphone, Zap, Plus, X } from 'lucide-react';
import { api } from './api.js';

interface RealtimeAlert {
  message: string;
  amount: number;
  merchant: string;
  type: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncReport, setLastSyncReport] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Modals and Drawers
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAndroidSyncModal, setShowAndroidSyncModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  // Real-time Event Toast Banner
  const [realtimeAlert, setRealtimeAlert] = useState<RealtimeAlert | null>(null);

  // Offline detection
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [dashRes, catRes, accRes, notifRes, syncRes] = await Promise.all([
        api.getDashboard().catch(() => null),
        api.getCategories().catch(() => ({ categories: [] })),
        api.getAccounts().catch(() => ({ accounts: [] })),
        api.getNotifications().catch(() => ({ notifications: [] })),
        api.getSyncStatus().catch(() => ({ lastSyncTime: null, connections: [] }))
      ]);

      if (dashRes) setMetrics(dashRes);
      if (catRes) setCategories(catRes.categories);
      if (accRes) setAccounts(accRes.accounts);
      if (notifRes) setNotifications(notifRes.notifications);
      if (syncRes) setLastSyncTime(syncRes.lastSyncTime);
    } catch (e) {
      console.error('Failed to load initial data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Connect to Server-Sent Events (SSE) for Real-Time Android Phone Ingestion
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const setupSSE = async () => {
      const token = await api.getValidToken();
      if (!token) return;

      const sseUrl = `/api/sync/live-stream?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'transaction_created') {
            const tx = payload.data?.transaction;
            if (tx) {
              setRealtimeAlert({
                message: payload.data?.message || `Recorded ₹${tx.amount} at ${tx.merchant_name}`,
                amount: tx.amount,
                merchant: tx.merchant_name,
                type: tx.transaction_type
              });
              setTimeout(() => setRealtimeAlert(null), 6000);
              loadAllData();
            }
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
      };
    };

    setupSSE();

    return () => {
      eventSource?.close();
    };
  }, []);

  // Sync Now Trigger
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncAll();
      const firstReport = res.reports?.[0] || { status: 'success', transactionsAdded: 0, transactionsUpdated: 0, duplicatesSkipped: 0 };
      setLastSyncReport(firstReport);
      await loadAllData();
    } catch (err: any) {
      setLastSyncReport({ status: 'failed', errorMessage: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateTransaction = async (id: string, updates: { category_id?: string; notes?: string; is_recurring?: boolean }) => {
    const res = await api.updateTransaction(id, updates);
    setSelectedTx(res.transaction);
    loadAllData();
  };

  const unreadCount = notifications.filter(n => n.read === 0).length;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col antialiased relative">
      
      {/* Real-Time Floating Ingestion Toast Alert */}
      {realtimeAlert && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce-in">
          <div className="p-3.5 bg-gradient-to-r from-emerald-950 via-zinc-900 to-zinc-950 border border-emerald-500/50 rounded-2xl shadow-2xl shadow-emerald-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 fill-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>⚡ Real-Time Android Transaction</span>
                </div>
                <p className="text-xs text-emerald-300 font-semibold mt-0.5">
                  ₹{realtimeAlert.amount.toLocaleString('en-IN')} at {realtimeAlert.merchant}
                </p>
              </div>
            </div>

            <button
              onClick={() => setRealtimeAlert(null)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header
        isSyncing={isSyncing}
        onSync={handleSync}
        lastSyncTime={lastSyncTime}
        hasMockConnection={true}
        unreadNotifications={unreadCount}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenAndroidSync={() => setShowAndroidSyncModal(true)}
        onOpenQuickAdd={() => setShowQuickAddModal(true)}
        isOffline={isOffline}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24">
        {activeTab === 'home' && (
          <DashboardPage
            metrics={metrics}
            isLoading={isLoading}
            onSelectTransaction={(tx) => setSelectedTx(tx)}
            onOpenSimulate={() => setShowSimulateModal(true)}
            onViewAllTransactions={() => setActiveTab('transactions')}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsPage
            onSelectTransaction={(tx) => setSelectedTx(tx)}
            categories={categories}
            accounts={accounts}
            onOpenExport={() => setShowExportModal(true)}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsPage metrics={metrics} />
        )}

        {activeTab === 'budgets' && (
          <BudgetsPage categories={categories} />
        )}

        {activeTab === 'connections' && (
          <ConnectionsPage
            onSync={handleSync}
            isSyncing={isSyncing}
            onOpenSimulate={() => setShowSimulateModal(true)}
            onOpenAndroidSync={() => setShowAndroidSyncModal(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            categories={categories}
            onOpenExport={() => setShowExportModal(true)}
          />
        )}
      </main>

      {/* Floating Action Button for Mobile Quick Log */}
      <button
        onClick={() => setShowQuickAddModal(true)}
        className="fixed bottom-20 right-4 sm:hidden z-40 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-xl shadow-emerald-500/30 flex items-center justify-center transition-transform active:scale-90"
        title="Quick Log / Paste SMS"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Bottom Mobile Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Transaction Detail Drawer */}
      <TransactionDetailDrawer
        transaction={selectedTx}
        categories={categories}
        onClose={() => setSelectedTx(null)}
        onUpdate={handleUpdateTransaction}
      />

      {/* Sync Status Feedback Modal */}
      {lastSyncReport && (
        <SyncStatusModal
          report={lastSyncReport}
          onClose={() => setLastSyncReport(null)}
        />
      )}

      {/* Simulate Banking Event Modal */}
      <SimulateTransactionModal
        isOpen={showSimulateModal}
        onClose={() => setShowSimulateModal(false)}
        onSimulated={loadAllData}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onRefresh={loadAllData}
      />

      {/* Android Real-Time Sync Hub Modal */}
      <AndroidSyncHubModal
        isOpen={showAndroidSyncModal}
        onClose={() => setShowAndroidSyncModal(false)}
        onTransactionAdded={loadAllData}
      />

      {/* Quick Add / SMS Paste Modal */}
      <QuickAddModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onSuccess={loadAllData}
      />

      {/* Export CSV / JSON Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}

export default App;
