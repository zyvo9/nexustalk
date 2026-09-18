import type { Socket } from 'socket.io-client';
import { getSocket } from './realtime';

export type CallType = 'audio' | 'video';
export interface CallPeer {
  id: string;
  name: string;
  avatar?: string | null;
  username?: string;
}
export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active' | 'ended';

export interface CallState {
  phase: CallPhase;
  type: CallType;
  peer: CallPeer | null;
  message?: string;
  remoteSharing?: boolean;
  /** Controller side: the host enabled remote control for me */
  remoteControl?: boolean;
  /** Host side: peers I granted control to (names, for the banner) */
  controlGrantedTo?: string[];
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    // Free TURN relay (Open Relay Project) — makes calls work behind strict NAT/firewalls
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 4,
};

const SIGNAL_EVENTS = [
  'call:invite',
  'call:accepted',
  'call:rejected',
  'call:offer',
  'call:answer',
  'call:ice',
  'call:end',
  'call:sharing',
] as const;

/**
 * Peer-to-peer 1:1 calls over WebRTC.
 * The server only relays signaling; audio/video flows directly between devices.
 */
class CallManager {
  state: CallState = { phase: 'idle', type: 'audio', peer: null };

  onState: (s: CallState) => void = () => {};
  onLocalStream: (s: MediaStream | null) => void = () => {};
  onRemoteStream: (s: MediaStream | null) => void = () => {};

  private socket: Socket;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private peer: CallPeer | null = null;
  private callType: CallType = 'audio';
  private isCaller = false;
  private ringTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private localSharing = false;
  private controlChannel: RTCDataChannel | null = null;
  private agentWs: WebSocket | null = null;
  private controlEnabled = false;
  private grantedPeers: string[] = [];

  get isControlEnabled() {
    return this.controlEnabled;
  }

  constructor() {
    this.socket = getSocket();
    this.bindSocket();
  }

  private boundHandlers: Array<[string, (d: any) => void]> = [];

  private bindSocket() {
    SIGNAL_EVENTS.forEach((event) => {
      const handler = (data: any = {}) => this.handleSignal(event, data);
      this.boundHandlers.push([event, handler]);
      this.socket.on(event, handler);
    });
  }

  /** Re-attach to the current shared socket (after logout/login it is recreated). */
  rebindSocket() {
    const fresh = getSocket();
    if (fresh === this.socket) return;
    this.boundHandlers.forEach(([ev, h]) => this.socket.off(ev, h));
    this.boundHandlers = [];
    this.socket = fresh;
    this.bindSocket();
  }

  // ---------------------------------------------------------------- public

  async start(peer: CallPeer, type: CallType) {
    if (this.state.phase !== 'idle') return;
    this.peer = peer;
    this.callType = type;
    this.isCaller = true;
    this.setState({ phase: 'outgoing', type, peer });

    try {
      await this.attachMedia(type);
      this.createPeerConnection();
      this.attachLocalTracks();
    } catch (err: any) {
      this.hangUpLocal(err?.message === 'permission_denied'
        ? 'Microphone/camera permission denied'
        : 'Could not access your microphone');
      return;
    }

    this.socket.emit('call:invite', { to: peer.id, callType: type, fromName: undefined });

    // No answer within 30s → give up
    this.ringTimeout = setTimeout(() => {
      if (this.state.phase === 'outgoing') this.hangUp('No answer');
    }, 30000);
  }

  async accept() {
    if (this.state.phase !== 'incoming') return;
    this.setState({ phase: 'connecting', type: this.callType, peer: this.peer });
    this.watchConnectTimeout();
    try {
      await this.attachMedia(this.callType);
      this.createPeerConnection();
      this.attachLocalTracks();
    } catch {
      this.hangUp('Microphone/camera permission denied');
      return;
    }
    this.emitToPeer('call:accepted', {});
  }

  reject(reason = 'declined') {
    this.emitToPeer('call:rejected', { reason });
    this.cleanup();
    this.setState({ phase: 'ended', type: this.callType, peer: this.peer, message: 'Call declined' });
    this.scheduleIdle();
  }

  hangUp(message = 'Call ended') {
    this.emitToPeer('call:end', {});
    this.cleanup();
    this.setState({ phase: 'ended', type: this.callType, peer: this.peer, message });
    this.scheduleIdle();
  }

  toggleMute(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled; // true = muted
  }

  /** Mute/unmute the remote audio playback (speaker). */
  setSpeakerMuted(muted: boolean) {
    const els: Array<HTMLMediaElement | null> = [];
    document.querySelectorAll('audio, video').forEach((el) => {
      // Only mute elements playing the remote stream
      if ((el as HTMLVideoElement).srcObject || (el as HTMLAudioElement).srcObject) els.push(el as HTMLMediaElement);
    });
    els.forEach((el) => {
      (el as HTMLVideoElement).muted = muted;
    });
  }

  toggleCamera(): boolean {
    const track = this.localStream?.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled; // true = camera off
  }

  get sharingSupported(): boolean {
    return this.callType === 'video' && typeof navigator.mediaDevices?.getDisplayMedia === 'function';
  }

