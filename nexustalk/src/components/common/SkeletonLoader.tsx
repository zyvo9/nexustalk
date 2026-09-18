import React from 'react';

export const ChatItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-900/40 border border-white/5 animate-pulse mb-2">
      <div className="w-12 h-12 rounded-full bg-slate-800 animate-shimmer shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="w-28 h-3.5 rounded bg-slate-800 animate-shimmer" />
          <div className="w-10 h-3 rounded bg-slate-800 animate-shimmer" />
        </div>
        <div className="w-48 h-3 rounded bg-slate-800/60 animate-shimmer" />
      </div>
    </div>
  );
};

export const DeviceCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 animate-shimmer" />
          <div className="space-y-1.5">
            <div className="w-32 h-3.5 rounded bg-slate-800 animate-shimmer" />
            <div className="w-20 h-2.5 rounded bg-slate-800/60 animate-shimmer" />
          </div>
        </div>
        <div className="w-14 h-6 rounded-full bg-slate-800 animate-shimmer" />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
        <div className="h-4 rounded bg-slate-800/50 animate-shimmer" />
        <div className="h-4 rounded bg-slate-800/50 animate-shimmer" />
      </div>
    </div>
  );
};

export const CallItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-white/5 animate-pulse mb-2">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-full bg-slate-800 animate-shimmer" />
        <div className="space-y-1.5">
          <div className="w-32 h-3.5 rounded bg-slate-800 animate-shimmer" />
          <div className="w-24 h-2.5 rounded bg-slate-800/60 animate-shimmer" />
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-slate-800 animate-shimmer" />
    </div>
  );
};
