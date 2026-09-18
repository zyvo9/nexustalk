import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Command, Check } from 'lucide-react';

interface RemoteKeyboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendShortcut: (shortcutName: string) => void;
}

export const RemoteKeyboardModal: React.FC<RemoteKeyboardModalProps> = ({
  isOpen,
  onClose,
  onSendShortcut,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTrigger = (keyName: string) => {
    onSendShortcut(keyName);
    setFeedback(`Sent ${keyName}`);
    setTimeout(() => setFeedback(null), 1500);
  };

  const shortcuts = [
    { label: 'Ctrl + Alt + Del', desc: 'Windows Security Screen' },
    { label: 'Alt + Tab', desc: 'Cycle Application Windows' },
    { label: 'Win / Super Key', desc: 'Open Start / Dash Menu' },
    { label: 'Cmd + Space', desc: 'macOS Spotlight Search' },
    { label: 'Ctrl + Shift + Esc', desc: 'Open Task Manager' },
    { label: 'Ctrl + C (SIGINT)', desc: 'Interrupt Terminal Process' },
    { label: 'Ctrl + Z (SIGTSTP)', desc: 'Suspend Background Job' },
    { label: 'Alt + F4', desc: 'Close Foreground Window' },
    { label: 'PrintScreen', desc: 'Capture Remote Screenshot' },
    { label: 'Lock Screen', desc: 'Secure Remote Workstation' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 p-5 shadow-2xl text-slate-100"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Keyboard className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">Remote Virtual Keystrokes</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {feedback && (
            <div className="mb-3 p-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs text-center border border-emerald-500/30 flex items-center justify-center gap-1.5 animate-pulse">
              <Check className="w-3.5 h-3.5" />
              <span>{feedback}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {shortcuts.map((sc, i) => (
              <button
                key={i}
                onClick={() => handleTrigger(sc.label)}
                className="p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-white/5 text-left transition-all active:scale-95 group"
              >
                <span className="font-mono text-xs font-bold text-cyan-300 group-hover:text-cyan-200 block">
                  {sc.label}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                  {sc.desc}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
