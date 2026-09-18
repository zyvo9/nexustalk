import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// The NexusTalk server the app talks to.
/// The app has its OWN UI — the server address is set once on the login
/// screen and remembered (like CRD clients remember their host).
class ServerConfig {
  static const _key = 'nexustalk_server';

  static Future<String> get() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_key) ?? '';
  }

  static Future<void> set(String url) async {
    final prefs = await SharedPreferences.getInstance();
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    if (clean.isEmpty) {
      await prefs.remove(_key);
    } else {
      await prefs.setString(_key, clean);
    }
  }
}

/// JWT session storage.
class Session {
  static const _tokenKey = 'nexustalk_token';
  static const _userKey = 'nexustalk_user';

  static Future<String?> token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  static Future<Map<String, dynamic>?> user() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static Future<void> saveUser(Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(user));
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }
}

/// Tiny REST client: attaches the JWT, throws readable errors.
class Api {
  static Future<Map<String, String>> _headers() async {
    final token = await Session.token();
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  static Future<Uri> _uri(String path) async {
    final base = await ServerConfig.get();
    return Uri.parse('$base$path');
  }

  static Future<dynamic> get(String path) async {
    final res = await http.get(await _uri(path), headers: await _headers());
    return _handle(res);
  }

  static Future<dynamic> post(String path, {Object? body}) async {
    final res = await http.post(await _uri(path),
        headers: await _headers(), body: body == null ? null : jsonEncode(body));
    return _handle(res);
  }

  static Future<dynamic> patch(String path, {Object? body}) async {
    final res = await http.patch(await _uri(path),
        headers: await _headers(), body: body == null ? null : jsonEncode(body));
    return _handle(res);
  }

  static Future<dynamic> delete(String path) async {
    final res = await http.delete(await _uri(path), headers: await _headers());
    return _handle(res);
  }

  /// Upload a base64 data URL attachment (the server accepts dataUrl posts).
  static Future<dynamic> upload(String path, {required String dataUrl, required String name, required String mime}) async {
    final res = await http.post(await _uri(path),
        headers: await _headers(),
        body: jsonEncode({'dataUrl': dataUrl, 'name': name, 'mime': mime}));
    return _handle(res);
  }

  static dynamic _handle(http.Response res) {
    dynamic data;
    try {
      data = jsonDecode(res.body);
    } catch (_) {
      data = res.body;
    }
    if (res.statusCode >= 400) {
      final msg = data is Map && data['error'] != null ? data['error'] : 'Request failed (${res.statusCode})';
      throw Exception(msg);
    }
    return data;
  }
}
