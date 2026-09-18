import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, Video, PhoneOff, Minimize2, ShieldCheck, Sparkles } from 'lucide-react';

interface ActiveVoiceCallModalProps {
  isOpen: boolean;
  contactName: string;
  contactAvatar: string;
  onEndCall: () => void;
  onSwitchToVideo: () => void;
}

export const ActiveVoiceCallModal: React.FC<ActiveVoiceCallModalProps> = ({
  isOpen,
  contactName,
  contactAvatar,
  onEndCall,
  onSwitchToVideo,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setSeconds(0);
      return;
    }
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-950 border border-white/10 p-6 flex flex-col items-center justify-between min-h-[520px] shadow-2xl shadow-indigo-950/50 text-slate-100"
        >
          {/* Animated Ambient Pulsing Rings */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/10 pulse-ring pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-cyan-500/15 pulse-ring pointer-events-none" />

          {/* Top Status Header */}
          <div className="w-full flex items-center justify-between text-xs z-10">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" /> E2EE Voice
            </span>
            <span className="font-mono text-cyan-300 font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              {formatDuration(seconds)}
            </span>
          </div>

          {/* Avatar & Voice Waves */}
          <div className="flex flex-col items-center z-10 my-auto">
            <div className="relative mb-5">
              <img
                src={contactAvatar}
                alt={contactName}
                className="w-28 h-28 rounded-3xl object-cover ring-4 ring-indigo-500/50 shadow-2xl shadow-indigo-500/30"
              />
              {/* Voice Speaking Ripple Indicator */}
              <div className="absolute -bottom-2 inset-x-0 flex justify-center gap-1">
                <span className="w-1.5 h-4 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-6 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-8 bg-cyan-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white text-center">{contactName}</h3>
            <p className="text-xs text-slate-400 mt-1">High-Definition Opus 48kHz Voice</p>
          </div>

          {/* Control Bar */}
          <div className="w-full space-y-4 z-10">
            <div className="flex items-center justify-center gap-3">
              {/* Mute Toggle */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsMuted(!isMuted)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </motion.button>

              {/* Speaker Toggle */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsSpeaker(!isSpeaker)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  isSpeaker
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}
                title="Speaker"
              >
                {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </motion.button>

              {/* Switch to Video */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onSwitchToVideo}
                className="w-14 h-14 rounded-2xl bg-white/10 text-white hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all"
                title="Switch to Video"
              >
                <Video className="w-6 h-6 text-indigo-300" />
              </motion.button>
            </div>

            {/* End Call Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEndCall}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              <span>End Voice Call</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
