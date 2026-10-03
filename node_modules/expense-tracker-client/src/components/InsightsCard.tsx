import React from 'react';
import { Sparkles, TrendingUp, Lightbulb } from 'lucide-react';

interface InsightsCardProps {
  insights: string[];
}

export const InsightsCard: React.FC<InsightsCardProps> = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="glass-card p-4 sm:p-5 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-emerald-950/20 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Lightbulb className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-zinc-100 tracking-tight flex items-center gap-1.5">
          Ledger Intelligence & Trends
        </h3>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight, idx) => (
          <div 
            key={idx} 
            className="flex items-start gap-2 text-xs sm:text-sm text-zinc-300 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/50"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div 
              className="leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-300 font-semibold">$1</strong>') 
              }} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};
