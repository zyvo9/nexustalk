import 'package:flutter/material.dart';

import '../../core/network.dart';
import '../../core/socket.dart';
import '../../core/theme.dart';
import '../auth/auth_gate.dart';
import '../calls/call_manager.dart';
import '../calls/call_screen.dart';
import '../chats/chats_tab.dart';
import '../calls/calls_tab.dart';
import '../settings/settings_tab.dart';

/// Main app shell — 3 tabs: Chats, Calls, Settings. Calls overlay on top.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.me});
  final Map<String, dynamic> me;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    SocketService.connect().then((_) {
      CallManager.I.bindSignals();
    });
  }

  void _logout() {
    SocketService.disconnect();
    Session.clear();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const AuthGate()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      ChatsTab(me: widget.me),
      CallsTab(me: widget.me),
      SettingsTab(me: widget.me, onLoggedOut: _logout),
    ];

    return AnimatedBuilder(
      animation: CallManager.I,
      builder: (context, _) => Scaffold(
        backgroundColor: NTColors.bg,
        body: Stack(
          children: [
            IndexedStack(index: _tab, children: pages),
            // Call overlay on top of everything
            if (CallManager.I.state.phase != CallPhase.idle)
              const CallScreen(),
          ],
        ),
        bottomNavigationBar: NavigationBarTheme(
          data: NavigationBarThemeData(
            backgroundColor: NTColors.bgCard,
            indicatorColor: NTColors.accent.withOpacity(.18),
            labelTextStyle: const WidgetStatePropertyAll(
              TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: NTColors.textSecondary),
            ),
          ),
          child: NavigationBar(
            selectedIndex: _tab,
            onDestinationSelected: (i) => setState(() => _tab = i),
            destinations: const [
              NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Chats'),
              NavigationDestination(icon: Icon(Icons.phone_outlined), selectedIcon: Icon(Icons.phone), label: 'Calls'),
              NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
            ],
          ),
        ),
      ),
    );
  }
}
