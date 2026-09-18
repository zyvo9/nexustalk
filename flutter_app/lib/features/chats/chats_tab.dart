import 'package:flutter/material.dart';

import '../../core/network.dart';
import '../../core/socket.dart';
import '../../core/theme.dart';
import '../../widgets/avatar.dart';
import 'chat_view.dart';

class ChatsTab extends StatefulWidget {
  const ChatsTab({super.key, required this.me});
  final Map<String, dynamic> me;

  @override
  State<ChatsTab> createState() => _ChatsTabState();
}

class _ChatsTabState extends State<ChatsTab> {
  List<Map<String, dynamic>> _chats = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    // Realtime chat list updates
    SocketService.on('chat:update', (_) => _load());
    SocketService.on('message:new', (m) {
      // If we're not inside this chat, refresh list (unread badge)
      _load();
    });
  }

  Future<void> _load() async {
    try {
      final r = asMap(await Api.get('/api/chats'));
      if (!mounted) return;
      setState(() {
        _chats = asList(r['chats']);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openChat(Map<String, dynamic> chat) async {
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ChatView(me: widget.me, chat: chat),
    ));
    _load();
  }

  void _newChat() {
    showModalBottomSheet(
      context: context,
      backgroundColor: NTColors.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _NewChatSheet(onCreated: (chatId) {
        Navigator.of(context).pop();
        _load();
        // fetch the chat and open it
        _loadAndOpen(chatId);
      }),
    );
  }

  Future<void> _loadAndOpen(String chatId) async {
    await _load();
    final chat = _chats.firstWhere((c) => c['id'] == chatId, orElse: () => {});
    if (chat.isNotEmpty && mounted) _openChat(chat);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NTColors.bg,
      appBar: AppBar(
        title: const Text('NexusTalk'),
        actions: [
          IconButton(icon: const Icon(Icons.add_comment_outlined), onPressed: _newChat, tooltip: 'New chat'),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: NTColors.accent))
          : _chats.isEmpty
              ? _empty()
              : RefreshIndicator(
                  color: NTColors.accent,
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _chats.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, indent: 76),
                    itemBuilder: (_, i) {
                      final c = _chats[i];
                      final other = asMap(c['other']);
                      final last = asMap(c['lastMessage']);
                      final unread = (c['unread'] ?? 0) as int;
                      return ListTile(
                        onTap: () => _openChat(c),
                        leading: NAvatar(
                          name: (c['type'] == 'group' ? c['title'] : other['name']) ?? '?',
                          url: c['type'] == 'group' ? null : other['avatar'],
                          size: 52,
                        ),
                        title: Text(
                          c['title'] ?? 'Chat',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5),
                        ),
                        subtitle: last.isEmpty
                            ? const Text('Say hi 👋', style: TextStyle(color: NTColors.textMuted))
                            : Text(
                                '${last['mine'] == true ? 'You: ' : ''}${last['body'] ?? ''}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: NTColors.textSecondary, fontSize: 13),
                              ),
                        trailing: unread > 0
                            ? Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  gradient: NTColors.accentGradient,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text('$unread',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
                              )
                            : null,
                      );
                    },
                  ),
                ),
    );
  }

  Widget _empty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline, size: 56, color: NTColors.textMuted.withOpacity(.5)),
          const SizedBox(height: 14),
          const Text('No conversations yet', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 6),
          const Text('Username diye friend add korun', style: TextStyle(color: NTColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 18),
          ElevatedButton.icon(
            onPressed: _newChat,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Start New Chat'),
          ),
        ],
      ),
    );
  }
}

// ------------------------------------------------------------------ new chat

class _NewChatSheet extends StatefulWidget {
  const _NewChatSheet({required this.onCreated});
  final void Function(String chatId) onCreated;

  @override
  State<_NewChatSheet> createState() => _NewChatSheetState();
}

class _NewChatSheetState extends State<_NewChatSheet> {
  final _search = TextEditingController();
  List<Map<String, dynamic>> _results = [];
  bool _busy = false;

  Future<void> _doSearch(String q) async {
    if (q.trim().length < 2) {
      setState(() => _results = []);
      return;
    }
    try {
      final r = asMap(await Api.get('/api/users/search?q=${Uri.encodeComponent(q.trim())}'));
      if (mounted) setState(() => _results = asList(r['users']));
    } catch (_) {}
  }

  Future<void> _startDm(Map<String, dynamic> user) async {
    setState(() => _busy = true);
    try {
      final r = asMap(await Api.post('/api/chats/dm', body: {'username': user['username']}));
      widget.onCreated(r['chatId'] as String);
    } catch (e) {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('New chat', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
          const SizedBox(height: 6),
          const Text('Username diye search korun (@username)', style: TextStyle(color: NTColors.textSecondary, fontSize: 12.5)),
          const SizedBox(height: 14),
          TextField(
            controller: _search,
            autofocus: true,
            onChanged: _doSearch,
            decoration: const InputDecoration(hintText: '@username', prefixIcon: Icon(Icons.alternate_email, size: 19)),
          ),
          const SizedBox(height: 10),
          ..._results.map((u) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: NAvatar(name: u['name'] ?? '?', url: u['avatar'], size: 44),
                title: Text(u['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                subtitle: Text('@${u['username']}', style: const TextStyle(color: NTColors.sky, fontSize: 12)),
                trailing: _busy
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.arrow_forward, size: 18, color: NTColors.textSecondary),
                onTap: () => _startDm(u),
              )),
        ],
      ),
    );
  }
}
