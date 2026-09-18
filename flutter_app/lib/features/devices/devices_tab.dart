import 'package:flutter/material.dart';

import '../../core/socket.dart';
import '../../core/theme.dart';

/// Devices tab — this PC's host-agent status + remote sessions.
/// The actual CRD session view arrives with the webrtc feature.
class DevicesTab extends StatefulWidget {
  const DevicesTab({super.key, required this.me});
  final Map<String, dynamic> me;

  @override
  State<DevicesTab> createState() => _DevicesTabState();
}

class _DevicesTabState extends State<DevicesTab> {
  bool _agentOnline = false;

  @override
  void initState() {
    super.initState();
    SocketService.on('agent:status', (d) {
      final data = (d is Map) ? d : {};
      if (mounted) setState(() => _agentOnline = data['online'] == true);
    });
    _checkAgent();
  }

  void _checkAgent() {
    SocketService.emit('agent:status-check', {});
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) setState(() {}); // apply whatever came back
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NTColors.bg,
      appBar: AppBar(title: const Text('Devices')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // This device (host service status)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: NTColors.bgCard,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: NTColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: NTColors.accent.withOpacity(.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.computer, color: NTColors.accent),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text('This PC',
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
                    ),
                    _statusChip(),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  _agentOnline
                      ? 'Host service (agent) online — ei PC ke onno device theke control kora jabe.'
                      : 'Host service offline — PC te start-agent.bat chalu korun (ba desktop app khulun).',
                  style: const TextStyle(color: NTColors.textSecondary, fontSize: 12.5, height: 1.5),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _checkAgent,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Refresh status'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: NTColors.bgCard,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: NTColors.border),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Icon(Icons.screen_share_outlined, color: NTColors.sky, size: 20),
                  SizedBox(width: 8),
                  Text('Remote control sessions', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                ]),
                SizedBox(height: 8),
                Text(
                  'Call er bhitore share → Remote control → Grant control —\nCRD-style full-screen session khule jabe.',
                  style: TextStyle(color: NTColors.textSecondary, fontSize: 12.5, height: 1.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusChip() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: _agentOnline ? NTColors.online.withOpacity(.15) : NTColors.textMuted.withOpacity(.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: _agentOnline ? NTColors.online : NTColors.textMuted,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            _agentOnline ? 'ONLINE' : 'OFFLINE',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              color: _agentOnline ? NTColors.online : NTColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
