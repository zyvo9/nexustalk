import 'package:flutter/material.dart';

import '../../core/network.dart';
import '../../core/socket.dart';
import '../calls/call_manager.dart';
import '../../core/theme.dart';
import '../../widgets/avatar.dart';

class ChatView extends StatefulWidget {
  const ChatView({super.key, required this.me, required this.chat});
  final Map<String, dynamic> me;
  final Map<String, dynamic> chat;

  @override
  State<ChatView> createState() => _ChatViewState();
}

class _ChatViewState extends State<ChatView> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  String? _typingName;

  String get _chatId => widget.chat['id'] as String;

  @override
  void initState() {
    super.initState();
    _load();
    SocketService.emit('chat:join', {'chatId': _chatId});
    SocketService.on('message:new', _onNew);
    SocketService.on('typing', _onTyping);
  }

  @override
  void dispose() {
    SocketService.off('message:new');
    SocketService.off('typing');
    SocketService.emit('chat:leave', {'chatId': _chatId});
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final r = asMap(await Api.get('/api/chats/$_chatId/messages'));
      if (!mounted) return;
      setState(() => _messages = asList(r['messages']));
      _jumpBottom();
    } catch (_) {}
  }

  void _jumpBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.jumpTo(_scroll.position.maxScrollExtent);
      }
    });
  }

  void _onNew(dynamic m) {
    final msg = asMap(m);
    if (msg['chatId'] != _chatId) return;
    if (!mounted) return;
    setState(() => _messages = [..._messages, msg]);
    _jumpBottom();
  }

  void _onTyping(dynamic t) {
    final data = asMap(t);
    if (data['chatId'] != _chatId) return;
    if (!mounted) return;
    setState(() => _typingName = data['isTyping'] == true ? data['name'] : null);
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    _controller.clear();
    SocketService.emit('message:send', {'chatId': _chatId, 'body': text});
  }

  @override
  Widget build(BuildContext context) {
    final isGroup = widget.chat['type'] == 'group';
    return Scaffold(
      backgroundColor: NTColors.bg,
      appBar: AppBar(
        backgroundColor: NTColors.bgCard,
        titleSpacing: 0,
        actions: [
          // Voice call
          IconButton(
            icon: const Icon(Icons.phone_outlined, size: 21),
            tooltip: 'Voice call',
            onPressed: () => CallManager.I.start(
              CallPeer(
                id: (asMap(widget.chat['other'])['id'] ?? '') as String,
                name: (widget.chat['title'] ?? '?') as String,
                username: asMap(widget.chat['other'])['username'] as String?,
                avatar: asMap(widget.chat['other'])['avatar'] as String?,
              ),
              CallType.audio,
            ),
          ),
          // Video call
          IconButton(
            icon: const Icon(Icons.videocam_outlined, size: 22),
            tooltip: 'Video call',
            onPressed: () => CallManager.I.start(
              CallPeer(
                id: (asMap(widget.chat['other'])['id'] ?? '') as String,
                name: (widget.chat['title'] ?? '?') as String,
                username: asMap(widget.chat['other'])['username'] as String?,
                avatar: asMap(widget.chat['other'])['avatar'] as String?,
              ),
              CallType.video,
            ),
          ),
          const SizedBox(width: 4),
        ],
        title: Row(
          children: [
            NAvatar(
              name: widget.chat['title'] ?? '?',
              url: isGroup ? null : asMap(widget.chat['other'])['avatar'],
              size: 38,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.chat['title'] ?? 'Chat',
                      style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(
                    _typingName != null
                        ? '$_typingName typing…'
                        : isGroup
                            ? 'group'
                            : '@${asMap(widget.chat['other'])['username'] ?? ''}',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: _typingName != null ? NTColors.sky : NTColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scroll,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
              itemCount: _messages.length,
              itemBuilder: (_, i) {
                final m = _messages[i];
                final mine = m['senderId'] == widget.me['id'];
                return _bubble(m, mine);
              },
            ),
          ),
          _composer(),
        ],
      ),
    );
  }

  Widget _bubble(Map<String, dynamic> m, bool mine) {
    final atts = asList(m['attachments']);
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * .78),
        decoration: BoxDecoration(
          gradient: mine ? NTColors.accentGradient : null,
          color: mine ? null : NTColors.surface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(mine ? 18 : 4),
            bottomRight: Radius.circular(mine ? 4 : 18),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!mine && widget.chat['type'] == 'group')
              Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Text(m['senderName'] ?? '',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: NTColors.sky)),
              ),
            for (final a in atts)
              Padding(
                padding: const EdgeInsets.only(bottom: 5),
                child: _attachment(asMap(a)),
              ),
            if ((m['body'] ?? '').toString().isNotEmpty)
              Text(
                m['body'],
                style: const TextStyle(fontSize: 14.5, height: 1.35, color: NTColors.textPrimary),
              ),
          ],
        ),
      ),
    );
  }

  Widget _attachment(Map<String, dynamic> a) {
    final mime = a['mime'] ?? '';
    final url = serverAssetUrl('/api/files/${a['id']}');
    if (mime.startsWith('image/')) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 240, maxHeight: 220),
          child: Image.network(url, fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, color: NTColors.textMuted)),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(12)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.insert_drive_file, size: 20, color: NTColors.sky),
          const SizedBox(width: 8),
          Flexible(
            child: Text(a['name'] ?? 'file',
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }

  Widget _composer() {
    return Container(
      padding: EdgeInsets.fromLTRB(12, 10, 12, 10 + MediaQuery.of(context).padding.bottom * 0),
      color: NTColors.bgCard,
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              minLines: 1,
              maxLines: 4,
              style: const TextStyle(fontSize: 14.5),
              decoration: InputDecoration(
                hintText: 'Message…',
                filled: true,
                fillColor: const Color(0x0AFFFFFF),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
              onSubmitted: (_) => _send(),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _send,
            child: Container(
              width: 44,
              height: 44,
              decoration: const BoxDecoration(gradient: NTColors.accentGradient, shape: BoxShape.circle),
              child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
            ),
          ),
        ],
      ),
    );
  }
}
