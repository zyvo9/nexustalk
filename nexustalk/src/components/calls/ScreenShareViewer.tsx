import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Sliders,
  X,
  Maximize2,
  Minimize2,
  Volume2,
  Sparkles,
  MousePointer,
  Check,
  Zap,
  Radio
} from 'lucide-react';

interface ScreenShareViewerProps {
  isOpen: boolean;
  presenterName: string;
  onClose: () => void;
}

export const ScreenShareViewer: React.FC<ScreenShareViewerProps> = ({
  isOpen,
  presenterName,
  onClose,
}) => {
  const [qualityPreset, setQualityPreset] = useState<'ultra' | 'balanced' | 'low-latency'>('ultra');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showPointer, setShowPointer] = useState(true);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden"
        >
          {/* Top Floating Glass HUD */}
          <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between pointer-events-none">
            {/* Presenter info + Quality Badge */}
            <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/80 border border-white/10 backdrop-blur-xl px-3.5 py-2 rounded-2xl shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{presenterName}'s Display</span>
                  <span className="text-[10px] text-cyan-300 font-normal px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    Live 60 FPS
                  </span>
                </h4>
                {/* Stats badge */}
                <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono mt-0.5">
                  <span className="text-emerald-400 font-semibold">14ms RTT</span>
                  <span>•</span>
                  <span>60 FPS</span>
                  <span>•</span>
                  <span>8.4 Mbps (AV1)</span>
                </div>
              </div>
            </div>

            {/* Right Tools & Close */}
            <div className="pointer-events-auto flex items-center gap-2">
              {/* Request Quality Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="px-3 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 backdrop-blur-xl text-xs text-white font-medium flex items-center gap-1.5 transition-all shadow-lg"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="capitalize">{qualityPreset}</span>
                </button>

                <AnimatePresence>
                  {showQualityMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-12 w-48 rounded-2xl bg-slate-900 border border-white/10 p-2 shadow-2xl z-40 space-y-1 text-xs"
                    >
                      <span className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Stream Quality
                      </span>
                      <button
                        onClick={() => {
                          setQualityPreset('ultra');
                          setShowQualityMenu(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between ${
                          qualityPreset === 'ultra' ? 'bg-indigo-600/30 text-cyan-300 font-semibold' : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <div>
                          <span className="block">1080p 60fps Ultra</span>
                          <span className="text-[10px] text-slate-400">High bitrate fidelity</span>
                        </div>
                        {qualityPreset === 'ultra' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                      <button
                        onClick={() => {
                          setQualityPreset('balanced');
                          setShowQualityMenu(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between ${
                          qualityPreset === 'balanced' ? 'bg-indigo-600/30 text-cyan-300 font-semibold' : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <div>
                          <span className="block">720p 60fps Balanced</span>
                          <span className="text-[10px] text-slate-400">Optimal bandwidth</span>
                        </div>
                        {qualityPreset === 'balanced' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                      <button
                        onClick={() => {
                          setQualityPreset('low-latency');
                          setShowQualityMenu(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between ${
                          qualityPreset === 'low-latency' ? 'bg-indigo-600/30 text-cyan-300 font-semibold' : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <div>
                          <span className="block">Sub-10ms Fast</span>
                          <span className="text-[10px] text-slate-400">Zero packet buffer</span>
                        </div>
                        {qualityPreset === 'low-latency' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 backdrop-blur-xl transition-all shadow-lg"
                title="Stop Viewing Screen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Realistic Shared Screen Display Mock */}
          <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            <div className="relative w-full h-full max-w-6xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900 flex flex-col select-none">
              {/* Mock OS Window Titlebar */}
              <div className="h-8 px-4 bg-slate-950/80 border-b border-white/10 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 font-mono text-[11px] text-slate-300">
                    workstation-dev ~ nexus-talk/webrtc-core (VS Code)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400">P2P Stream Active</span>
              </div>

              {/* Simulated Desktop / Code editor content */}
              <div className="flex-1 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-hidden flex flex-col justify-between">
                <div className="space-y-1.5 opacity-90">
                  <p className="text-slate-500">// NexusTalk WebRTC Direct Mesh Session</p>
                  <p>
                    <span className="text-purple-400">import</span> &#123; createPeerConnection, enableHardwareAV1 &#125; <span className="text-purple-400">from</span> <span className="text-emerald-300">'@nexus/stream-engine'</span>;
                  </p>
                  <p className="text-slate-400">
                    <span className="text-blue-400">const</span> session = <span className="text-yellow-300">await</span> createPeerConnection(&#123;
                  </p>
                  <p className="pl-4 text-cyan-300">
                    remoteHost: <span className="text-emerald-300">"MacBook-Pro-M3"</span>,
                  </p>
                  <p className="pl-4 text-cyan-300">
                    framerateTarget: <span className="text-amber-400">60</span>,
                  </p>
                  <p className="pl-4 text-cyan-300">
                    hardwareAcceleration: <span className="text-purple-400">true</span>,
                  </p>
                  <p className="pl-4 text-cyan-300">
                    inputForwarding: <span className="text-purple-400">true</span>,
                  </p>
                  <p className="text-slate-400">&#125;);</p>
                  <p className="text-emerald-400 mt-3 font-semibold">
                    ✓ Connection established via ICE candidate pair UDP 51820
                  </p>
                  <p className="text-cyan-400">
                    ✓ Mouse pointer coordinate synchronization active (0.4ms polling)
                  </p>
                </div>

                {/* Simulated Floating Pointer */}
                {showPointer && (
                  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <MousePointer className="w-5 h-5 text-cyan-400 fill-cyan-400 drop-shadow-md animate-bounce" />
                    <span className="px-2 py-0.5 rounded bg-cyan-500 text-black text-[10px] font-bold font-sans">
                      {presenterName}
                    </span>
                  </div>
                )}

                {/* Simulated Terminal bar at bottom */}
                <div className="rounded-xl bg-black/60 border border-white/10 p-3 text-[11px] font-mono text-emerald-400">
                  <span className="text-slate-500">$</span> nexus-talk-agent --status --fps=60<br />
                  <span className="text-slate-300">Stream status: HEALTHY | Bitrate: 8.42 Mbps | Frame Drops: 0</span>
                </div>
              </div>
            </div>

            {/* Minimized Participant Strip */}
            <div className="absolute bottom-6 right-8 z-30 flex items-center gap-2 bg-slate-900/90 border border-white/10 p-1.5 rounded-2xl shadow-xl backdrop-blur-xl">
              <div className="relative w-16 h-12 rounded-xl overflow-hidden ring-1 ring-cyan-400">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
                  alt="Ayesha"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 text-[9px] text-white font-bold bg-black/60 px-1 rounded">
                  Ayesha
                </span>
              </div>
              <div className="relative w-16 h-12 rounded-xl overflow-hidden ring-1 ring-white/10">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  alt="Sadman"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 text-[9px] text-white font-bold bg-black/60 px-1 rounded">
                  You
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
