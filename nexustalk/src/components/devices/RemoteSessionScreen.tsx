import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sliders,
  Clipboard,
  ArrowRightLeft,
  Keyboard,
  Maximize2,
  Minimize2,
  XCircle,
  Wifi,
  BatteryFull,
  Check,
  MousePointer2,
  ChevronDown,
  Copy,
  Search,
  Folder,
  Settings as SettingsIcon
} from 'lucide-react';
import { FileTransferModal } from './FileTransferModal';
import { RemoteKeyboardModal } from './RemoteKeyboardModal';

interface RemoteSessionScreenProps {
  deviceName: string;
  deviceId: string;
  onEndSession: () => void;
}

/* Little colored square used as a dock app icon */
const DockApp = ({ from, to, glyph }: { from: string; to: string; glyph: React.ReactNode }) => (
  <div
    className="w-11 h-11 rounded-xl flex items-center justify-center text-white/95 shadow-md ring-1 ring-white/20"
    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
  >
    {glyph}
  </div>
);

/* A syntax-colored "code line" made of soft bars — clean and language-agnostic */
const CodeLine = ({ widths, offset = 0 }: { widths: number[]; offset?: number }) => (
  <div className="flex items-center gap-2 h-4" style={{ paddingLeft: offset * 18 }}>
    {widths.map((w, i) => (
      <div
        key={i}
        className={`h-2 rounded-full ${
          ['bg-indigo-400/70', 'bg-sky-400/60', 'bg-slate-500/50', 'bg-emerald-400/50', 'bg-amber-300/50'][Math.abs(offset + i) % 5]
        }`}
        style={{ width: `${w}px` }}
      />
    ))}
  </div>
);

