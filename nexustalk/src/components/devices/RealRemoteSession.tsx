import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Loader2,
  PhoneOff,
  MonitorSmartphone,
  Maximize2,
  Minimize2,
  ClipboardPaste,
  Activity,
  Keyboard
} from 'lucide-react';
import { getSocket } from '../../lib/realtime';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 4,
};

interface RealRemoteSessionProps {
  /** Name of the PC owner (CRD toolbar title) */
  hostName?: string;
  /** Devices-tab flow: ask MY agent for a session on mount */
  autoRequest?: boolean;
  onEnd: () => void;
}

/**
 * Chrome Remote Desktop-style controller session.
 * The host PC's AGENT streams its screen (GPU capture, cursor drawn in-frame)
 * straight to this view over WebRTC; mouse/keyboard/clipboard go back over
 * the "control" DataChannel. Server relays signaling only.
 */
export const RealRemoteSession: React.FC<RealRemoteSessionProps> = ({ hostName, autoRequest = false, onEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'requesting' | 'connecting' | 'streaming'>('requesting');
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [clipMsg, setClipMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<{ fps: number; rtt: number; kbps: number } | null>(null);
  const [isFs, setIsFs] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const agentFromRef = useRef<string | null>(null);
  const lastStatsRef = useRef<{ bytes: number; ts: number } | null>(null);
  const socket = getSocket();

  const sendInput = useCallback((obj: Record<string, unknown>) => {
    try {
      dcRef.current?.send(JSON.stringify(obj));
    } catch {
      /* channel closing */
    }
  }, []);

  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const stopEverything = useCallback((notifyAgent = false) => {
    if (notifyAgent && agentFromRef.current) {
      try {
        socket.emit('remote:end', { to: agentFromRef.current });
      } catch {
        /* ignore */
      }
    }
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    onEndRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Session setup ----
  useEffect(() => {
    let closed = false;

    const onOffer = async (data: any) => {
      if (closed) return;
      agentFromRef.current = data.from;
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (videoRef.current && e.streams[0]) {
          videoRef.current.srcObject = e.streams[0];
          videoRef.current.play().catch(() => undefined);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('remote:ice', { to: data.from, candidate: e.candidate.toJSON() });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setPhase('streaming');
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setNotice('Session lost');
          setTimeout(() => stopEverything(), 1200);
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
      setNotice('Agent offline — host PC te start-agent.bat chalu korun');
      setTimeout(() => stopEverything(), 1800);
    };

    const onRemoteEnd = () => stopEverything();
    const onSessionEnded = () => {
      setNotice('Host control bondho korlo');
      setTimeout(() => stopEverything(), 1200);
    };

    socket.on('remote:offer', onOffer);
    socket.on('remote:ice', onIce);
    socket.on('remote:agent-offline', onAgentOffline);
    socket.on('remote:end', onRemoteEnd);
    socket.on('remote:session-ended', onSessionEnded);

    if (autoRequest) {
      socket.emit('remote:request');
    }

    return () => {
      closed = true;
      socket.off('remote:offer', onOffer);
      socket.off('remote:ice', onIce);
      socket.off('remote:agent-offline', onAgentOffline);
      socket.off('remote:end', onRemoteEnd);
      socket.off('remote:session-ended', onSessionEnded);
      if (agentFromRef.current) {
        try {
          socket.emit('remote:end', { to: agentFromRef.current });
        } catch {
          /* ignore */
        }
      }
      pcRef.current?.close();
      pcRef.current = null;
      dcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest]);

  // Timer
  useEffect(() => {
    if (phase !== 'streaming') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // RustDesk-style stats HUD
  useEffect(() => {
    if (phase !== 'streaming') { setStats(null); return; }
    let stop = false;
    const poll = async () => {
      while (!stop) {
        const pc = pcRef.current;
        if (pc) {
          try {
            const report = await pc.getStats();
            let fps = 0;
            let rtt = 0;
            let bytes = 0;
            const ts = Date.now();
            report.forEach((s: any) => {
              if (s.type === 'inbound-rtp' && s.kind === 'video') {
                fps = Math.round(s.framesPerSecond ?? 0);
                bytes = s.bytesReceived ?? 0;
              }
              if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.currentRoundTripTime != null) {
                rtt = Math.round(s.currentRoundTripTime * 1000);
              }
            });
            let kbps = 0;
            if (lastStatsRef.current) {
              const dt = (ts - lastStatsRef.current.ts) / 1000;
              if (dt > 0) kbps = Math.round(((bytes - lastStatsRef.current.bytes) * 8) / dt / 1000);
            }
            lastStatsRef.current = { bytes, ts };
            if (!stop) setStats({ fps, rtt, kbps });
          } catch {
            /* pc closed */
          }
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    poll();
    return () => { stop = true; };
  }, [phase]);

  // ---- CRD-accurate coordinates (video is object-contain / letterboxed) ----
  const contentPos = (clientX: number, clientY: number) => {
    const v = videoRef.current;
    if (!v) return null;
    const rect = v.getBoundingClientRect();
    const vw = v.videoWidth || rect.width;
    const vh = v.videoHeight || rect.height;
    const scale = Math.min(rect.width / vw, rect.height / vh);
    const cw = vw * scale;
    const ch = vh * scale;
    const ox = rect.left + (rect.width - cw) / 2;
    const oy = rect.top + (rect.height - ch) / 2;
    return {
      x: Math.min(1, Math.max(0, (clientX - ox) / cw)),
      y: Math.min(1, Math.max(0, (clientY - oy) / ch)),
    };
  };

  const lastMove = useRef(0);
  const onMouseMove = (e: React.MouseEvent) => {
    if (phase !== 'streaming') return;
    const now = Date.now();
    if (now - lastMove.current < 12) return; // ~60Hz
    lastMove.current = now;
    const p = contentPos(e.clientX, e.clientY);
    if (p) sendInput({ t: 'mm', ...p });
  };
  const onMouseDown = (e: React.MouseEvent) => {
    if (phase !== 'streaming') return;
    const p = contentPos(e.clientX, e.clientY);
    if (p) sendInput({ t: 'md', ...p, btn: e.button === 2 ? 'right' : 'left' });
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (phase !== 'streaming') return;
    sendInput({ t: 'mu', btn: e.button === 2 ? 'right' : 'left' });
  };

  // Non-passive wheel (React wheel is passive)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const h = (ev: WheelEvent) => {
      if (phase !== 'streaming') return;
      ev.preventDefault();
      sendInput({ t: 'sc', dy: Math.max(-5, Math.min(5, Math.round(-ev.deltaY / 100))) });
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, [phase, sendInput]);

  const mapKey = (e: React.KeyboardEvent) =>
    e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase().replace('arrow', '').replace('escape', 'esc');
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (phase !== 'streaming') return;
    if (e.key === 'Escape' && document.fullscreenElement) return; // ESC exits fullscreen
    e.preventDefault();
    sendInput({ t: 'kd', key: mapKey(e) });
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (phase !== 'streaming') return;
    e.preventDefault();
    sendInput({ t: 'ku', key: mapKey(e) });
  };

  // Touch: tap = click, drag = move
  const touchPos = (e: React.TouchEvent) => {
    const t = e.touches[0] ?? e.changedTouches[0];
    return contentPos(t.clientX, t.clientY) ?? { x: 0, y: 0 };
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (phase !== 'streaming') return;
    e.preventDefault();
    sendInput({ t: 'md', ...touchPos(e), btn: 'left' });
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (phase !== 'streaming') return;
    e.preventDefault();
    const now = Date.now();
    if (now - lastMove.current < 24) return;
    lastMove.current = now;
    sendInput({ t: 'ms', ...touchPos(e), btn: 'left' });
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (phase !== 'streaming') return;
    e.preventDefault();
    sendInput({ t: 'mu', btn: 'left' });
  };

  useEffect(() => {
    if (phase === 'streaming') wrapRef.current?.focus();
  }, [phase]);

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else el.requestFullscreen?.().catch(() => undefined);
  };
  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const pasteToRemote = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) { setClipMsg('Clipboard empty'); }
      else {
        sendInput({ t: 'clip', text: text.slice(0, 100000) });
        setClipMsg('Remote clipboard set — Ctrl+V on the remote PC');
      }
    } catch {
      setClipMsg('Clipboard read blocked by browser');
    }
    setTimeout(() => setClipMsg(null), 2400);
  };

  const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  const title = hostName ? `${hostName}'s PC` : 'Remote session';

  return (
    <div className="fixed inset-0 z-[60] bg-black text-slate-100 select-none overflow-hidden">
      {/* CRD toolbar */}
      <div className="absolute top-4 inset-x-0 flex flex-col items-center gap-2 z-40 pointer-events-none px-4">
        <div className="pointer-events-auto glass rounded-full pl-4 pr-2 py-2 flex items-center gap-3 shadow-2xl max-w-[94vw]">
          <span className={`w-2 h-2 rounded-full shrink-0 ${phase === 'streaming' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <MonitorSmartphone className="w-4 h-4 text-indigo-300 shrink-0 hidden sm:block" />
          <span className="text-xs font-semibold text-white truncate">{title}</span>
          {phase === 'streaming' && (
            <span className="font-mono text-[11px] text-emerald-300 shrink-0">{fmt(seconds)}</span>
          )}
          {stats && phase === 'streaming' && (
            <span
              className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 shrink-0 flex items-center gap-1"
              title={`${stats.kbps} kbps`}
            >
              <Activity className="w-3 h-3 text-sky-300" />
              {stats.fps} FPS · {stats.rtt}ms
            </span>
          )}
          <span className="w-px h-4 bg-white/15 shrink-0" />
          <button
            onClick={pasteToRemote}
            title="Copy my clipboard to the remote PC"
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 cursor-pointer shrink-0 disabled:opacity-40"
            disabled={phase !== 'streaming'}
          >
            <ClipboardPaste className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFs ? 'Exit fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 cursor-pointer shrink-0"
          >
            {isFs ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => stopEverything(true)}
            title="End session"
            className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 on-accent text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <PhoneOff className="w-3.5 h-3.5" /> Stop
          </button>
        </div>
        {clipMsg && (
          <div className="pointer-events-none glass px-3.5 py-1.5 rounded-2xl text-[11px] font-semibold text-white shadow-xl">
            {clipMsg}
          </div>
        )}
        {notice && (
          <div className="pointer-events-none glass px-3.5 py-1.5 rounded-2xl text-[11px] font-semibold text-amber-300 shadow-xl">
            {notice}
          </div>
        )}
      </div>

      {/* Video + input surface */}
      <div
        ref={wrapRef}
        tabIndex={0}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={`absolute inset-0 outline-none ${phase === 'streaming' ? 'cursor-none' : ''}`}
        style={{ touchAction: 'none' }}
      >
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain bg-black" />

        {phase !== 'streaming' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-300" />
            <p className="text-sm text-slate-300">
              {phase === 'requesting'
                ? autoRequest
                  ? 'Agent er kache request jacche…'
                  : `${hostName ?? 'Host'} er agent connect hocche…`
                : 'Connection hosse…'}
            </p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Keyboard className="w-3 h-3" /> Stream ashle mouse/keyboard live hobe — CRD style
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
