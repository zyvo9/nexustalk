import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, ShieldCheck, Eye, MousePointerClick, X, Radio, AlertTriangle } from 'lucide-react';

interface ConsentDialogProps {
  isOpen: boolean;
  requesterName?: string;
  requesterAvatar?: string;
  requesterDevice?: string;
  onAccept: (mode: 'full-control' | 'view-only') => void;
  onDeny: () => void;
}

export const ConsentDialog: React.FC<ConsentDialogProps> = ({
  isOpen,
  requesterName = 'Sadman Sakib',
  requesterAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  requesterDevice = 'MacBook Pro 16" M3 (Nexus Client v2.4)',
  onAccept,
  onDeny,
}) => {
  const [countdown, setCountdown] = useState<number>(30);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(30);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDeny();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onDeny]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md rounded-3xl bg-slate-900/95 border border-rose-500/30 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl text-slate-100 overflow-hidden"
        >
          {/* Top glow ambient effect */}
          <div className="absolute -top-16 -left-16 w-36 h-36 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" /> Remote Control Request
                </span>
                <h3 className="text-base font-bold text-white mt-1">Incoming Access Request</h3>
              </div>
            </div>
            <button
              onClick={onDeny}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Requester Identity Card */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-white/5 flex items-center gap-3.5 mb-4">
            <img
              src={requesterAvatar}
              alt={requesterName}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/30"
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm text-slate-100 truncate">{requesterName}</h4>
              <p className="text-xs text-slate-400 truncate">{requesterDevice}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> End-to-end ECDH verified
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            <strong>{requesterName}</strong> is requesting remote access to view your screen, send mouse and keyboard inputs, and transfer files.
          </p>

          {/* Security details checklist */}
          <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3 mb-5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <MousePointerClick className="w-3.5 h-3.5 text-indigo-400" />
              <span>Direct mouse pointer & keystroke emulation</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Zero-latency 60 FPS hardware encoded stream</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-denying in <span className="font-bold text-amber-300 font-mono text-xs">{countdown}s</span> if no response</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5">
            <button
              onClick={() => onAccept('full-control')}
              className="w-full py-3 px-4 rounded-2xl accent-gradient on-accent font-semibold text-sm shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/45 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MousePointerClick className="w-4 h-4" />
              Allow full control
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAccept('view-only')}
                className="py-2.5 px-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 font-medium text-xs border border-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-sky-300" />
                View only
              </button>

              <button
                onClick={onDeny}
                className="py-2.5 px-3 rounded-2xl bg-white/[0.04] hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 font-medium text-xs border border-white/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                Deny
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const ActiveControlledBanner: React.FC<{
  controllerName: string;
  mode: 'full-control' | 'view-only';
  onDisconnect: () => void;
}> = ({ controllerName, mode, onDisconnect }) => {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      className="sticky top-0 z-40 w-full bg-gradient-to-r from-red-600 via-red-500 to-amber-600 text-white px-4 py-2 text-xs shadow-lg flex items-center justify-between font-medium backdrop-blur-md"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <span>
          <strong>Remote Host Active:</strong> Your screen is being {mode === 'full-control' ? 'controlled' : 'viewed'} by <strong>{controllerName}</strong>
        </span>
      </div>
      <button
        onClick={onDisconnect}
        className="px-3 py-1 rounded-lg bg-black/30 hover:bg-black/50 text-white font-bold text-[11px] uppercase tracking-wider transition-colors border border-white/20 active:scale-95"
      >
        Terminate Session
      </button>
    </motion.div>
  );
};