export const RemoteSessionScreen: React.FC<RemoteSessionScreenProps> = ({
  deviceName,
  deviceId,
  onEndSession,
}) => {
  const [qualityPreset, setQualityPreset] = useState<'Speed' | 'Balanced' | 'Quality'>('Balanced');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showClipboardDrawer, setShowClipboardDrawer] = useState(false);
  const [showFileTransfer, setShowFileTransfer] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [clipboardText, setClipboardText] = useState('git clone https://github.com/nexus-talk/core.git');
  const [clipboardCopied, setClipboardCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Remote cursor position
  const [cursorPos, setCursorPos] = useState({ x: 460, y: 300 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setCursorPos({
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    });
  };

  const copyToHostClipboard = () => {
    setClipboardCopied(true);
    setTimeout(() => setClipboardCopied(false), 1800);
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-black text-slate-100 select-none overflow-hidden ${isFullscreen ? '' : ''}`}>
      {/* Floating glass toolbar */}
      <div className="absolute top-3 inset-x-0 flex justify-center z-40 pointer-events-none px-4">
        <motion.div
          initial={{ y: -44, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="pointer-events-auto flex items-center gap-1 sm:gap-2 p-1.5 px-2.5 sm:px-3 rounded-2xl glass shadow-2xl shadow-black/60 text-xs"
        >
          {/* Target identity */}
          <div className="flex items-center gap-2.5 pr-2.5 border-r border-white/10">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <div className="hidden sm:block leading-tight">
              <h4 className="font-semibold text-white text-[11px] truncate max-w-[150px]">{deviceName}</h4>
              <span className="text-[10px] font-mono text-slate-400">{deviceId}</span>
            </div>
          </div>

          {/* Live quality chip */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.06] text-[11px] font-semibold">
            <span className="text-emerald-300">16 ms</span>
            <span className="text-slate-600">·</span>
            <span className="text-sky-300">60 FPS</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">P2P</span>
          </div>

          {/* Quality preset */}
          <div className="relative">
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="px-2.5 py-2 rounded-xl hover:bg-white/10 flex items-center gap-1 font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden md:inline">{qualityPreset}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            <AnimatePresence>
              {showQualityMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute left-0 top-11 w-48 rounded-2xl glass p-1.5 shadow-2xl z-50 space-y-0.5"
                >
                  {(['Speed', 'Balanced', 'Quality'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setQualityPreset(mode);
                        setShowQualityMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between text-xs cursor-pointer ${
                        qualityPreset === mode
                          ? 'bg-indigo-500/25 text-white font-semibold'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span>{mode}</span>
                      {qualityPreset === mode && <Check className="w-3.5 h-3.5 text-indigo-300" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Clipboard */}
          <button
            onClick={() => setShowClipboardDrawer(!showClipboardDrawer)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Shared clipboard"
          >
            <Clipboard className="w-4 h-4" strokeWidth={1.8} />
          </button>

          {/* Files */}
          <button
            onClick={() => setShowFileTransfer(true)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Transfer files"
          >
            <ArrowRightLeft className="w-4 h-4" strokeWidth={1.8} />
          </button>

          {/* Keyboard */}
          <button
            onClick={() => setShowVirtualKeyboard(true)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Keyboard & shortcuts"
          >
            <Keyboard className="w-4 h-4" strokeWidth={1.8} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" strokeWidth={1.8} /> : <Maximize2 className="w-4 h-4" strokeWidth={1.8} />}
          </button>

          {/* Kill */}
          <button
            onClick={onEndSession}
            className="ml-0.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 on-accent font-semibold text-[11px] flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End</span>
          </button>
        </motion.div>
      </div>

      {/* ======== Remote desktop canvas ======== */}
      <div
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        className="relative flex-1 w-full h-full overflow-hidden cursor-none"
      >
        {/* Wallpaper */}
        <div className="absolute inset-0 bg-[image:radial-gradient(120%_110%_at_20%_0%,#3b3f8f 0%,#232a5c 38%,#141a3d 68%,#0a0e24 100%)]" />

        {/* Menu bar */}
        <div className="absolute top-0 inset-x-0 h-7 bg-black/35 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 text-[11px] text-white/90 z-10">
          <div className="flex items-center gap-4">
            <span className="w-3.5 h-3.5 rounded-[5px] accent-gradient flex items-center justify-center text-[8px] font-extrabold on-accent">N</span>
            <span className="font-semibold">NexusOS</span>
            <span className="hidden sm:inline text-white/70">File</span>
            <span className="hidden sm:inline text-white/70">Edit</span>
            <span className="hidden sm:inline text-white/70">View</span>
            <span className="hidden sm:inline text-white/70">Window</span>
            <span className="hidden sm:inline text-white/70">Help</span>
          </div>
          <div className="flex items-center gap-3.5 text-white/80">
            <Wifi className="w-3.5 h-3.5" strokeWidth={2} />
            <BatteryFull className="w-4 h-4" strokeWidth={1.8} />
            <span className="font-medium">Sun 3:42 PM</span>
          </div>
        </div>

        {/* Editor window */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[54%] w-[82%] max-w-4xl h-[68%] rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/15 z-[5] flex flex-col bg-[#0d1117]">
          {/* Window title bar */}
          <div className="h-9 px-4 bg-[#161b27] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-[11px] text-slate-400 font-medium">nexus-web — remote-stream.tsx</span>
            </div>
            <Search className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
          </div>

          <div className="flex-1 flex min-h-0">
            {/* File sidebar */}
            <div className="hidden sm:flex w-44 bg-[#10141f] border-r border-white/5 flex-col py-3 px-2.5 gap-2.5 shrink-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-1.5">Explorer</span>
              {['src', 'components', 'stream', 'hooks', 'public', 'package.json', 'vite.config.ts'].map((f, i) => (
                <div key={f} className="flex items-center gap-2 px-1.5 py-1 rounded-lg text-[11px] text-slate-400">
                  <Folder className={`w-3.5 h-3.5 ${i < 4 ? 'text-sky-400/70' : 'text-slate-600'}`} strokeWidth={1.8} />
                  <span className="truncate">{f}</span>
                </div>
              ))}
            </div>

            {/* Code area */}
            <div className="flex-1 p-4 space-y-2.5 overflow-hidden bg-[#0d1117]">
              <CodeLine widths={[52, 78, 34, 60]} />
              <CodeLine widths={[40, 92]} offset={1} />
              <CodeLine widths={[66, 48, 82]} offset={2} />
              <CodeLine widths={[30, 74, 56]} offset={3} />
              <CodeLine widths={[88, 42]} offset={3} />
              <div className="h-2" />
              <CodeLine widths={[46, 68, 38]} offset={2} />
              <CodeLine widths={[70, 52]} offset={3} />
              <CodeLine widths={[36, 84, 44]} offset={3} />
              <CodeLine widths={[58, 30]} offset={2} />
              <div className="h-2" />
              <CodeLine widths={[44, 72, 50]} offset={1} />
              <CodeLine widths={[64, 40]} />
            </div>
          </div>

          {/* Status bar */}
          <div className="h-6 px-4 bg-[#10141f] border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected — hardware H.264 encode
            </span>
            <span>TypeScript · UTF-8 · 1440p</span>
          </div>
        </div>

        {/* Dock */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-end gap-2.5 p-2.5 px-3 rounded-2xl bg-black/35 backdrop-blur-2xl border border-white/15 shadow-2xl">
            <DockApp from="#6366f1" to="#0ea5e9" glyph={<span className="font-extrabold text-sm">N</span>} />
            <DockApp from="#f59e0b" to="#ef4444" glyph={<SettingsIcon className="w-5 h-5" strokeWidth={1.8} />} />
            <DockApp from="#10b981" to="#0d9488" glyph={<Folder className="w-5 h-5" strokeWidth={1.8} />} />
            <DockApp from="#8b5cf6" to="#6366f1" glyph={<Search className="w-5 h-5" strokeWidth={1.8} />} />
            <DockApp from="#334155" to="#1e293b" glyph={<Clipboard className="w-5 h-5" strokeWidth={1.8} />} />
          </div>
        </div>

        {/* Remote cursor */}
        <div
          style={{
            transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)`,
            transition: 'transform 0.04s ease-out',
          }}
          className="pointer-events-none absolute top-0 left-0 z-50"
        >
          <MousePointer2 className="w-5 h-5 text-white fill-indigo-500 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]" />
          <span className="ml-4 -mt-1 inline-block px-1.5 py-0.5 rounded-md accent-gradient on-accent font-bold text-[9px] shadow-md">
            You
          </span>
        </div>
      </div>

      {/* Clipboard drawer */}
      <AnimatePresence>
        {showClipboardDrawer && (
          <motion.div
            initial={{ x: '110%' }}
            animate={{ x: 0 }}
            exit={{ x: '110%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-16 right-4 z-50 w-80 rounded-3xl glass p-4 shadow-2xl text-xs space-y-3"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Clipboard className="w-4 h-4 text-indigo-300" />
                <span>Shared clipboard</span>
              </div>
              <button
                onClick={() => setShowClipboardDrawer(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Paste text here to send it straight to the remote device's clipboard.
            </p>

            <textarea
              rows={3}
              value={clipboardText}
              onChange={(e) => setClipboardText(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-black/30 border border-white/10 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={copyToHostClipboard}
                className="px-3.5 py-2 rounded-xl accent-gradient on-accent font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {clipboardCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{clipboardCopied ? 'Synced' : 'Sync to remote'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FileTransferModal
        isOpen={showFileTransfer}
        onClose={() => setShowFileTransfer(false)}
        remoteDeviceName={deviceName}
      />

      <RemoteKeyboardModal
        isOpen={showVirtualKeyboard}
        onClose={() => setShowVirtualKeyboard(false)}
        onSendShortcut={(shortcut) => {
          console.log('Dispatched keystroke', shortcut);
        }}
      />
    </div>
  );
};
