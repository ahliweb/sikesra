/// AWCMS Mobile - Security Service
///
/// Service untuk keamanan aplikasi: root detection, jailbreak detection,
/// dan validasi integritas aplikasi.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_jailbreak_detection/flutter_jailbreak_detection.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Security status
enum SecurityStatus { secure, compromised, unknown }

/// Security check result
class SecurityCheckResult {
  final SecurityStatus status;
  final bool isJailbroken;
  final bool isDeveloperMode;
  final String? message;

  const SecurityCheckResult({
    required this.status,
    required this.isJailbroken,
    required this.isDeveloperMode,
    this.message,
  });

  bool get isSecure => status == SecurityStatus.secure;
}

/// Security service for app integrity checks
class SecurityService {
  /// Perform full security check
  Future<SecurityCheckResult> performSecurityCheck() async {
    // Skip in debug mode
    if (kDebugMode) {
      return const SecurityCheckResult(
        status: SecurityStatus.secure,
        isJailbroken: false,
        isDeveloperMode: true,
        message: 'Debug mode - security checks skipped',
      );
    }

    try {
      // Check jailbreak/root
      final isJailbroken = await FlutterJailbreakDetection.jailbroken;
      final isDeveloperMode = await FlutterJailbreakDetection.developerMode;

      if (isJailbroken) {
        return SecurityCheckResult(
          status: SecurityStatus.compromised,
          isJailbroken: true,
          isDeveloperMode: isDeveloperMode,
          message: 'Perangkat terdeteksi root/jailbreak',
        );
      }

      return SecurityCheckResult(
        status: SecurityStatus.secure,
        isJailbroken: false,
        isDeveloperMode: isDeveloperMode,
      );
    } catch (e) {
      return SecurityCheckResult(
        status: SecurityStatus.unknown,
        isJailbroken: false,
        isDeveloperMode: false,
        message: 'Gagal melakukan security check: $e',
      );
    }
  }

  /// Quick jailbreak check
  Future<bool> isDeviceCompromised() async {
    if (kDebugMode) return false;

    try {
      return await FlutterJailbreakDetection.jailbroken;
    } catch (_) {
      return false;
    }
  }
}

/// Provider for security service
final securityServiceProvider = Provider<SecurityService>((ref) {
  return SecurityService();
});

/// Provider for security check result
final securityCheckProvider = FutureProvider<SecurityCheckResult>((ref) {
  final service = ref.watch(securityServiceProvider);
  return service.performSecurityCheck();
});

/// Provider for quick jailbreak check
final isDeviceCompromisedProvider = FutureProvider<bool>((ref) {
  final service = ref.watch(securityServiceProvider);
  return service.isDeviceCompromised();
});
