import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Monitor,
  Play,
  ShieldCheck,
  TerminalSquare,
  CircleDot
} from 'lucide-react';
import { getSocket } from '../../lib/realtime';
import { EmptyState } from '../common/EmptyState';

interface DevicesTabProps {
  onOpenSession: () => void;
}

/** REAL remote control: control the PC where the NexusTalk agent is running. */
export const DevicesTab: React.FC<DevicesTabProps> = ({ onOpenSession }) => {
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null); // null = checking

  useEffect(() => {
    const socket = getSocket();
    const onStatus = (data: { online: boolean }) => setAgentOnline(data.online);
    socket.on('agent:status', onStatus);
    socket.emit('agent:status-check');

    const poll = setInterval(() => socket.emit('agent:status-check'), 5000);
    return () => {
      socket.off('agent:status', onStatus);
      clearInterval(poll);
    };
  }, []);

  const startSession = () => {
    if (agentOnline) onOpenSession();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 overflow-y-auto p-4 sm:p-8 space-y-6 relative">
      <div className="aurora-bg opacity-40" />

      {/* Hero */}
      <div className="relative z-10 rounded-3xl glass p-6 sm:p-7 shadow-xl">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
          Remote Access
        </h2>
        <p className="text-sm text-slate-400 mt-1.5 leading-relaxed max-w-xl">
          Control your PC from anywhere — your phone becomes the controller,
          this PC's screen streams to you via WebRTC (P2P, encrypted).
        </p>
      </div>

      {/* This PC — the real agent */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-100">My devices</h3>
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <TerminalSquare className="w-3.5 h-3.5" />
            agent: start-agent.bat
          </span>
        </div>

        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="rounded-3xl bg-slate-900/70 border border-white/[0.07] p-5 sm:p-6 shadow-lg backdrop-blur-md flex flex-col justify-between gap-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 text-slate-200 flex items-center justify-center shrink-0">
                <Monitor className="w-6 h-6" strokeWidth={1.7} />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-slate-100">
                  This PC <span className="text-slate-500 font-normal">· Windows</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  NexusTalk agent · {import.meta.env.VITE_AGENT || 'host'}
                </p>
              </div>
            </div>

            {agentOnline === null ? (
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <CircleDot className="w-3 h-3 animate-pulse" /> Checking…
              </span>
            ) : agentOnline ? (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 shrink-0">
                <span className="w-2 h-2 rounded-full bg-slate-600" /> Offline
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Run <span className="font-mono text-slate-400">start-agent.bat</span> on this PC
            to bring it online. Then any device logged in with this account can control it.
          </p>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
              P2P · encrypted
            </span>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={startSession}
              disabled={!agentOnline}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all ${
                agentOnline
                  ? 'accent-gradient on-accent shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/45 cursor-pointer'
                  : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start session</span>
            </motion.button>
          </div>
        </motion.div>

        {agentOnline === false && (
          <div className="mt-4">
            <EmptyState
              type="devices"
              title="Agent offline"
              description="Double-click start-agent.bat in the agent folder — this PC will come online instantly."
            />
          </div>
        )}
      </div>

      {/* Coming soon */}
      <div className="relative z-10 rounded-3xl border border-dashed border-white/15 p-5 text-xs text-slate-500 leading-relaxed">
        <p className="font-semibold text-slate-300 mb-1.5">Coming soon</p>
        More devices (laptop/phone as host), file transfer between devices, and
        full-screen touch gestures on mobile as the controller.
      </div>
    </div>
  );
};
