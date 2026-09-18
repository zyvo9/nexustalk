import 'package:flutter/material.dart';

import '../../core/network.dart';
import '../../core/socket.dart';
import '../../core/theme.dart';
import '../home/home_shell.dart';

/// Decides: server setup → login → onboarding → home.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _loading = true;
  bool _hasServer = false;
  bool _hasToken = false;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final server = await ServerConfig.get();
    final token = await Session.token();
    final user = await Session.user();
    Map<String, dynamic>? fresh;
    if (token != null && token.isNotEmpty && server.isNotEmpty) {
      try {
        final r = asMap(await Api.get('/api/me'));
        fresh = asMap(r['user']);
        await Session.saveUser(fresh);
      } catch (_) {
        await Session.clear();
      }
    }
    if (!mounted) return;
    setState(() {
      _loading = false;
      _hasServer = server.isNotEmpty;
      _hasToken = token != null && token.isNotEmpty;
      _user = fresh ?? user;
    });
  }

  void _onLoggedIn(Map<String, dynamic> user) {
    setState(() {
      _hasToken = true;
      _user = user;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: NTColors.accent)),
      );
    }
    if (!_hasServer) {
      return ServerSetupScreen(onDone: () => setState(() => _hasServer = true));
    }
    if (!_hasToken || _user == null) {
      return LoginScreen(onLoggedIn: _onLoggedIn);
    }
    if (_user!['onboarded'] != true) {
      return OnboardingScreen(
        initialName: _user!['name'] ?? '',
        onDone: (u) {
          setState(() => _user = u);
        },
      );
    }
    return HomeShell(me: _user!);
  }
}

// ---------------------------------------------------------------- server setup

class ServerSetupScreen extends StatefulWidget {
  const ServerSetupScreen({super.key, required this.onDone});
  final VoidCallback onDone;

  @override
  State<ServerSetupScreen> createState() => _ServerSetupScreenState();
}

class _ServerSetupScreenState extends State<ServerSetupScreen> {
  final _controller = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _connect() async {
    final url = _controller.text.trim();
    if (url.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    await ServerConfig.set(url);
    try {
      final r = asMap(await Api.get('/api/health'));
      if (r['ok'] == true) {
        widget.onDone();
      } else {
        setState(() => _error = 'This does not look like a NexusTalk server');
      }
    } catch (_) {
      setState(() => _error = 'Server e connect kora jacche na — link ta check korun');
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Column(
              children: [
                Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    gradient: NTColors.accentGradient,
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [BoxShadow(color: NTColors.accent.withOpacity(.35), blurRadius: 30)],
                  ),
                  child: const Center(
                    child: Text('N', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
                  ),
                ),
                const SizedBox(height: 20),
                const Text('NexusTalk', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                const Text(
                  'Apnar server er link din —\napp er sob UI built-in, sudhu server e connect hobe.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: NTColors.textSecondary, height: 1.5),
                ),
                const SizedBox(height: 32),
                TextField(
                  controller: _controller,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(
                    hintText: 'https://your-server.com',
                    prefixIcon: Icon(Icons.dns_outlined, size: 20),
                  ),
                  onSubmitted: (_) => _connect(),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: NTColors.danger, fontSize: 12.5)),
                ],
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _busy ? null : _connect,
                  child: _busy
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                      : const Text('Connect'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- login

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLoggedIn});
  final void Function(Map<String, dynamic> user) onLoggedIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _register = false;
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final r = _register
          ? asMap(await Api.post('/api/auth/register', body: {
              'email': _email.text.trim(),
              'password': _password.text,
              'name': _name.text.trim(),
            }))
          : asMap(await Api.post('/api/auth/login', body: {
              'email': _email.text.trim(),
              'password': _password.text,
            }));
      await Session.saveToken(r['token'] as String);
      final user = asMap(r['user']);
      await Session.saveUser(user);
      await SocketService.connect();
      widget.onLoggedIn(user);
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Column(
              children: [
                Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    gradient: NTColors.accentGradient,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: NTColors.accent.withOpacity(.35), blurRadius: 26)],
                  ),
                  child: const Center(
                    child: Text('N', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  _register ? 'Create your account' : 'Welcome back',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 26),
                if (_register) ...[
                  TextField(
                    controller: _name,
                    decoration: const InputDecoration(hintText: 'Your name', prefixIcon: Icon(Icons.person_outline, size: 20)),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(hintText: 'Email', prefixIcon: Icon(Icons.mail_outline, size: 20)),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(hintText: 'Password', prefixIcon: Icon(Icons.lock_outline, size: 20)),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: NTColors.danger, fontSize: 12.5)),
                ],
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _busy ? null : _submit,
                  child: _busy
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                      : Text(_register ? 'Create account' : 'Log in'),
                ),
                const SizedBox(height: 14),
                TextButton(
                  onPressed: () => setState(() {
                    _register = !_register;
                    _error = null;
                  }),
                  child: Text(
                    _register ? 'Already have an account? Log in' : "Don't have an account? Create one",
                    style: const TextStyle(color: NTColors.textSecondary, fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- onboarding

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.initialName, required this.onDone});
  final String initialName;
  final void Function(Map<String, dynamic> user) onDone;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  late final _name = TextEditingController(text: widget.initialName);
  final _username = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _done() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Api.patch('/api/me', body: {'name': _name.text.trim()});
      final r2 = asMap(await Api.patch('/api/me', body: {'username': _username.text.trim()}));
      final user = asMap(r2['user']);
      await Session.saveUser(user);
      widget.onDone(user);
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Column(
              children: [
                const Text('Profile info', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                const Text(
                  'Apnar name ar ekta unique username din —\nfriends add korbe username diye.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: NTColors.textSecondary, fontSize: 13, height: 1.5),
                ),
                const SizedBox(height: 28),
                TextField(
                  controller: _name,
                  decoration: const InputDecoration(hintText: 'Name', prefixIcon: Icon(Icons.person_outline, size: 20)),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _username,
                  decoration: const InputDecoration(
                    hintText: 'username (a-z, 0-9, _)',
                    prefixText: '@ ',
                    prefixStyle: TextStyle(color: NTColors.textSecondary),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: NTColors.danger, fontSize: 12.5)),
                ],
                const SizedBox(height: 22),
                ElevatedButton(
                  onPressed: _busy ? null : _done,
                  child: _busy
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                      : const Text('Done'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
