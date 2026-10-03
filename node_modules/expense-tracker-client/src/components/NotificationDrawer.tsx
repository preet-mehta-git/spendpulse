import React from 'react';
import { NotificationRecord } from '../types.js';
import { X, Bell, Check, Sparkles, AlertTriangle, ArrowRightLeft, DollarSign } from 'lucide-react';
import { api } from '../api.js';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationRecord[];
  onRefresh: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onRefresh
}) => {
  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestPush = async () => {
    try {
      await api.triggerTestNotification();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'income': return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'transfer': return <ArrowRightLeft className="w-4 h-4 text-purple-400" />;
      case 'budget_alert': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default: return <Bell className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl p-6 flex flex-col justify-between animate-slide-left">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Sync Notifications</h3>
                <p className="text-[11px] text-zinc-400">{notifications.length} alerts logged</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Mark Read
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="mt-4 space-y-2.5 overflow-y-auto max-h-[70vh] pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No sync notifications yet. They will appear here when transactions are detected.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    notif.read === 1
                      ? 'bg-zinc-950/40 border-zinc-800/60 opacity-70'
                      : 'bg-zinc-950 border-zinc-700/80 shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0">
                      {getIcon(notif.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-zinc-100 truncate">{notif.title}</h4>
                        <span className="text-[10px] text-zinc-500 shrink-0">{formatTime(notif.sent_at)}</span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-0.5">{notif.body}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-zinc-800">
          <button
            onClick={handleTestPush}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Send Test Notification
          </button>
        </div>
      </div>
    </div>
  );
};
