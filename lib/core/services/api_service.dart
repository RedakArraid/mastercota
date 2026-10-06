import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';

class ApiException implements Exception {
  final String message;
  final int statusCode;
  const ApiException(this.message, this.statusCode);
  @override
  String toString() => message;
}

class ApiService {
  ApiService._();

  @visibleForTesting
  static http.Client client = http.Client();

  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'mc_jwt';
  static String? _token;
  static final authChanges = ValueNotifier<int>(0);

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = await _storage.read(key: _tokenKey);
    final legacy = prefs.getString(_tokenKey);
    if (_token == null && legacy != null) {
      await _storage.write(key: _tokenKey, value: legacy);
      _token = legacy;
    }
    await prefs.remove(_tokenKey);
  }

  static bool get isAuthenticated => _token != null && _token!.isNotEmpty;

  static Future<void> setToken(String? token) async {
    if (token == null) {
      await _storage.delete(key: _tokenKey);
    } else {
      await _storage.write(key: _tokenKey, value: token);
    }
    _token = token;
    authChanges.value++;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  static Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final res = await client
        .post(
          Uri.parse('${AppConstants.apiBaseUrl}$path'),
          headers: _headers,
          body: body == null ? null : jsonEncode(body),
        )
        .timeout(const Duration(seconds: 30));
    return _decode(res);
  }

  static Future<Map<String, dynamic>> get(String path) async {
    final res = await client
        .get(Uri.parse('${AppConstants.apiBaseUrl}$path'), headers: _headers)
        .timeout(const Duration(seconds: 30));
    return _decode(res);
  }

  static Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final res = await client
        .patch(
          Uri.parse('${AppConstants.apiBaseUrl}$path'),
          headers: _headers,
          body: body == null ? null : jsonEncode(body),
        )
        .timeout(const Duration(seconds: 30));
    return _decode(res);
  }

  static Future<Map<String, dynamic>> _decode(http.Response res) async {
    if (res.statusCode == 401 && isAuthenticated) await setToken(null);
    dynamic data;
    try {
      data = jsonDecode(res.body.isEmpty ? '{}' : res.body);
    } catch (_) {
      throw Exception('Service temporairement indisponible. Réessayez.');
    }
    if (res.statusCode >= 400) {
      final msg = data is Map ? (data['error'] ?? res.body) : res.body;
      throw ApiException(msg.toString(), res.statusCode);
    }
    return data is Map<String, dynamic> ? data : {'data': data};
  }
}
