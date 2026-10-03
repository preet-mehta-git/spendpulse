import { 
  RefreshCw, 
  Bell, 
  ShieldCheck, 
  Sparkles,
  WifiOff,
  Smartphone,
  Plus
} from 'lucide-react';

interface HeaderProps {
  isSyncing: boolean;
  onSync: () => void;
  lastSyncTime?: string | null;
  hasMockConnection: boolean;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  onOpenAndroidSync: () => void;
  onOpenQuickAdd: () => void;
  isOffline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isSyncing,
  onSync,
  lastSyncTime,
  hasMockConnection,
  unreadNotifications,
  onOpenNotifications,
  onOpenAndroidSync,
  onOpenQuickAdd,
  isOffline
}) => {
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'Not synced';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 px-4 py-3 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Logo & App Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-black font-extrabold text-base">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">SpendPulse</h1>
              {hasMockConnection ? (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Demo Data
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Live Sync
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">Personal Automatic Finance & Ledger Tracker</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isOffline && (
            <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-xl">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Offline</span>
            </div>
          )}

          {/* Quick Log Button */}
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            title="Fast Log / Paste Bank SMS"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Quick Log</span>
          </button>

          {/* Android Realtime Sync Button */}
          <button
            onClick={onOpenAndroidSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-700/80 active:scale-95 transition-all"
            title="Android Phone Real-Time Sync & Webhook"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Android Sync</span>
          </button>

          {/* Sync Button */}
          <button
            onClick={onSync}
            disabled={isSyncing || isOffline}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isSyncing
                ? 'bg-zinc-800 text-zinc-400 border-zinc-700 cursor-not-allowed'
                : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:bg-zinc-800 active:scale-95'
            }`}
            title="Fetch and synchronize bank ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="font-medium hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 transition-all active:scale-95"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
