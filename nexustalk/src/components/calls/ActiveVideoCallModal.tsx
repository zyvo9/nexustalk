import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  PhoneOff,
  LayoutGrid,
  Maximize2,
  Users,
  Settings,
  ShieldCheck,
  Volume2
} from 'lucide-react';

interface ActiveVideoCallModalProps {
  isOpen: boolean;
  contactName: string;
  contactAvatar: string;
  onEndCall: () => void;
  onStartScreenShare: () => void;
}

export const ActiveVideoCallModal: React.FC<ActiveVideoCallModalProps> = ({
  isOpen,
  contactName,
  contactAvatar,
  onEndCall,
  onStartScreenShare,
}) => {
  const [layoutMode, setLayoutMode] = useState<'grid' | 'speaker'>('grid');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

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

  const participants = [
    {
      id: 'p1',
      name: contactName,
      avatar: contactAvatar,
      isSpeaking: true,
      videoBg: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 'p2',
      name: 'Sadman Sakib (You)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isSpeaking: false,
      videoBg: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 'p3',
      name: 'Tanvir Ahmed',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      isSpeaking: false,
      videoBg: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 'p4',
      name: 'Priya Sen',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      isSpeaking: false,
      videoBg: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-5xl h-[88vh] rounded-3xl overflow-hidden bg-slate-950 border border-white/10 flex flex-col shadow-2xl"
        >
          {/* Top Floating Bar */}
          <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-white">Encrypted HD Video</span>
              <span className="text-slate-400 font-mono">• {formatDuration(seconds)}</span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setLayoutMode(layoutMode === 'grid' ? 'speaker' : 'grid')}
                className="px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                <span>{layoutMode === 'grid' ? 'Speaker View' : 'Grid View'}</span>
              </button>
            </div>
          </div>

          {/* Video Grid Tiles */}
          <div className="flex-1 p-4 pt-16 pb-24 overflow-hidden">
            {layoutMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className={`relative rounded-2xl overflow-hidden bg-slate-900 border transition-all ${
                      p.isSpeaking
                        ? 'border-cyan-400 ring-2 ring-cyan-400/30'
                        : 'border-white/10'
                    }`}
                  >
                    {/* Video simulation image */}
                    <img
                      src={p.videoBg}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />

                    {/* Participant Name badge */}
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs text-white border border-white/10 flex items-center gap-2">
                      <img src={p.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                      <span>{p.name}</span>
                      {p.isSpeaking && (
                        <Volume2 className="w-3 h-3 text-cyan-400 animate-pulse" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Speaker Layout */
              <div className="flex flex-col sm:flex-row gap-3 h-full">
                <div className="flex-1 relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-cyan-400">
                  <img
                    src={participants[0].videoBg}
                    alt={participants[0].name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-white border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="font-semibold">{participants[0].name} (Speaking)</span>
                  </div>
                </div>

                {/* Thumbnails strip */}
                <div className="sm:w-48 flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto">
                  {participants.slice(1).map((p) => (
                    <div
                      key={p.id}
                      className="h-28 sm:h-32 w-40 sm:w-full shrink-0 relative rounded-xl overflow-hidden bg-slate-900 border border-white/10"
                    >
                      <img src={p.videoBg} alt={p.name} className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded text-white truncate max-w-[90%]">
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Floating Controls Bar */}
          <div className="absolute bottom-5 inset-x-0 flex justify-center z-30 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-4 p-2.5 px-4 rounded-2xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-xl">
              {/* Mic button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-xl transition-all ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </motion.button>

              {/* Camera button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`p-3 rounded-xl transition-all ${
                  isVideoOff
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
              </motion.button>

              {/* Screen share button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onStartScreenShare}
                className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md hover:brightness-110"
                title="Share Screen"
              >
                <ScreenShare className="w-5 h-5" />
              </motion.button>

              {/* End Call Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onEndCall}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/30 hover:brightness-110"
              >
                <PhoneOff className="w-5 h-5" />
                <span className="hidden sm:inline text-xs">End</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
