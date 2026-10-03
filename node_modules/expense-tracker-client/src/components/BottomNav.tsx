import React from 'react';
import { 
  Home, 
  ReceiptText, 
  PieChart, 
  Target, 
  Settings, 
  Layers 
} from 'lucide-react';

export type TabType = 'home' | 'transactions' | 'analytics' | 'budgets' | 'connections' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 0
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'transactions', label: 'Ledger', icon: ReceiptText, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'analytics', label: 'Insights', icon: PieChart },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'connections', label: 'Sync', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800/80 px-2 py-2 sm:px-6 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 ${
                isActive 
                  ? 'text-emerald-400 font-semibold' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-amber-500 text-black text-[10px] font-bold rounded-full">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 tracking-tight ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-3 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
