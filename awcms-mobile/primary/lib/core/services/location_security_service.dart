/// AWCMS Mobile - Location Security Service
///
/// Service untuk deteksi fake/mock GPS location.
library;

import 'package:detect_fake_location/detect_fake_location.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

/// Location security status
enum LocationSecurityStatus { secure, mockDetected, fakeAppDetected, unknown }

/// Location security check result
class LocationSecurityResult {
  final LocationSecurityStatus status;
  final bool isMocked;
  final bool hasFakeLocationApp;
  final String? message;
  final Position? position;

  const LocationSecurityResult({
    required this.status,
    this.isMocked = false,
    this.hasFakeLocationApp = false,
    this.message,
    this.position,
  });

  bool get isSecure => status == LocationSecurityStatus.secure;
  bool get isCompromised =>
      status == LocationSecurityStatus.mockDetected ||
      status == LocationSecurityStatus.fakeAppDetected;
}

/// Location security service for anti-fake GPS
class LocationSecurityService {
  /// Check if current location is mocked
  Future<bool> isLocationMocked(Position position) async {
    // Skip in debug mode for development
    if (kDebugMode) return false;
    return position.isMocked;
  }

  /// Check if fake location app is installed (Android only)
  Future<bool> hasFakeLocationApp() async {
    if (kDebugMode) return false;

    try {
      return await DetectFakeLocation().detectFakeLocation();
    } catch (_) {
      return false;
    }
  }

  /// Perform full location security check
  Future<LocationSecurityResult> performSecurityCheck(Position position) async {
    if (kDebugMode) {
      return LocationSecurityResult(
        status: LocationSecurityStatus.secure,
        position: position,
        message: 'Debug mode - security checks skipped',
      );
    }

    try {
      // Check if location is mocked
      final isMocked = position.isMocked;
      if (isMocked) {
        return LocationSecurityResult(
          status: LocationSecurityStatus.mockDetected,
          isMocked: true,
          position: position,
          message: 'Lokasi palsu terdeteksi',
        );
      }

      // Check for fake location apps
      final hasFakeApp = await hasFakeLocationApp();
      if (hasFakeApp) {
        return LocationSecurityResult(
          status: LocationSecurityStatus.fakeAppDetected,
          hasFakeLocationApp: true,
          position: position,
          message: 'Aplikasi fake GPS terdeteksi',
        );
      }

      return LocationSecurityResult(
        status: LocationSecurityStatus.secure,
        position: position,
      );
    } catch (e) {
      return LocationSecurityResult(
        status: LocationSecurityStatus.unknown,
        position: position,
        message: 'Gagal memeriksa keamanan lokasi: $e',
      );
    }
  }

  /// Get secure position (throws if mocked)
  Future<Position> getSecurePosition({
    LocationAccuracy accuracy = LocationAccuracy.high,
  }) async {
    final position = await Geolocator.getCurrentPosition(
      locationSettings: LocationSettings(accuracy: accuracy),
    );

    final securityResult = await performSecurityCheck(position);

    if (securityResult.isCompromised) {
      throw FakeLocationException(
        securityResult.message ?? 'Fake location detected',
      );
    }

    return position;
  }
}

/// Exception for fake location detection
class FakeLocationException implements Exception {
  final String message;
  FakeLocationException(this.message);

  @override
  String toString() => 'FakeLocationException: $message';
}

/// Provider for location security service
final locationSecurityServiceProvider = Provider<LocationSecurityService>((
  ref,
) {
  return LocationSecurityService();
});

/// Provider for checking fake location app
final hasFakeLocationAppProvider = FutureProvider<bool>((ref) {
  final service = ref.watch(locationSecurityServiceProvider);
  return service.hasFakeLocationApp();
});
