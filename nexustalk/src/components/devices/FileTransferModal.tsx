import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Download, FileText, CheckCircle2, ArrowRightLeft, Folder, HardDrive } from 'lucide-react';

interface FileTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  remoteDeviceName: string;
}

export const FileTransferModal: React.FC<FileTransferModalProps> = ({
  isOpen,
  onClose,
  remoteDeviceName,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'download'>('upload');
  const [transfers, setTransfers] = useState([
    { name: 'release_v2.4_bundle.tar.gz', size: '142 MB', progress: 100, speed: '24 MB/s', status: 'completed' },
    { name: 'benchmark_results.json', size: '2.4 MB', progress: 68, speed: '18 MB/s', status: 'transferring' },
    { name: 'kernel_headers.deb', size: '18 MB', progress: 0, speed: 'Queued', status: 'queued' },
  ]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 p-5 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Direct P2P File Transfer</h3>
                <p className="text-[11px] text-slate-400">Tunnel connected to {remoteDeviceName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drag & Drop Simulation Dropzone */}
          <div className="my-4 p-5 rounded-2xl border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors flex flex-col items-center justify-center text-center cursor-pointer">
            <Upload className="w-8 h-8 text-cyan-400 mb-2" />
            <h4 className="font-semibold text-xs text-white">Drag & drop files to push remotely</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Direct binary transfer with zero server storage (End-to-End Encrypted)</p>
          </div>

          {/* Active Transfers List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block px-1">
              Active Queue (24 MB/s P2P Speed)
            </span>
            {transfers.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-slate-800/40 border border-white/5 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="font-medium text-white truncate">{item.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-mono">{item.size}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
                  <div
                    style={{ width: `${item.progress}%` }}
                    className={`h-full transition-all duration-300 ${
                      item.status === 'completed'
                        ? 'bg-emerald-400'
                        : 'bg-gradient-to-r from-indigo-400 to-cyan-400'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{item.speed}</span>
                  <span className={item.status === 'completed' ? 'text-emerald-400 font-semibold' : ''}>
                    {item.status === 'completed' ? 'Completed' : `${item.progress}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Action */}
          <div className="pt-3 border-t border-white/5 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
