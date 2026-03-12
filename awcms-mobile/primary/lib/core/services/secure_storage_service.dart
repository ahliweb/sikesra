/// AWCMS Mobile - Secure Storage Service
///
/// Service untuk menyimpan credentials dan data sensitif secara aman.
/// Menggunakan flutter_secure_storage dengan enkripsi platform-native.
library;

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Keys for secure storage
class SecureStorageKeys {
  static const String supabaseUrl = 'supabase_url';
  static const String supabaseAnonKey = 'supabase_anon_key';
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String userSession = 'user_session';
  static const String tenantId = 'tenant_id';
  static const String encryptionKey = 'encryption_key';
}

/// Secure storage service for sensitive data
class SecureStorageService {
  static SecureStorageService? _instance;
  late final FlutterSecureStorage _storage;

  SecureStorageService._() {
    _storage = const FlutterSecureStorage(
      aOptions: AndroidOptions(
        // encryptedSharedPreferences removed - deprecated in v10
        // Data auto-migrates to custom ciphers on first access
        sharedPreferencesName: 'awcms_secure_prefs',
        preferencesKeyPrefix: 'awcms_',
      ),
      iOptions: IOSOptions(
        accessibility: KeychainAccessibility.first_unlock_this_device,
        accountName: 'awcms_mobile',
      ),
    );
  }

  /// Get singleton instance
  static SecureStorageService get instance {
    _instance ??= SecureStorageService._();
    return _instance!;
  }

  /// Write value to secure storage
  Future<void> write(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  /// Read value from secure storage
  Future<String?> read(String key) async {
    return await _storage.read(key: key);
  }

  /// Delete value from secure storage
  Future<void> delete(String key) async {
    await _storage.delete(key: key);
  }

  /// Delete all values
  Future<void> deleteAll() async {
    await _storage.deleteAll();
  }

  /// Check if key exists
  Future<bool> containsKey(String key) async {
    return await _storage.containsKey(key: key);
  }

  // ============================================================
  // Convenience methods for common operations
  // ============================================================

  /// Store Supabase credentials securely
  Future<void> storeSupabaseCredentials({
    required String url,
    required String anonKey,
  }) async {
    await write(SecureStorageKeys.supabaseUrl, url);
    await write(SecureStorageKeys.supabaseAnonKey, anonKey);
  }

  /// Get Supabase URL
  Future<String?> getSupabaseUrl() async {
    return await read(SecureStorageKeys.supabaseUrl);
  }

  /// Get Supabase Anon Key
  Future<String?> getSupabaseAnonKey() async {
    return await read(SecureStorageKeys.supabaseAnonKey);
  }

  /// Store auth tokens
  Future<void> storeAuthTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    await write(SecureStorageKeys.accessToken, accessToken);
    if (refreshToken != null) {
      await write(SecureStorageKeys.refreshToken, refreshToken);
    }
  }

  /// Get access token
  Future<String?> getAccessToken() async {
    return await read(SecureStorageKeys.accessToken);
  }

  /// Get refresh token
  Future<String?> getRefreshToken() async {
    return await read(SecureStorageKeys.refreshToken);
  }

  /// Clear auth tokens (logout)
  Future<void> clearAuthTokens() async {
    await delete(SecureStorageKeys.accessToken);
    await delete(SecureStorageKeys.refreshToken);
    await delete(SecureStorageKeys.userSession);
  }

  /// Store tenant ID
  Future<void> storeTenantId(String tenantId) async {
    await write(SecureStorageKeys.tenantId, tenantId);
  }

  /// Get tenant ID
  Future<String?> getTenantId() async {
    return await read(SecureStorageKeys.tenantId);
  }
}
