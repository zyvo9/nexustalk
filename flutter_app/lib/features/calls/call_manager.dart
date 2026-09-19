import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart' as rtc;

import '../../core/socket.dart';

enum CallPhase { idle, outgoing, incoming, connecting, active, ended }
enum CallType { audio, video }

class CallPeer {
  CallPeer({required this.id, required this.name, this.username, this.avatar});
  final String id;
  final String name;
  final String? username;
  final String? avatar;
}

class CallState {
  CallState({
    required this.phase,
    required this.type,
    this.peer,
    this.message,
    this.remoteSharing = false,
  });
  final CallPhase phase;
  final CallType type;
  final CallPeer? peer;
  final String? message;
  final bool remoteSharing;

  bool get isVideo => type == CallType.video;
}

/// P2P audio/video calls (WebRTC) — server relays signaling only.
class CallManager extends ChangeNotifier {
  CallManager._();
  static final CallManager I = CallManager._();

  CallState state = CallState(phase: CallPhase.idle, type: CallType.audio);

  rtc.MediaStream? localStream;
  rtc.MediaStream? remoteStream;
  bool micMuted = false;
  bool camOff = false;
  DateTime? _activeSince;

  rtc.RTCPeerConnection? _pc;
  final List<Map<String, dynamic>> _pendingIce = [];
  bool _isCaller = false;
  Timer? _ringTimer;
  String? _metaCalleeId;

