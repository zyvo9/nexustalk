import 'package:socket_io_client/socket_io_client.dart' as sio;

import 'network.dart';

/// JSON shape helpers shared across the UI.
Map<String, dynamic> asMap(dynamic v) =>
    v is Map<String, dynamic> ? v : (v == null ? <String, dynamic>{} : Map<String, dynamic>.from(v as Map));

List<Map<String, dynamic>> asList(dynamic v) =>
    v is List ? v.map((e) => asMap(e)).toList() : <Map<String, dynamic>>[];

/// Live connection to the backend (Socket.IO v4).
class SocketService {
  static sio.Socket? _socket;
  static String? _boundServer;

  static Future<sio.Socket?> connect() async {
    final base = await ServerConfig.get();
    final token = await Session.token();
    if (base.isEmpty || token == null || token.isEmpty) return null;

    // Server changed → rebuild the connection
    if (_socket != null && _boundServer != base) {
      _socket!.dispose();
      _socket = null;
    }
    if (_socket != null) return _socket;

    _boundServer = base;
    _socket = sio.io(
      base,
      sio.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableReconnection()
          .build(),
    );
    return _socket;
  }

  static sio.Socket? get current => _socket;

  static void disconnect() {
    _socket?.dispose();
    _socket = null;
    _boundServer = null;
  }

  static void emit(String event, Object? data) {
    _socket?.emit(event, data);
  }

  /// Attach a listener; the payload is unwrapped from socket.io's list envelope.
  static void on(String event, void Function(dynamic data) handler) {
    _socket?.on(event, (data) {
      final d = (data is List && data.isNotEmpty) ? data.first : data;
      handler(d);
    });
  }

  static void off(String event) {
    _socket?.off(event);
  }
}
