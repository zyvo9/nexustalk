import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart' as rtc;

import '../../core/theme.dart';
import '../../widgets/avatar.dart';
import 'call_manager.dart';

/// Full-screen call overlay: ringing, connecting, active (video/voice).
class CallScreen extends StatefulWidget {
  const CallScreen({super.key});
  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  final _remoteRenderer = rtc.RTCVideoRenderer();
  final _localRenderer = rtc.RTCVideoRenderer();
  Timer? _tick;
  int _seconds = 0;

  @override
  void initState() {
    super.initState();
    CallManager.I.addListener(_onCall);
    _init();
  }

  Future<void> _init() async {
    await _remoteRenderer.initialize();
    await _localRenderer.initialize();
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    CallManager.I.removeListener(_onCall);
    _tick?.cancel();
    _remoteRenderer.dispose();
    _localRenderer.dispose();
    super.dispose();
  }

  void _onCall() {
    final cm = CallManager.I;
    if (cm.remoteStream != null) {
      _remoteRenderer.srcObject = cm.remoteStream;
    } else {
      _remoteRenderer.srcObject = null;
    }
    _localRenderer.srcObject = cm.localStream;
    if (cm.state.phase == CallPhase.active && _tick == null) {
      _tick = Timer.periodic(const Duration(seconds: 1), (_) => setState(() => _seconds++));
    }
    if (cm.state.phase == CallPhase.ended || cm.state.phase == CallPhase.idle) {
      _tick?.cancel();
      _tick = null;
      _seconds = 0;
    }
    if (mounted) setState(() {});
  }

  String _fmt(int t) =>
      '${(t ~/ 60).toString().padLeft(2, '0')}:${(t % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final cm = CallManager.I;
    final s = cm.state;
    final peer = s.peer;

    return Material(
      color: NTColors.bg,
      child: SafeArea(
        child: Stack(
          children: [
            // -------- video layer --------
            if (s.isVideo && s.phase == CallPhase.active)
              Positioned.fill(
                child: rtc.RTCVideoView(
                  _remoteRenderer,
                  objectFit: rtc.RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                ),
              ),

            // -------- voice / non-active background --------
            if (!s.isVideo || s.phase != CallPhase.active)
              Positioned.fill(
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0xFF0B1226), NTColors.bg],
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 110,
                        height: 110,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: NTColors.accent.withOpacity(.35),
                              blurRadius: 40,
                              spreadRadius: 6,
                            ),
                          ],
                        ),
                        child: NAvatar(name: peer?.name ?? '?', url: peer?.avatar, size: 110),
                      ),
                      const SizedBox(height: 18),
                      Text(peer?.name ?? '',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 8),
                      Text(
                        s.phase == CallPhase.outgoing
                            ? (s.isVideo ? 'Ringing — video call' : 'Ringing…')
                            : s.phase == CallPhase.connecting
                                ? 'Connecting…'
                                : s.phase == CallPhase.ended
                                    ? (s.message ?? 'Call ended')
                                    : _fmt(_seconds),
                        style: const TextStyle(color: NTColors.textSecondary, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ),

            // -------- local PiP --------
            if (s.isVideo && s.phase == CallPhase.active && cm.localStream != null)
              Positioned(
                top: 24,
                right: 16,
                width: 110,
                height: 150,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: rtc.RTCVideoView(_localRenderer, mirror: true),
                ),
              ),

            // -------- top bar --------
            Positioned(
              top: 16,
              left: 20,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (s.isVideo && s.phase == CallPhase.active) ...[
                    Text(peer?.name ?? '',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                    Text(_fmt(_seconds),
                        style: const TextStyle(color: NTColors.online, fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                  if (s.remoteSharing)
                    const Padding(
                      padding: EdgeInsets.only(top: 4),
                      child: Text('Sharing screen…', style: TextStyle(color: NTColors.sky, fontSize: 12)),
                    ),
                ],
              ),
            ),

            // -------- controls --------
            Positioned(
              left: 0,
              right: 0,
              bottom: 30,
              child: Column(
                children: [
                  if (s.phase == CallPhase.incoming) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _round(
                          Icons.call_end,
                          NTColors.danger,
                          onTap: () => CallManager.I.reject(),
                        ),
                        const SizedBox(width: 40),
                        _round(
                          Icons.call,
                          NTColors.online,
                          onTap: () => CallManager.I.accept(),
                        ),
                      ],
                    ),
                  ] else if (s.phase == CallPhase.outgoing || s.phase == CallPhase.connecting) ...[
                    _round(Icons.call_end, NTColors.danger, onTap: () => CallManager.I.hangUp()),
                  ] else if (s.phase == CallPhase.active) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _ctrl(
                          cm.micMuted ? Icons.mic_off : Icons.mic,
                          cm.micMuted,
                          onTap: () => CallManager.I.toggleMute(),
                        ),
                        const SizedBox(width: 16),
                        if (s.isVideo)
                          _ctrl(
                            cm.camOff ? Icons.videocam_off : Icons.videocam,
                            cm.camOff,
                            onTap: () => CallManager.I.toggleCamera(),
                          ),
                        if (s.isVideo) const SizedBox(width: 16),
                        _round(Icons.call_end, NTColors.danger, size: 60, onTap: () => CallManager.I.hangUp()),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _round(IconData icon, Color color, {required VoidCallback onTap, double size = 68}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle, boxShadow: [
          BoxShadow(color: color.withOpacity(.4), blurRadius: 18),
        ]),
        child: Icon(icon, color: Colors.white, size: size * .45),
      ),
    );
  }

  Widget _ctrl(IconData icon, bool active, {required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          color: active ? Colors.white.withOpacity(.14) : Colors.white.withOpacity(.07),
          shape: BoxShape.circle,
          border: Border.all(color: active ? NTColors.accent : NTColors.border),
        ),
        child: Icon(icon, color: active ? NTColors.accent : Colors.white, size: 24),
      ),
    );
  }
}
