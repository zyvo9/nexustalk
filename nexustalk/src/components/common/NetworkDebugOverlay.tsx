import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, X, Wifi, Shield, Cpu, RefreshCw, Zap } from 'lucide-react';

interface NetworkDebugOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkDebugOverlay: React.FC<NetworkDebugOverlayProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState({
    ping: 18,
    fps: 59.8,
    bitrate: 8.6, // Mbps
    packetLoss: 0.02, // %
    codec: 'AV1 / Opus 48kHz',
    connectionType: 'Direct P2P (Host-to-Host)',
    stunTurn: 'ICE candidate pair selected (UDP 51820)',
    jitter: '1.2 ms',
    resolution: '2560 x 1440 @ 60Hz',
  });

  // Dynamic simulation of slight network fluctuations
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        ping: Math.floor(16 + Math.random() * 5),
        fps: +(59.2 + Math.random() * 0.8).toFixed(1),
        bitrate: +(8.2 + Math.random() * 0.9).toFixed(1),
        packetLoss: +(Math.random() * 0.04).toFixed(2),
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="fixed top-14 right-4 z-50 w-84 rounded-2xl bg-slate-950/90 border border-cyan-500/30 p-4 text-xs font-mono text-slate-200 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>QoS WebRTC Diagnostic HUD</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 rounded-xl bg-slate-900/90 border border-white/5">
            <span className="text-[10px] text-slate-400 block mb-0.5">RTT LATENCY</span>
            <span className="text-base font-bold text-emerald-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> {metrics.ping} ms
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/90 border border-white/5">
            <span className="text-[10px] text-slate-400 block mb-0.5">STREAM FPS</span>
            <span className="text-base font-bold text-cyan-400 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> {metrics.fps}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/90 border border-white/5">
            <span className="text-[10px] text-slate-400 block mb-0.5">THROUGHPUT</span>
            <span className="text-sm font-bold text-indigo-400 flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" /> {metrics.bitrate} Mbps
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/90 border border-white/5">
            <span className="text-[10px] text-slate-400 block mb-0.5">PACKET LOSS</span>
            <span className="text-sm font-bold text-emerald-400">
              {metrics.packetLoss}%
            </span>
          </div>
        </div>

        <div className="space-y-1.5 text-[11px] text-slate-300 pt-1 border-t border-white/5">
          <div className="flex justify-between">
            <span className="text-slate-400">Codec:</span>
            <span className="text-white font-medium">{metrics.codec}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Pipeline:</span>
            <span className="text-emerald-400 font-medium">{metrics.connectionType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Jitter Buffer:</span>
            <span>{metrics.jitter}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Canvas Res:</span>
            <span className="text-slate-200">{metrics.resolution}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-cyan-400" /> DTLS 1.3 / SRTP
            </span>
            <span className="text-emerald-400">Zero Relay</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
