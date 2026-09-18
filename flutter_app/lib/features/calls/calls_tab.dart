import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/network.dart';
import '../../core/socket.dart';
import '../../core/theme.dart';
import '../../widgets/avatar.dart';

class CallsTab extends StatefulWidget {
  const CallsTab({super.key, required this.me});
  final Map<String, dynamic> me;

  @override
  State<CallsTab> createState() => _CallsTabState();
}

class _CallsTabState extends State<CallsTab> {
  List<Map<String, dynamic>> _calls = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = asMap(await Api.get('/api/calls'));
      if (!mounted) return;
      setState(() {
        _calls = asList(r['calls']);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _fmtDuration(int s) {
    final m = s ~/ 60;
    final sec = s % 60;
    return '${m.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NTColors.bg,
      appBar: AppBar(title: const Text('Calls')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: NTColors.accent))
          : _calls.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.phone_outlined, size: 56, color: NTColors.textMuted.withOpacity(.5)),
                      const SizedBox(height: 14),
                      const Text('No call history', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      const SizedBox(height: 6),
                      const Text('Calls er history ekhane dekhabe',
                          style: TextStyle(color: NTColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  color: NTColors.accent,
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _calls.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, indent: 76),
                    itemBuilder: (_, i) {
                      final c = _calls[i];
                      final peer = asMap(c['peer']);
                      final outgoing = c['outgoing'] == true;
                      final missed = c['status'] == 'missed' || c['status'] == 'declined';
                      final created = DateTime.tryParse(c['createdAt'] ?? '')?.toLocal();
                      return ListTile(
                        leading: NAvatar(name: peer['name'] ?? '?', url: peer['avatar'], size: 50),
                        title: Text(peer['name'] ?? '',
                            style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: missed ? NTColors.danger : NTColors.textPrimary)),
                        subtitle: Row(
                          children: [
                            Icon(outgoing ? Icons.call_made : Icons.call_received,
                                size: 14, color: missed ? NTColors.danger : NTColors.online),
                            const SizedBox(width: 4),
                            Text(
                              created != null ? DateFormat('MMM d, HH:mm').format(created) : '',
                              style: const TextStyle(fontSize: 12.5, color: NTColors.textSecondary),
                            ),
                            if ((c['duration'] ?? 0) > 0) ...[
                              const SizedBox(width: 8),
                              Text(_fmtDuration(c['duration'] as int),
                                  style: const TextStyle(fontSize: 12.5, color: NTColors.textMuted)),
                            ],
                          ],
                        ),
                        trailing: Icon(
                          c['type'] == 'video' ? Icons.videocam_outlined : Icons.call_outlined,
                          color: NTColors.accent,
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
