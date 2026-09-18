import 'package:flutter/material.dart';

import 'core/theme.dart';
import 'features/auth/auth_gate.dart';

void main() {
  runApp(const NexusTalkApp());
}

class NexusTalkApp extends StatelessWidget {
  const NexusTalkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NexusTalk',
      debugShowCheckedModeBanner: false,
      theme: NTTheme.dark(),
      home: const AuthGate(),
    );
  }
}
