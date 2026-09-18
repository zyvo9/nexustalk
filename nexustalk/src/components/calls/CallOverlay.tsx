import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Phone,
  MonitorUp,
  MonitorX,
  X,
  AtSign,
  MousePointerClick,
  Eye,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import type { CallState, CallType } from '../../lib/webrtc';

interface CallOverlayProps {
  state: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  camOff: boolean;
  sharing: boolean;
  shareSupported: boolean;
  onAccept: () => void;
  onReject: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleCamera: () => void;
  onToggleShare: () => void;
  onShareError: (message: string) => void;
  onGrantControl: (peerIds: string[]) => void;
  onDisableControl: () => void;
  onControlInput: (obj: Record<string, unknown>) => void;
}

function fmtDuration(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const isVideoCall = (t: CallType) => t === 'video';

export const CallOverlay: React.FC<CallOverlayProps> = ({
  state,
  localStream,
  remoteStream,
  muted,
  camOff,
  sharing,
  shareSupported,
  onAccept,
  onReject,
  onHangUp,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
  onToggleShare,
  onShareError,
  onGrantControl,
  onDisableControl,
  onControlInput,
}) => {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [seconds, setSeconds] = useState(0);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [chooser, setChooser] = useState<'none' | 'open'>('none');
  const [pickMode, setPickMode] = useState(false);
  const [controlTargets, setControlTargets] = useState<string[]>([]);

  // Remote audio playback (critical for voice calls — no <video> element there)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream && !isVideoCall(state.type)) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = 1;
      remoteAudioRef.current.play().catch(() => setNeedsTap(true));
    }
  }, [remoteStream, state.type]);

  // Video call: make sure the remote <video> is actually PLAYING (autoplay can block)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && isVideoCall(state.type)) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.volume = 1;
      remoteVideoRef.current.play().catch(() => setNeedsTap(true));
    }
  }, [remoteStream, state.type]);

  // Speaker mute applies to whatever is playing the remote audio
  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.muted = speakerMuted;
    if (remoteVideoRef.current) remoteVideoRef.current.muted = speakerMuted;
  }, [speakerMuted, remoteStream]);

  const isVideo = state.type === 'video';
  const participants = state.peer ? [state.peer] : [];

  const forcePlay = () => {
    setNeedsTap(false);
    remoteVideoRef.current?.play().catch(() => undefined);
    remoteAudioRef.current?.play().catch(() => undefined);
  };

  const handleShareTap = () => {
    if (sharing || state.controlGrantedTo?.length) {
      // already sharing — toggle off / revoke control
      if (state.controlGrantedTo?.length) onDisableControl();
      onToggleShare();
      setChooser('none');
      return;
    }
    setChooser((c) => (c === 'open' ? 'none' : 'open'));
    setPickMode(false);
    setControlTargets([]);
  };

  const startScreenShare = () => {
    setChooser('none');
    try {
      onToggleShare();
    } catch (err: any) {
      onShareError(err.message ?? 'Screen share failed');
    }
  };

  const grantControl = () => {
    setChooser('none');
    if (!controlTargets.length) return;
    try {
      onGrantControl(controlTargets);
    } catch (err: any) {
      onShareError(err.message ?? 'Could not enable control');
    }
  };

  const controllerActive = state.phase === 'active' && !!state.remoteControl;

  const lastMove = useRef(0);
  const onMouseMove = (e: React.MouseEvent) => {
    if (!controllerActive) return;
    const now = Date.now();
    if (now - lastMove.current < 40) return;
    lastMove.current = now;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onControlInput({ t: 'mm', x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  };
  const onMouseDown = (e: React.MouseEvent) => {
    if (!controllerActive) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onControlInput({ t: 'md', x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height, btn: e.button === 2 ? 'right' : 'left' });
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (!controllerActive) return;
    onControlInput({ t: 'mu', btn: e.button === 2 ? 'right' : 'left' });
  };
  const onWheelEvt = (e: React.WheelEvent) => {
    if (!controllerActive) return;
    e.preventDefault();
    onControlInput({ t: 'sc', dy: -Math.sign(e.deltaY) * 3 });
  };
  const mapKey = (e: React.KeyboardEvent) =>
    e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase().replace('arrow', '').replace('escape', 'esc');
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!controllerActive) return;
    e.preventDefault();
    onControlInput({ t: 'kd', key: mapKey(e) });
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (!controllerActive) return;
    onControlInput({ t: 'ku', key: mapKey(e) });
  };

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (state.phase !== 'active') {
      setSeconds(0);
      return;
    }
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [state.phase]);

  const peer = state.peer;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#070b15]/98 backdrop-blur-xl flex flex-col text-slate-100"
      >
        {/* ================= INCOMING ================= */}
        {state.phase === 'incoming' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div className="aurora-bg" />
            <div className="relative z-10 flex flex-col items-center">
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="relative mb-6"
              >
                <div className="absolute inset-0 rounded-full accent-gradient opacity-30 blur-2xl" />
                <Avatar src={peer?.avatar ?? null} name={peer?.name ?? '?'} className="w-28 h-28 text-3xl ring-4 ring-indigo-500/40" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white">{peer?.name}</h2>
              {peer?.username && (
                <p className="text-sm text-indigo-300/90 font-mono mt-1">@{peer.username}</p>
              )}
              <p className="text-sm text-slate-400 mt-3 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </span>
                Incoming {state.type === 'video' ? 'video' : 'voice'} call…
              </p>

              <div className="flex items-center gap-8 mt-12">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onReject}
                  className="w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center shadow-xl shadow-rose-600/30 cursor-pointer"
                  title="Decline"
                >
                  <PhoneOff className="w-7 h-7 on-accent" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onAccept}
                  className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 cursor-pointer animate-bounce"
                  title="Accept"
                >
                  <Phone className="w-7 h-7 on-accent" />
                </motion.button>
              </div>
            </div>
          </div>
        )}

        {/* ================= OUTGOING / CONNECTING ================= */}
        {(state.phase === 'outgoing' || state.phase === 'connecting') && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div className="aurora-bg" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full accent-gradient opacity-30 blur-2xl animate-pulse" />
                <Avatar src={peer?.avatar ?? null} name={peer?.name ?? '?'} className="w-28 h-28 text-3xl ring-4 ring-indigo-500/30" />
              </div>
              <h2 className="text-2xl font-bold text-white">{peer?.name}</h2>
              <p className="text-sm text-slate-400 mt-3 flex items-center gap-2">
                {state.phase === 'outgoing' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                    <span className="ml-2">{state.type === 'video' ? 'Ringing — video call' : 'Ringing…'}</span>
                  </>
                ) : (
                  'Connecting…'
                )}
              </p>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onHangUp}
                className="mt-12 w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center shadow-xl shadow-rose-600/30 cursor-pointer"
                title="Cancel"
              >
                <PhoneOff className="w-7 h-7 on-accent" />
              </motion.button>
            </div>
          </div>
        )}

        {/* ================= ACTIVE / ENDED ================= */}
        {(state.phase === 'active' || state.phase === 'ended') && (
          <div
            className="flex-1 relative overflow-hidden bg-[#0a0f1c] outline-none"
            tabIndex={controllerActive ? 0 : -1}
            onMouseMove={onMouseMove}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onWheel={onWheelEvt}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onContextMenu={(e) => controllerActive && e.preventDefault()}
          >
            {isVideo ? (
              <>
                {/* Remote video fullscreen */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover bg-black"
                />
                {!remoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Avatar src={peer?.avatar ?? null} name={peer?.name ?? '?'} className="w-32 h-32 text-4xl opacity-60" />
                  </div>
                )}

                {/* Local PiP (hidden while remote is controlling — they see their own actions) */}
                {localStream && !controllerActive && (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute bottom-28 right-4 w-32 sm:w-44 aspect-[3/4] object-cover rounded-2xl ring-2 ring-white/20 shadow-2xl z-10 bg-slate-900"
                  />
                )}
              </>
            ) : (
              /* Voice call layout */
              <div className="absolute inset-0 flex flex-col items-center justify-center relative">
                <div className="aurora-bg" />
                {/* Remote audio — THE speaker for voice calls */}
                <audio ref={remoteAudioRef} autoPlay className="hidden" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative mb-6">
                    <div className={`absolute inset-0 rounded-full accent-gradient opacity-25 blur-2xl ${state.phase === 'active' ? 'pulse-ring' : ''}`} />
                    <Avatar src={peer?.avatar ?? null} name={peer?.name ?? '?'} className="w-32 h-32 text-4xl ring-4 ring-indigo-500/30" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{peer?.name}</h2>
                  {state.phase === 'active' && (
                    <p className="font-mono text-emerald-300 mt-2">{fmtDuration(seconds)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Top status bar */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20 pointer-events-none">
              <div className="pointer-events-auto glass px-3.5 py-2 rounded-2xl text-xs">
                <div className="font-semibold text-white flex items-center gap-2">
                  {peer?.name}
                  {sharing && (
                    <span className="px-2 py-0.5 rounded-md accent-gradient on-accent text-[10px] font-bold flex items-center gap-1">
                      <MonitorUp className="w-3 h-3" /> Sharing
                    </span>
                  )}
                  {state.remoteSharing && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/25 text-sky-200 text-[10px] font-bold">
                      {peer?.name?.split(' ')[0]}'s screen
                    </span>
                  )}
                </div>
                {state.phase === 'active' ? (
                  <span className="font-mono text-emerald-300 text-[11px]">{fmtDuration(seconds)}</span>
                ) : (
                  <span className="text-slate-400 text-[11px]">{state.message ?? ''}</span>
                )}
              </div>
              {state.phase === 'active' && (
                <button
                  onClick={onHangUp}
                  className="pointer-events-auto p-2.5 rounded-2xl glass hover:bg-rose-600/80 on-accent transition-colors cursor-pointer"
                  title="End call"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Host: being-controlled warning */}
            {!!state.controlGrantedTo?.length && state.phase === 'active' && (
              <div className="absolute top-16 inset-x-4 z-30 flex justify-center pointer-events-none">
                <div className="bg-amber-400 text-amber-950 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl pointer-events-auto">
                  <AlertTriangle className="w-4 h-4" />
                  {state.controlGrantedTo.join(', ')} can control your PC
                  <button
                    onClick={onDisableControl}
                    className="ml-1 px-2.5 py-1 rounded-lg bg-black/25 hover:bg-black/40 text-[11px] uppercase cursor-pointer"
                  >
                    Stop
                  </button>
                </div>
              </div>
            )}

            {/* Controller: you have control */}
            {controllerActive && (
              <div className="absolute top-16 inset-x-4 z-30 flex justify-center pointer-events-none">
                <div className="bg-emerald-400 text-emerald-950 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl">
                  <MousePointerClick className="w-4 h-4" />
                  You have control — mouse &amp; keyboard are live
                </div>
              </div>
            )}

            {/* Audio autoplay fallback */}
            {needsTap && state.phase === 'active' && (
              <div className="absolute top-28 inset-x-4 z-30 flex justify-center">
                <button
                  onClick={forcePlay}
                  className="glass px-4 py-2.5 rounded-2xl text-xs font-bold text-white flex items-center gap-2 shadow-xl cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-emerald-300" />
                  Tap to enable sound
                </button>
              </div>
            )}

            {/* Ended overlay message */}
            {state.phase === 'ended' && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-md">
                <div className="glass px-6 py-4 rounded-3xl text-center">
                  <p className="font-semibold text-white">{state.message ?? 'Call ended'}</p>
                  <p className="text-xs text-slate-400 mt-1">{peer?.name}</p>
                </div>
              </div>
            )}

            {/* Share / remote-control chooser + participant picker */}
            {chooser === 'open' && state.phase === 'active' && (
              <div className="absolute bottom-24 inset-x-0 flex justify-center z-30 pointer-events-none px-4">
                {!pickMode ? (
                  <div className="pointer-events-auto glass rounded-3xl p-2 w-72 shadow-2xl space-y-1">
                    <button
                      onClick={startScreenShare}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 text-left cursor-pointer"
                    >
                      <span className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
                        <Eye className="w-5 h-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">Screen share</span>
                        <span className="block text-[11px] text-slate-400">They can only watch</span>
                      </span>
                    </button>
                    <button
                      onClick={() => setPickMode(true)}
                      disabled={!shareSupported}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 text-left cursor-pointer disabled:opacity-50"
                    >
                      <span className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                        <MousePointerClick className="w-5 h-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">Remote control</span>
                        <span className="block text-[11px] text-slate-400">They can control your PC</span>
                      </span>
                    </button>
                    <button onClick={() => setChooser('none')} className="w-full text-center py-1.5 text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="pointer-events-auto glass rounded-3xl p-3 w-80 shadow-2xl">
                    <p className="text-xs font-semibold text-white px-1 pb-2 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-300" />
                      Give control to:
                    </p>
                    {participants.map((p) => {
                      const selected = controlTargets.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() =>
                            setControlTargets((prev) =>
                              prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                            )
                          }
                          className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left cursor-pointer transition-colors ${
                            selected ? 'bg-indigo-500/20' : 'hover:bg-white/5'
                          }`}
                        >
                          <Avatar src={p.avatar ?? null} name={p.name} className="w-10 h-10 text-sm" />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-white truncate">{p.name}</span>
                            {p.username && (
                              <span className="block text-[11px] font-mono text-indigo-300">@{p.username}</span>
                            )}
                          </span>
                          {selected && (
                            <span className="w-5 h-5 rounded-full accent-gradient on-accent flex items-center justify-center shrink-0">
                              <UserCheck className="w-3 h-3" strokeWidth={2.5} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => { setPickMode(false); setControlTargets([]); }}
                        className="flex-1 py-2 rounded-xl bg-white/5 text-xs text-slate-300 cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        onClick={grantControl}
                        disabled={!controlTargets.length}
                        className="flex-[2] py-2 rounded-xl accent-gradient on-accent text-xs font-semibold cursor-pointer disabled:opacity-60"
                      >
                        Grant control ({controlTargets.length})
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center pt-1.5">
                      Screen share auto-starts with control · needs the agent running on your PC
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom controls */}
            {state.phase === 'active' && (
              <div className="absolute bottom-6 inset-x-0 flex justify-center z-20 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3.5 p-3 px-4 rounded-full glass shadow-2xl">
                  <CtrlButton
                    active={muted}
                    onClick={onToggleMute}
                    title={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </CtrlButton>

                  <CtrlButton
                    active={speakerMuted}
                    onClick={onToggleSpeaker}
                    title={speakerMuted ? 'Speaker on' : 'Speaker off'}
                  >
                    {speakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </CtrlButton>

                  {isVideo && (
                    <CtrlButton
                      active={camOff}
                      onClick={onToggleCamera}
                      title={camOff ? 'Turn camera on' : 'Turn camera off'}
                    >
                      {camOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
                    </CtrlButton>
                  )}

                  {isVideo && shareSupported && (
                    <CtrlButton
                      active={sharing || !!state.controlGrantedTo?.length}
                      accent
                      onClick={handleShareTap}
                      title={sharing ? 'Stop sharing' : 'Share screen or give control'}
                    >
                      {sharing ? <MonitorX className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
                    </CtrlButton>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onHangUp}
                    className="px-5 py-3 rounded-full bg-rose-600 on-accent flex items-center gap-2 shadow-lg shadow-rose-600/30 hover:bg-rose-500 cursor-pointer"
                    title="End call"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

const CtrlButton: React.FC<{
  active?: boolean;
  accent?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ active, accent, onClick, title, children }) => (
  <motion.button
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    title={title}
    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
      active
        ? accent
          ? 'accent-gradient on-accent'
          : 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
        : 'bg-white/10 text-white hover:bg-white/20'
    }`}
  >
    {children}
  </motion.button>
);
