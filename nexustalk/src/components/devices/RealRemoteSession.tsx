import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Loader2,
  Wifi,
  PhoneOff,
  MousePointer2,
  Keyboard,
  MonitorSmartphone
} from 'lucide-react';
import { getSocket } from '../../lib/realtime';

interface RealRemoteSessionProps {
  onEnd: () => void;
}

/**
 * REAL remote control session (controller side).
 * Receives the host PC's screen via WebRTC, sends mouse/keyboard
 * input over the WebRTC DataChannel.
 */
export const RealRemoteSession: React.FC<RealRemoteSessionProps> = ({ onEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'requesting' | 'connecting' | 'streaming'>('requesting');
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const socket = getSocket();

  const sendInput = useCallback((obj: Record<string, unknown>) => {
    try {
      dcRef.current?.send(JSON.stringify(obj));
    } catch {
      /* channel closing */
    }
  }, []);

  // keep the latest onEnd without re-binding listeners
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const stopEverything = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    onEndRef.current();
  }, []);

  // ---- Start the session ----
  useEffect(() => {
    let pc: RTCPeerConnection | null = null;

    const onOffer = async (data: any) => {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
      });
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (videoRef.current && e.streams[0]) {
          videoRef.current.srcObject = e.streams[0];
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('remote:ice', { to: data.from, candidate: e.candidate.toJSON() });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setPhase('streaming');
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          stopEverything();
        }
      };

      // DataChannel for input — the agent listens on the "control" channel
      const dc = pc.createDataChannel('control', { ordered: true });
      dcRef.current = dc;

      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('remote:answer', { to: data.from, sdp: { type: answer.type, sdp: answer.sdp } });
      setPhase('connecting');
    };

    const onIce = (data: any) => {
      pcRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => undefined);
    };

    const onAgentOffline = () => {
      setNotice('Agent offline — PC te start-agent.bat chalu korun');
      setTimeout(() => stopEverything(), 1600);
    };

    const onRemoteEnd = () => stopEverything();

    socket.on('remote:offer', onOffer);
    socket.on('remote:ice', onIce);
    socket.on('remote:agent-offline', onAgentOffline);
    socket.on('remote:end', onRemoteEnd);

    socket.emit('remote:request');
    setPhase('requesting');

    return () => {
      socket.off('remote:offer', onOffer);
      socket.off('remote:ice', onIce);
      socket.off('remote:agent-offline', onAgentOffline);
      socket.off('remote:end', onRemoteEnd);
      try {
        socket.emit('remote:end', {});
      } catch {
        /* ignore */
      }
      pcRef.current?.close();
      pcRef.current = null;
      dcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'streaming') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ---- Input capture over the video ----
  const lastMoveSent = useRef(0);

  const norm = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastMoveSent.current < 40) return; // ~25/s
    lastMoveSent.current = now;
    sendInput({ t: 'mm', ...norm(e) });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    sendInput({ t: 'md', ...norm(e), btn: e.button === 2 ? 'right' : 'left' });
  };

  const onMouseUp = (e: React.MouseEvent) => {
    sendInput({ t: 'mu', btn: e.button === 2 ? 'right' : 'left' });
  };

  const onMouseClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    sendInput({ t: 'sc', dy: -Math.sign(e.deltaY) * 3 });
  };

  const mapKey = (e: React.KeyboardEvent) => {
    if (e.key.length === 1) return e.key.toLowerCase();
    return e.key.toLowerCase().replace('arrow', '').replace('escape', 'esc');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    sendInput({ t: 'kd', key: mapKey(e) });
  };

  const onKeyUp = (e: React.KeyboardEvent) => {
    sendInput({ t: 'ku', key: mapKey(e) });
  };

  const videoWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase === 'streaming') videoWrapRef.current?.focus();
  }, [phase]);

  const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-black text-slate-100 select-none overflow-hidden">
      {/* Top toolbar */}
      <div className="absolute top-3 inset-x-0 flex justify-center z-40 pointer-events-none px-4">
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto flex items-center gap-3 p-2 px-4 rounded-2xl glass shadow-2xl text-xs"
        >
          <MonitorSmartphone className="w-4 h-4 text-indigo-300" />
          <span className="font-semibold text-white">Remote session</span>
          {phase === 'streaming' && (
            <span className="font-mono text-emerald-300">{fmt(seconds)}</span>
          )}
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" /> P2P
          </span>
          <button
            onClick={onEnd}
            className="ml-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 on-accent font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5" /> End
          </button>
        </motion.div>
      </div>

      {/* Video + input surface */}
      <div
        ref={videoWrapRef}
        tabIndex={0}
        onMouseMove={phase === 'streaming' ? onMouseMove : undefined}
        onMouseDown={phase === 'streaming' ? onMouseDown : undefined}
        onMouseUp={phase === 'streaming' ? onMouseUp : undefined}
        onClick={phase === 'streaming' ? onMouseClick : undefined}
        onWheel={phase === 'streaming' ? onWheel : undefined}
        onKeyDown={phase === 'streaming' ? onKeyDown : undefined}
        onKeyUp={phase === 'streaming' ? onKeyUp : undefined}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 outline-none cursor-crosshair"
        style={{ touchAction: 'none' }}
      >
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain bg-black" />

        {phase !== 'streaming' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-300" />
            <p className="text-sm text-slate-300">
              {phase === 'requesting' ? 'Agent er kache request jacche…' : 'Connection hosse…'}
            </p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <MousePointer2 className="w-3 h-3" /> Stream ashle mouse/keyboard control active hobe
            </p>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      {phase === 'streaming' && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
          <div className="glass px-3 py-1.5 rounded-xl text-[11px] text-slate-300 flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" />
            Mouse: direct control · Keyboard: ei window focus e type korun
          </div>
        </div>
      )}

      {/* Transient notice */}
      {notice && (
        <div className="absolute top-16 inset-x-0 flex justify-center pointer-events-none">
          <div className="glass px-4 py-2 rounded-2xl text-xs font-semibold text-white shadow-xl">
            {notice}
          </div>
        </div>
      )}
    </div>
  );
};
