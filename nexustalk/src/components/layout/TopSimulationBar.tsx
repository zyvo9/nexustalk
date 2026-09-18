import React from 'react';
import { ShieldAlert, RefreshCw, EyeOff, WifiOff, Sun, Moon, Activity } from 'lucide-react';

interface TopSimulationBarProps {
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  isLoadingSkeleton: boolean;
  onToggleSkeleton: () => void;
  isEmptyState: boolean;
  onToggleEmptyState: () => void;
  isConnectionLost: boolean;
  onToggleConnectionLost: () => void;
  onTriggerConsentDialog: () => void;
  onOpenDebugOverlay: () => void;
}

export const TopSimulationBar: React.FC<TopSimulationBarProps> = ({
  isDarkTheme,
  onToggleTheme,
  isLoadingSkeleton,
  onToggleSkeleton,
  isEmptyState,
  onToggleEmptyState,
  isConnectionLost,
  onToggleConnectionLost,
  onTriggerConsentDialog,
  onOpenDebugOverlay,
}) => {
  return (
    <div className="h-9 px-3 bg-slate-950/90 border-b border-white/5 backdrop-blur-md flex items-center justify-between text-[11px] font-mono text-slate-400 z-40 select-none overflow-x-auto no-scrollbar shrink-0">
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <span className="text-slate-300 font-semibold uppercase tracking-wider font-sans text-[10px]">
          NexusTalk UI Showcase:
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Test Consent Dialog */}
        <button
          onClick={onTriggerConsentDialog}
          className="px-2 py-0.5 rounded-md bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 flex items-center gap-1 transition-colors"
          title="Simulate Host Consent Request"
        >
          <ShieldAlert className="w-3 h-3 text-red-400" />
          <span>Host Consent</span>
        </button>

        {/* Shimmer Skeleton Toggle */}
        <button
          onClick={onToggleSkeleton}
          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors ${
            isLoadingSkeleton
              ? 'bg-indigo-500/30 text-indigo-200 border-indigo-500/50'
              : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
          }`}
          title="Toggle Skeleton Loading States"
        >
          <RefreshCw className={`w-3 h-3 ${isLoadingSkeleton ? 'animate-spin' : ''}`} />
          <span>Skeletons</span>
        </button>

        {/* Empty State Toggle */}
        <button
          onClick={onToggleEmptyState}
          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors ${
            isEmptyState
              ? 'bg-amber-500/30 text-amber-200 border-amber-500/50'
              : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
          }`}
          title="Toggle Empty States"
        >
          <EyeOff className="w-3 h-3" />
          <span>Empty State</span>
        </button>

        {/* Connection Lost Toggle */}
        <button
          onClick={onToggleConnectionLost}
          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors ${
            isConnectionLost
              ? 'bg-rose-500/30 text-rose-200 border-rose-500/50'
              : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
          }`}
          title="Simulate Offline Connection Lost"
        >
          <WifiOff className="w-3 h-3" />
          <span>Offline State</span>
        </button>

        {/* QoS HUD */}
        <button
          onClick={onOpenDebugOverlay}
          className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 flex items-center gap-1 transition-colors"
          title="Open WebRTC QoS HUD"
        >
          <Activity className="w-3 h-3" />
          <span className="hidden sm:inline">QoS HUD</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1 transition-colors"
          title="Dark / Light Theme"
        >
          {isDarkTheme ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-400" />}
          <span>{isDarkTheme ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </div>
  );
};