  get isSharing(): boolean {
    return this.localSharing;
  }

  async toggleScreenShare(): Promise<boolean> {
    if (!this.sharingSupported) {
      throw new Error('Screen sharing needs a video call (and works on desktop browsers)');
    }
    const pc = this.pc;
    if (!pc) return false;

    if (this.localSharing) {
      this.screenStream?.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && this.cameraTrack) await sender.replaceTrack(this.cameraTrack);
      // Put the camera preview back on the local stream
      const camStream = new MediaStream([this.cameraTrack!]);
      this.onLocalStream(camStream);
      this.localSharing = false;
      this.emitToPeer('call:sharing', { sharing: false });
      return false;
    }

    const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
    this.screenStream = screen;
    const screenTrack = screen.getVideoTracks()[0];
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (!sender) throw new Error('no video sender');
    await sender.replaceTrack(screenTrack);
    this.onLocalStream(new MediaStream([screenTrack]));
    screenTrack.onended = () => {
      // User pressed the browser's "Stop sharing"
      this.toggleScreenShare().catch(() => undefined);
    };
    this.localSharing = true;
    this.emitToPeer('call:sharing', { sharing: true });
    return true;
  }

  // ------------------------------------------------------------ signaling

  handleSignal(event: string, data: any) {
    switch (event) {
      case 'call:invite': {
        // Only react once per invite (duplicate relays / echoes are ignored)
        if (this.state.phase !== 'idle') {
          if (this.isCaller || this.state.peer?.id !== data.from) {
            this.socket.emit('call:rejected', { to: data.from, reason: 'busy' });
          }
          return;
        }
        this.isCaller = false;
        this.peer = {
          id: data.from,
          name: data.fromName || 'Unknown',
          username: data.fromUsername,
        };
        this.callType = data.callType === 'video' ? 'video' : 'audio';
        this.setState({ phase: 'incoming', type: this.callType, peer: this.peer });
        break;
      }

      case 'call:accepted': {
        if (this.state.phase !== 'outgoing' || !this.pc) return;
        if (this.ringTimeout) clearTimeout(this.ringTimeout);
        this.setState({ phase: 'connecting', type: this.callType, peer: this.peer });
        this.watchConnectTimeout();
        this.createOffer().catch(() => this.hangUp('Could not connect'));
        break;
      }

      case 'call:rejected': {
        if (this.state.phase !== 'outgoing') return;
        const reason = data.reason === 'busy' ? 'Busy on another call' : 'Call declined';
        this.cleanup();
        this.setState({ phase: 'ended', type: this.callType, peer: this.peer, message: reason });
        this.scheduleIdle();
        break;
      }

      case 'call:offer': {
        if (this.state.phase !== 'connecting' || !this.pc) return;
        this.acceptOffer(data.sdp).catch(() => this.hangUp('Could not connect'));
        break;
      }

      case 'call:answer': {
        if (!this.pc || this.pc.signalingState === 'stable') return;
        this.pc
          .setRemoteDescription(new RTCSessionDescription(data.sdp))
          .then(() => this.drainPendingIce())
          .catch(() => this.hangUp('Could not connect'));
        break;
      }

      case 'call:ice': {
        const candidate = data.candidate ? new RTCIceCandidate(data.candidate) : null;
        if (this.pc?.remoteDescription && this.pc.remoteDescription.type) {
          this.pc.addIceCandidate(candidate).catch(() => undefined);
        } else if (candidate) {
          this.pendingIce.push(data.candidate);
        }
        break;
      }

      case 'call:end': {
        if (this.state.phase === 'idle') return;
        this.cleanup();
        this.setState({ phase: 'ended', type: this.callType, peer: this.peer, message: 'Call ended' });
        this.scheduleIdle();
        break;
      }

      case 'call:sharing': {
        this.setState({ ...this.state, remoteSharing: !!data.sharing });
        break;
      }

      case 'call:control': {
        // Controller side: host granted (or revoked) control to me
        this.setState({ ...this.state, remoteControl: !!data.on });
        break;
      }
    }
  }

  // ---------------------------------------------------------------- control mode (host)

  /** Host: grant control to the selected peers. Connects to the localhost agent. */
  async grantControl(peerIds: string[]): Promise<void> {
    if (!this.agentWs || this.agentWs.readyState !== WebSocket.OPEN) {
      this.agentWs = new WebSocket('ws://127.0.0.1:9991');
      await new Promise<void>((resolve, reject) => {
        const ws = this.agentWs!;
        const timer = setTimeout(() => reject(new Error('Agent running korun (PC te start-agent.bat)')), 2500);
        ws.onopen = () => { clearTimeout(timer); resolve(); };
        ws.onerror = () => { clearTimeout(timer); reject(new Error('Agent running korun (PC te start-agent.bat)')); };
      });
    }
    this.controlEnabled = true;
    for (const id of peerIds) {
      this.emitToPeerById(id, 'call:control', { on: true });
    }
    this.grantedPeers = peerIds;
    this.setState({
      ...this.state,
      controlGrantedTo: peerIds
        .map((id) => (id === this.peer?.id ? this.peer.name : id)),
    });
  }

  /** Host: revoke control. */
  disableControl() {
    for (const id of this.grantedPeers) {
      this.emitToPeerById(id, 'call:control', { on: false });
    }
    this.grantedPeers = [];
    this.controlEnabled = false;
    this.agentWs?.close();
    this.agentWs = null;
    this.setState({ ...this.state, controlGrantedTo: [] });
  }

  /** Controller: send an input event to the host (relayed to its agent). */
  sendControlInput(obj: Record<string, unknown>) {
    try {
      this.controlChannel?.send(JSON.stringify(obj));
    } catch {
      /* channel not open */
    }
  }

  private emitToPeerById(id: string, event: string, payload: Record<string, unknown>) {
    this.socket.emit(event, { to: id, ...payload });
  }

  // ------------------------------------------------------------- internals

  private setState(patch: Partial<CallState> & { phase: CallPhase }) {
    this.state = { ...this.state, ...patch };
    if (this.state.phase === 'active' && this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    this.onState(this.state);
  }

  /** Give the ICE/TURN negotiation 20s, then give up with a clear message. */
  private watchConnectTimeout() {
    if (this.connectTimeout) clearTimeout(this.connectTimeout);
    this.connectTimeout = setTimeout(() => {
      if (this.state.phase === 'connecting') {
        this.hangUp('Could not connect — network blocked. Try again or check firewall.');
      }
    }, 20000);
  }

  private emitToPeer(event: string, payload: Record<string, unknown>) {
    if (!this.peer) return;
    this.socket.emit(event, { to: this.peer.id, ...payload });
  }

  private async attachMedia(type: CallType) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: type === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
      });
    } catch {
      const err: any = new Error('permission_denied');
      err.code = 'permission_denied';
      throw err;
    }
    if (type === 'video') {
      this.cameraTrack = this.localStream.getVideoTracks()[0] ?? null;
    }
    this.onLocalStream(this.localStream);
  }

  private createPeerConnection() {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.pc = pc;

    // Control DataChannel — controller sends input, host relays to its agent
    this.controlChannel = pc.createDataChannel('call-control', { ordered: true });
    this.controlChannel.onmessage = (e) => {
      if (this.controlEnabled && this.agentWs?.readyState === WebSocket.OPEN) {
        this.agentWs.send(e.data);
      }
    };
    pc.ondatachannel = (e) => {
      if (e.channel.label === 'call-control') {
        this.controlChannel = e.channel;
        this.controlChannel.onmessage = (ev) => {
          if (this.controlEnabled && this.agentWs?.readyState === WebSocket.OPEN) {
            this.agentWs.send(ev.data);
          }
        };
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) this.emitToPeer('call:ice', { candidate: e.candidate.toJSON() });
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      this.onRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      if (this.pc.connectionState === 'connected' && this.state.phase !== 'active') {
        this.setState({ phase: 'active', type: this.callType, peer: this.peer });
      }
      if (this.pc.connectionState === 'failed') {
        this.hangUp('Connection failed');
      }
      if (this.pc.connectionState === 'disconnected' && this.state.phase === 'active') {
        this.hangUp('Connection lost');
      }
    };
  }

  private attachLocalTracks() {
    if (!this.pc || !this.localStream) return;
    this.localStream.getTracks().forEach((track) => this.pc!.addTrack(track, this.localStream!));
  }

  private async createOffer() {
    if (!this.pc) return;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.emitToPeer('call:offer', { sdp: this.pc.localDescription?.toJSON() });
  }

  private async acceptOffer(sdp: RTCSessionDescriptionInit) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    this.drainPendingIce();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.emitToPeer('call:answer', { sdp: this.pc.localDescription?.toJSON() });
  }

  private drainPendingIce() {
    const queued = this.pendingIce.splice(0);
    queued.forEach((c) => this.pc?.addIceCandidate(new RTCIceCandidate(c)).catch(() => undefined));
  }

  private hangUpLocal(message: string) {
    this.cleanup();
    this.setState({ phase: 'ended', type: this.callType, peer: this.peer, message });
    this.scheduleIdle();
  }

  private cleanup() {
    if (this.ringTimeout) clearTimeout(this.ringTimeout);
    if (this.connectTimeout) clearTimeout(this.connectTimeout);
    if (this.controlEnabled) {
      for (const id of this.grantedPeers) {
        this.emitToPeerById(id, 'call:control', { on: false });
      }
    }
    this.controlEnabled = false;
    this.grantedPeers = [];
    this.agentWs?.close();
    this.agentWs = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.screenStream = null;
    this.cameraTrack = null;
    this.pendingIce = [];
    this.localSharing = false;
    this.pc?.close();
    this.pc = null;
    this.onLocalStream(null);
    this.onRemoteStream(null);
  }

  private scheduleIdle() {
    setTimeout(() => {
      if (this.state.phase === 'ended') this.setState({ phase: 'idle', type: 'audio', peer: null });
    }, 1800);
  }
}

let manager: CallManager | null = null;

export function getCallManager(): CallManager {
  if (!manager) manager = new CallManager();
  else manager.rebindSocket();
  return manager;
}
