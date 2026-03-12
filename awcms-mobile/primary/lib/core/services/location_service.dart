/// AWCMS Mobile - Location Service
///
/// Service untuk mengakses GPS location dengan permission handling.
library;

import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import 'location_security_service.dart';

/// Location permission status
enum LocationStatus {
  initial,
  permissionDenied,
  permissionDeniedForever,
  serviceDisabled,
  ready,
  fetching,
  success,
  error,
  fakeDetected,
}

/// Location state
class LocationState {
  final LocationStatus status;
  final Position? position;
  final String? errorMessage;
  final bool isMocked;

  const LocationState({
    this.status = LocationStatus.initial,
    this.position,
    this.errorMessage,
    this.isMocked = false,
  });

  LocationState copyWith({
    LocationStatus? status,
    Position? position,
    String? errorMessage,
    bool? isMocked,
  }) {
    return LocationState(
      status: status ?? this.status,
      position: position ?? this.position,
      errorMessage: errorMessage,
      isMocked: isMocked ?? this.isMocked,
    );
  }

  bool get hasPosition => position != null;
  bool get isLoading => status == LocationStatus.fetching;
  bool get hasError =>
      status == LocationStatus.error ||
      status == LocationStatus.permissionDenied ||
      status == LocationStatus.serviceDisabled ||
      status == LocationStatus.fakeDetected;
}

/// Location service
class LocationService extends Notifier<LocationState> {
  LocationSecurityService get _securityService =>
      ref.read(locationSecurityServiceProvider);

  @override
  LocationState build() {
    return const LocationState();
  }

  /// Check and request location permission
  Future<bool> checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      state = const LocationState(
        status: LocationStatus.serviceDisabled,
        errorMessage: 'Layanan lokasi tidak aktif',
      );
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        state = const LocationState(
          status: LocationStatus.permissionDenied,
          errorMessage: 'Izin lokasi ditolak',
        );
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      state = const LocationState(
        status: LocationStatus.permissionDeniedForever,
        errorMessage: 'Izin lokasi ditolak permanen. Aktifkan di pengaturan.',
      );
      return false;
    }

    state = const LocationState(status: LocationStatus.ready);
    return true;
  }

  /// Get current location with security check
  Future<void> getCurrentLocation({bool validateSecurity = true}) async {
    state = state.copyWith(status: LocationStatus.fetching, errorMessage: null);

    try {
      final hasPermission = await checkPermission();
      if (!hasPermission) return;

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );

      if (validateSecurity) {
        final securityResult = await _securityService.performSecurityCheck(
          position,
        );

        if (securityResult.isCompromised) {
          state = LocationState(
            status: LocationStatus.fakeDetected,
            position: position,
            isMocked: true,
            errorMessage: securityResult.message,
          );
          return;
        }
      }

      state = LocationState(
        status: LocationStatus.success,
        position: position,
        isMocked: false,
      );
    } on FakeLocationException catch (e) {
      state = LocationState(
        status: LocationStatus.fakeDetected,
        errorMessage: e.message,
        isMocked: true,
      );
    } catch (e) {
      state = LocationState(
        status: LocationStatus.error,
        errorMessage: 'Gagal mendapatkan lokasi: $e',
      );
    }
  }

  /// Open location settings
  Future<bool> openLocationSettings() async {
    return await Geolocator.openLocationSettings();
  }

  /// Open app settings (for permission)
  Future<bool> openAppSettings() async {
    return await Geolocator.openAppSettings();
  }
}

/// Provider for location service
final locationServiceProvider =
    NotifierProvider<LocationService, LocationState>(() => LocationService());

/// Provider for current position
final currentPositionProvider = Provider<Position?>((ref) {
  return ref.watch(locationServiceProvider).position;
});

/// Provider for location status
final locationStatusProvider = Provider<LocationStatus>((ref) {
  return ref.watch(locationServiceProvider).status;
});