  static const _config = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {
        'urls': 'turn:openrelay.metered.ca:80',
        'username': 'openrelayproject',
        'credential': 'openrelayproject',
      },
      {
        'urls': 'turn:openrelay.metered.ca:443',
        'username': 'openrelayproject',
        'credential': 'openrelayproject',
      },
      {
        'urls': 'turn:openrelay.metered.ca:443?transport=tcp',
        'username': 'openrelayproject',
        'credential': 'openrelayproject',
      },
    ],
  };

  void _set(CallState s) {
    state = s;
    notifyListeners();
  }

  // ---------------------------------------------------------------- lifecycle

  Future<void> start(CallPeer peer, CallType type) async {
    if (state.phase != CallPhase.idle) return;
    _isCaller = true;
    _metaCalleeId = peer.id;
    _set(CallState(phase: CallPhase.outgoing, type: type, peer: peer));
    try {
      localStream = await rtc.navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': type == CallType.video
            ? {'facingMode': 'user', 'width': {'ideal': 1280}, 'height': {'ideal': 720}}
            : false,
      });
      micMuted = false;
      camOff = false;
      await _createPc();
      localStream!.getTracks().forEach((t) => _pc!.addTrack(t, localStream!));
      SocketService.emit('call:invite', {
        'to': peer.id,
        'callType': type == CallType.video ? 'video' : 'audio',
      });
      _ringTimer = Timer(const Duration(seconds: 30), () {
        if (state.phase == CallPhase.outgoing) hangUp('No answer');
      });
    } catch (e) {
      hangUp('Mic/Camera permission lagbe');
    }
  }

  Future<void> accept() async {
    if (state.phase != CallPhase.incoming) return;
    final peer = state.peer;
    final type = state.type;
    _set(CallState(phase: CallPhase.connecting, type: type, peer: peer));
    try {
      localStream = await rtc.navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': type == CallType.video
            ? {'facingMode': 'user', 'width': {'ideal': 1280}, 'height': {'ideal': 720}}
            : false,
      });
      micMuted = false;
      camOff = false;
      await _createPc();
      localStream!.getTracks().forEach((t) => _pc!.addTrack(t, localStream!));
      SocketService.emit('call:accepted', {'to': peer!.id});
    } catch (e) {
      hangUp('Mic/Camera permission lagbe');
    }
  }

  void reject() {
    SocketService.emit('call:rejected', {'to': state.peer?.id});
    _cleanup('Call declined');
  }

  void hangUp([String? msg]) {
    final duration = _activeSince == null
        ? 0
        : DateTime.now().difference(_activeSince!).inSeconds;
    SocketService.emit('call:end', {
      'to': state.peer?.id,
      if (_isCaller)
        'meta': {
          'calleeId': _metaCalleeId ?? state.peer?.id,
          'callType': state.type == CallType.video ? 'video' : 'audio',
          'status': _activeSince != null ? 'answered' : 'missed',
          'duration': duration,
        },
    });
    _cleanup(msg ?? 'Call ended');
  }

  void _cleanup(String msg) {
    _ringTimer?.cancel();
    _ringTimer = null;
    _pc?.close();
    _pc = null;
    localStream?.getTracks().forEach((t) {
      try {
        t.stop();
      } catch (_) {}
    });
    localStream = null;
    remoteStream = null;
    _pendingIce.clear();
    _activeSince = null;
    _set(CallState(phase: CallPhase.ended, type: state.type, peer: state.peer, message: msg));
    Timer(const Duration(milliseconds: 1600), () {
      if (state.phase == CallPhase.ended) _set(CallState(phase: CallPhase.idle, type: CallType.audio));
    });
  }

  // ---------------------------------------------------------------- WebRTC

  Future<void> _createPc() async {
    final pc = await rtc.createPeerConnection(_config);
    _pc = pc;
    pc.onIceCandidate = (c) {
      if (c.candidate != null) {
        SocketService.emit('call:ice', {
          'to': state.peer?.id,
          'candidate': {
            'candidate': c.candidate,
            'sdpMid': c.sdpMid,
            'sdpMLineIndex': c.sdpMLineIndex,
          },
        });
      }
    };
    pc.onTrack = (e) {
      if (e.streams.isNotEmpty) {
        remoteStream = e.streams.first;
        notifyListeners();
      }
    };
    pc.onConnectionState = (s) {
      if (s == rtc.RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
        _activeSince ??= DateTime.now();
        _set(CallState(phase: CallPhase.active, type: state.type, peer: state.peer));
      } else if (s == rtc.RTCPeerConnectionState.RTCPeerConnectionStateFailed) {
        hangUp('Connection failed');
      } else if (s == rtc.RTCPeerConnectionState.RTCPeerConnectionStateDisconnected) {
        if (state.phase == CallPhase.active) hangUp('Connection lost');
      }
    };
  }

  Future<void> _makeOffer() async {
    final offer = await _pc!.createOffer({});
    await _pc!.setLocalDescription(offer);
    SocketService.emit('call:offer', {
      'to': state.peer?.id,
      'sdp': {'type': offer.type, 'sdp': offer.sdp},
    });
  }

  // ---------------------------------------------------------------- signals

  /// Bind once (after login). Server relays: {...data, from, fromName}.
  void bindSignals() {
    SocketService.on('call:invite', (d) {
      final data = Map<String, dynamic>.from(d as Map);
      if (state.phase != CallPhase.idle) {
        SocketService.emit('call:rejected', {'to': data['from'], 'reason': 'busy'});
        return;
      }
      _isCaller = false;
      final peer = CallPeer(
        id: data['from'] as String,
        name: (data['fromName'] as String?) ?? 'Unknown',
      );
      final isVideo = data['callType'] == 'video';
      _set(CallState(
        phase: CallPhase.incoming,
        type: isVideo ? CallType.video : CallType.audio,
        peer: peer,
      ));
    });

    SocketService.on('call:accepted', (d) async {
      if (state.phase != CallPhase.outgoing) return;
      _ringTimer?.cancel();
      _set(CallState(phase: CallPhase.connecting, type: state.type, peer: state.peer));
      await _makeOffer();
    });

    SocketService.on('call:rejected', (d) {
      if (state.phase != CallPhase.outgoing) return;
      final data = Map<String, dynamic>.from(d as Map);
      _cleanup(data['reason'] == 'busy' ? 'Busy on another call' : 'Call declined');
    });

    SocketService.on('call:offer', (d) async {
      if (state.phase != CallPhase.connecting || _pc == null) return;
      final data = Map<String, dynamic>.from(d as Map);
      final sdp = Map<String, dynamic>.from(data['sdp'] as Map);
      await _pc!.setRemoteDescription(
        rtc.RTCSessionDescription(sdp['sdp'] as String, sdp['type'] as String),
      );
      for (final c in _pendingIce) {
        await _pc!.addCandidate(rtc.RTCIceCandidate(
          c['candidate'] as String?,
          c['sdpMid'] as String?,
          c['sdpMLineIndex'] as int?,
        ));
      }
      _pendingIce.clear();
      final answer = await _pc!.createAnswer({});
      await _pc!.setLocalDescription(answer);
      SocketService.emit('call:answer', {
        'to': data['from'],
        'sdp': {'type': answer.type, 'sdp': answer.sdp},
      });
    });

    SocketService.on('call:answer', (d) async {
      if (_pc == null) return;
      final data = Map<String, dynamic>.from(d as Map);
      final sdp = Map<String, dynamic>.from(data['sdp'] as Map);
      await _pc!.setRemoteDescription(
        rtc.RTCSessionDescription(sdp['sdp'] as String, sdp['type'] as String),
      );
      for (final c in _pendingIce) {
        await _pc!.addCandidate(rtc.RTCIceCandidate(
          c['candidate'] as String?,
          c['sdpMid'] as String?,
          c['sdpMLineIndex'] as int?,
        ));
      }
      _pendingIce.clear();
    });

    SocketService.on('call:ice', (d) async {
      final data = Map<String, dynamic>.from(d as Map);
      final c = Map<String, dynamic>.from(data['candidate'] as Map? ?? {});
      if (_pc != null && _pc!.getRemoteDescription() != null) {
        await _pc!.addCandidate(rtc.RTCIceCandidate(
          c['candidate'] as String?,
          c['sdpMid'] as String?,
          c['sdpMLineIndex'] as int?,
        ));
      } else if (c.isNotEmpty) {
        _pendingIce.add(c);
      }
    });

    SocketService.on('call:end', (d) {
      if (state.phase == CallPhase.idle) return;
      _cleanup('Call ended');
    });

    SocketService.on('call:sharing', (d) {
      final data = Map<String, dynamic>.from(d as Map);
      _set(CallState(
        phase: state.phase,
        type: state.type,
        peer: state.peer,
        message: state.message,
        remoteSharing: data['sharing'] == true,
      ));
    });
  }

  // ---------------------------------------------------------------- controls

  void toggleMute() {
    final track = localStream?.getAudioTracks().firstOrNull;
    if (track == null) return;
    track.enabled = micMuted; // toggle
    micMuted = !micMuted;
    notifyListeners();
  }

  void toggleCamera() {
    final track = localStream?.getVideoTracks().firstOrNull;
    if (track == null) return;
    track.enabled = camOff; // toggle
    camOff = !camOff;
    notifyListeners();
  }
}

extension _FirstOrNull<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
