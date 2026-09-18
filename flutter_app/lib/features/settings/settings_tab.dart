import 'package:flutter/material.dart';

import '../../core/network.dart';
import '../../core/socket.dart';
import '../../core/theme.dart';
import '../../widgets/avatar.dart';

class SettingsTab extends StatefulWidget {
  const SettingsTab({super.key, required this.me, required this.onLoggedOut});
  final Map<String, dynamic> me;
  final VoidCallback onLoggedOut;

  @override
  State<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<SettingsTab> {
  late final TextEditingController _server = TextEditingController(text: ServerConfig.cached);

  Future<void> _saveServer() async {
    await ServerConfig.set(_server.text);
    SocketService.disconnect();
    await SocketService.connect();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Server address saved — reconnecting')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = widget.me;
    return Scaffold(
      backgroundColor: NTColors.bg,
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [NTColors.accent.withOpacity(.18), NTColors.sky.withOpacity(.08)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: NTColors.border),
            ),
            child: Row(
              children: [
                NAvatar(name: me['name'] ?? '?', url: me['avatar'], size: 62),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(me['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                      const SizedBox(height: 3),
                      Text('@${me['username'] ?? ''}',
                          style: const TextStyle(color: NTColors.sky, fontSize: 13, fontWeight: FontWeight.w600)),
                      Text(me['email'] ?? '',
                          style: const TextStyle(color: NTColors.textMuted, fontSize: 11.5)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const _SectionLabel('Server'),
          _Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _server,
                  decoration: const InputDecoration(hintText: 'https://your-server.com', prefixIcon: Icon(Icons.dns_outlined, size: 20)),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: _saveServer,
                  icon: const Icon(Icons.save_outlined, size: 18),
                  label: const Text('Save & reconnect'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const _SectionLabel('Account'),
          _Card(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.logout, color: NTColors.danger),
              title: const Text('Log out', style: TextStyle(color: NTColors.danger, fontWeight: FontWeight.w700)),
              onTap: widget.onLoggedOut,
            ),
          ),
          const SizedBox(height: 24),
          const Center(
            child: Text('NexusTalk v2.0 — Flutter native client',
                style: TextStyle(color: NTColors.textMuted, fontSize: 11)),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(left: 6, bottom: 8),
        child: Text(text.toUpperCase(),
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800,
                color: NTColors.textMuted, letterSpacing: 1.1)),
      );
}

class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: NTColors.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: NTColors.border),
        ),
        child: child,
      );
}
